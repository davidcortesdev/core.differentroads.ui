import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReviewsService } from '../../core/services/reviews.service';
import { PeriodsService } from '../../core/services/periods.service';
import { DatePipe } from '@angular/common';
import { TourFilter, TourNetService } from '../../core/services/tourNet.service';
import { switchMap, take, of } from 'rxjs';

// Definición de la nueva estructura para el payload de la reseña
interface ReviewPayload {
  text: string;
  accommodationRating: number;
  activitiesRating: number;
  destinationRating: number;
  guideRating: number;
  priceQualityRating: number;
  showOnHomePage: boolean;
  showOnTourPage: boolean;
  tourId: number;
  travelerId: number;
  departureId: number;
  externalId: string;
  status: number;
  reviewDate: string;
}

// Actualización de las categorías de calificación
type RatingCategory = 'accommodationRating' | 'activitiesRating' | 'destinationRating' | 'guideRating' | 'priceQualityRating';

interface TripInfo {
  title: string;
  date: string;
  tourId?: string;
}

interface Period {
  tourExternalID?: string;
}

@Component({
  selector: 'app-reviews',
  standalone: false, 
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnInit {
  @ViewChild('nombreInput') nombreInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('emailInput') emailInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('comentarioInput') comentarioInputRef!: ElementRef<HTMLTextAreaElement>; 

  // Actualización del objeto ratings para coincidir con la nueva estructura y RatingCategory
  ratings: { [key in RatingCategory]: number } = {
    accommodationRating: 0,
    activitiesRating: 0,
    destinationRating: 0,
    guideRating: 0,
    priceQualityRating: 0
  };

  tripInfo: TripInfo = {
    title: 'Cargando...',
    date: 'Cargando...'
  };
  formattedDate: string = '';
  periodExternalId: string = '';

  constructor(
    private route: ActivatedRoute,
    private periodsService: PeriodsService,
    private reviewsService: ReviewsService,
    private datePipe: DatePipe,
    private tourNetService: TourNetService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.periodExternalId = params['id'];
        this.loadTripInfoFromPeriod(this.periodExternalId);
        this.getTourIdFromExternalId(this.periodExternalId);
      }
    });
  }

  loadTripInfoFromPeriod(externalId: string): void {
    this.periodsService.getPeriodNameAndDepartureDate(externalId).subscribe({
      next: (info) => {
        this.tripInfo = {
          title: info.tourName || 'Título no disponible',
          date: info.dayOne || 'Fecha no disponible'
        };
        
        if (this.tripInfo.date && this.tripInfo.date !== 'Fecha no disponible') {
          this.formattedDate = this.datePipe.transform(this.tripInfo.date, 'dd/MM/yyyy') || 'dd/MM/yyyy';
        } else {
          this.formattedDate = 'dd/MM/yyyy';
        }
      },
      error: (error: any) => {
        console.error('Error al cargar la información del periodo:', error);
        this.setErrorTripInfo();
        this.formattedDate = 'dd/MM/yyyy';
      }
    });
  }

  getTourIdFromExternalId(externalId: string): void {
    this.periodsService.getPeriodNameAndDepartureDate(externalId).pipe(
      take(1),
      switchMap(periodInfo => {
        if (!periodInfo.tourId) {
          console.error('No se pudo obtener el tourId');
          return of(null);
        }
        this.tripInfo.tourId = periodInfo.tourId.toString();
        console.log('Tour ID obtenido:', this.tripInfo.tourId);
  
        // Llamada a getDepartures usando el tourId obtenido y mostrar el resultado en consola
        this.periodsService.getDepartures(this.tripInfo.tourId).subscribe({
          next: (departures) => {
            console.log('Departures obtenidos:', departures);
          },
          error: (error) => {
            console.error('Error en getDepartures:', error);
          }
        });
  
        return of(this.tripInfo.tourId);
      })
    ).subscribe({
      error: (error: any) => {
        console.error('Error al obtener el tourId:', error);
      }
    });
  }

  private setErrorTripInfo(): void {
    this.tripInfo = {
      title: 'Error al cargar el título',
      date: 'Error al cargar la fecha'
    };
  }

  getTripInfo(): TripInfo {
    return this.tripInfo;
  }

  setRating(category: RatingCategory, rating: number): void {
    if (this.ratings[category] === rating) {
      this.ratings[category] = 0;
    } else {
      this.ratings[category] = rating;
    }
  }

  isFullStar(tipo: RatingCategory, index: number): boolean {
    return this.ratings[tipo] >= index;
  }

  isHalfStar(tipo: RatingCategory, index: number): boolean {
    return false;
  }

  submitReview(): void {
    const nombreValue = this.nombreInputRef.nativeElement.value;
    const emailValue = this.emailInputRef.nativeElement.value;
    const comentarioValue = this.comentarioInputRef.nativeElement.value;

    if (!nombreValue || !emailValue || !comentarioValue) {
      alert('Por favor, completa todos los campos: Nombre, Email y Comentario.');
      return;
    }
    // Validar que todas las nuevas categorías de rating han sido valoradas
    if (Object.values(this.ratings).some(rating => rating === 0)) {
        alert('Por favor, valora todas las categorías con estrellas.');
        return;
    }

    // Construir el payload de la reseña según la nueva estructura
    const reviewPayload: ReviewPayload = {
      text: comentarioValue,
      accommodationRating: this.ratings.accommodationRating,
      activitiesRating: this.ratings.activitiesRating,
      destinationRating: this.ratings.destinationRating,
      guideRating: this.ratings.guideRating,
      priceQualityRating: this.ratings.priceQualityRating,
      showOnHomePage: true, // Valor por defecto o tomar de un nuevo control de formulario
      showOnTourPage: true,  // Valor por defecto o tomar de un nuevo control de formulario
      tourId: this.tripInfo.tourId ? parseInt(this.tripInfo.tourId, 10) : 0, // Asegurar que tourId es un número
      travelerId: 0, // Placeholder, considerar cómo obtener este ID (ej: servicio de autenticación, o derivado de nombre/email)
      departureId: 0, // Placeholder, similar a travelerId, this.periodExternalId se usa para externalId
      externalId: this.periodExternalId,
      status: 0, // Valor por defecto para el estado (ej: pendiente de aprobación)
      reviewDate: new Date().toISOString()
    };

    console.log('Enviando reseña (nueva estructura):', reviewPayload); 

    this.reviewsService.saveReview(reviewPayload).subscribe({
      next: (resp) => {
        alert('¡Opinión enviada con éxito!');
        this.nombreInputRef.nativeElement.value = '';
        this.emailInputRef.nativeElement.value = '';
        this.comentarioInputRef.nativeElement.value = '';
        // Resetear los ratings a 0 usando las nuevas claves
        (Object.keys(this.ratings) as RatingCategory[]).forEach(key => {
            this.ratings[key] = 0;
        });
      },
      error: (err: any) => {
        console.error('Error al enviar la opinión:', err);
        alert('Error al enviar la opinión. Por favor, inténtalo de nuevo.');
      }
    });
  }
}

