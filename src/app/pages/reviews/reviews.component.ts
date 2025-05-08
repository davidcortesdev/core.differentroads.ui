import { Component, OnInit, ViewChild, ElementRef } from '@angular/core'; // Asegúrate de importar ViewChild y ElementRef
import { ActivatedRoute } from '@angular/router';
import { ReviewsService } from '../../core/services/reviews.service';
import { PeriodsService } from '../../core/services/periods.service';
import { DatePipe } from '@angular/common';
import { TourFilter, TourNetService } from '../../core/services/tourNet.service';
import { switchMap, take, of } from 'rxjs';

type RatingCategory = 'tour' | 'destinos' | 'calidadPrecio' | 'actividades' | 'guias' | 'alojamientos';

interface TripInfo {
  title: string;
  date: string;
  tourId?: string; // Añadimos el tourId para guardarlo
}

// Define the Period interface to match what the service returns
interface Period {
  tourExternalID?: string;
  // Add other properties as needed
}

@Component({
  selector: 'app-reviews',
  standalone: false, 
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnInit {
  // ViewChild para acceder a los inputs del template
  @ViewChild('nombreInput') nombreInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('emailInput') emailInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('comentarioInput') comentarioInputRef!: ElementRef<HTMLTextAreaElement>; // Asumiendo que tienes #comentarioInput en tu textarea

  // Estas propiedades ya no se vinculan automáticamente con [(ngModel)]
  // Se llenarán manualmente en submitReview o puedes eliminarlas si no las usas en otro lugar.
  // nombre: string = ''; // Puedes mantenerlas o quitarlas
  // email: string = '';
  // comentario: string = ''; 
  
  ratings = {
    tour: 0,
    destinos: 0,
    calidadPrecio: 0,
    actividades: 0,
    guias: 0,
    alojamientos: 0
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

  // Método para cargar la información del viaje desde el periodo
  loadTripInfoFromPeriod(externalId: string): void {
    this.periodsService.getPeriodNameAndDepartureDate(externalId).subscribe({
      next: (info) => {
        this.tripInfo = {
          title: info.tourName || 'Título no disponible',
          date: info.dayOne || 'Fecha no disponible'
        };
        
        // Formatear la fecha usando DatePipe
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

  // Método para obtener el tourId a partir del externalId
  getTourIdFromExternalId(externalId: string): void {
    // Usamos el método que sí existe en el servicio
    this.periodsService.getPeriodNameAndDepartureDate(externalId).pipe(
      take(1),
      switchMap(periodInfo => {
        // Verificamos si hay algún identificador del tour en la respuesta
        // Si no existe, podemos intentar obtenerlo de otra manera
        
        // Podemos intentar obtener el tour por el nombre del tour
        if (!periodInfo.tourName) {
          console.error('No se pudo obtener el nombre del tour');
          return of(null);
        }
        
        // Usamos el nombre del tour para buscar el tour
        const filter: TourFilter = {
          name: periodInfo.tourName
        };
        
        return this.tourNetService.getTours(filter).pipe(
          take(1),
          switchMap(tours => {
            if (!tours || tours.length === 0) {
              console.error('No se encontró el tour con el nombre:', periodInfo.tourName);
              return of(null);
            }
            
            // Guardamos el tourId en tripInfo, asegurándonos de que sea string
            this.tripInfo.tourId = tours[0].id.toString();
            console.log('Tour ID obtenido:', this.tripInfo.tourId);
            return of(tours[0].id.toString());
          })
        );
      })
    ).subscribe({
      error: (error: any) => {
        console.error('Error al obtener el tourId:', error);
      }
    });
  }

  // Método para establecer información de error
  private setErrorTripInfo(): void {
    this.tripInfo = {
      title: 'Error al cargar el título',
      date: 'Error al cargar la fecha'
    };
  }

  // Método para obtener la información del título y la fecha
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
    return false; // Ya no usamos medias estrellas
  }

  submitReview(): void {
    // Obtener los valores directamente de los elementos del DOM
    const nombreValue = this.nombreInputRef.nativeElement.value;
    const emailValue = this.emailInputRef.nativeElement.value;
    const comentarioValue = this.comentarioInputRef.nativeElement.value;

    // Validación básica (puedes mejorarla)
    if (!nombreValue || !emailValue || !comentarioValue) {
      alert('Por favor, completa todos los campos: Nombre, Email y Comentario.');
      return;
    }
    if (Object.values(this.ratings).some(rating => rating === 0)) {
        alert('Por favor, valora todas las categorías con estrellas.');
        return;
    }

    const review = {
      nombre: nombreValue,
      email: emailValue,
      comentario: comentarioValue,
      ratings: this.ratings,
      tripInfo: this.tripInfo // Asegúrate que tripInfo tenga el tourId si es necesario
    };

    console.log('Enviando reseña:', review); // Para depuración

    this.reviewsService.saveReview(review).subscribe({
      next: (resp) => {
        alert('¡Opinión enviada con éxito!');
        // Opcional: Limpiar los campos después de enviar
        this.nombreInputRef.nativeElement.value = '';
        this.emailInputRef.nativeElement.value = '';
        this.comentarioInputRef.nativeElement.value = '';
        Object.keys(this.ratings).forEach(key => {
            this.ratings[key as RatingCategory] = 0;
        });
      },
      error: (err: any) => {
        console.error('Error al enviar la opinión:', err);
        alert('Error al enviar la opinión. Por favor, inténtalo de nuevo.');
      }
    });
  }
}

