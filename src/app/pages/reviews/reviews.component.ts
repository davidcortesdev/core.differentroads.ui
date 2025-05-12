import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReviewsService } from '../../core/services/reviews.service';
import { PeriodsService } from '../../core/services/periods.service';
import { DatePipe } from '@angular/common';
import { TourFilter, TourNetService } from '../../core/services/tourNet.service';
import { switchMap, take, of } from 'rxjs';
import { TravelersNetService, Traveler } from '../../core/services/travelersNet.service';

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
  title?: string; // Añadido campo opcional para título
}

// Actualización de las categorías de calificación
type RatingCategory = 'accommodationRating' | 'activitiesRating' | 'destinationRating' | 'guideRating' | 'priceQualityRating';

interface TripInfo {
  title: string;
  date: string;
  tourId?: number; // <-- Cambia a number
  departureId?: number;
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
  travelerId: number | null = null;
  travelerData: Traveler | null = null;
  isSubmitting: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private periodsService: PeriodsService,
    private reviewsService: ReviewsService,
    private datePipe: DatePipe,
    private tourNetService: TourNetService,
    private travelersNetService: TravelersNetService
  ) {}

  rawDepartureInfo: any = null; // Nueva propiedad para almacenar la info completa

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.periodExternalId = params['id'];
        this.loadTripInfoFromPeriod(this.periodExternalId);
        this.getTourIdFromExternalId(this.periodExternalId);

        // Llama aquí para obtener toda la información de la departure
        this.loadRawDepartureInfo(this.periodExternalId);
      }
      
      // Verificar si hay un ID de viajero en los parámetros de consulta
      this.route.queryParams.subscribe(queryParams => {
        if (queryParams['travelerId']) {
          this.travelerId = parseInt(queryParams['travelerId'], 10);
          this.checkTravelerExists(this.travelerId);
        }
      });
    });
  }

  /**
   * Verifica si existe un viajero con el ID proporcionado
   * @param travelerId ID del viajero a verificar
   */
  checkTravelerExists(travelerId: number): void {
    this.travelersNetService.getTravelerById(travelerId).subscribe({
      next: (traveler) => {
        if (traveler && traveler.id !== travelerId) {
          console.log('Viajero no encontrado o ID no coincide');
          return;
        }
        
        this.travelerData = traveler;
        
        // Rellenar los campos con los datos del viajero
        if (this.nombreInputRef && this.emailInputRef) {
          this.nombreInputRef.nativeElement.value = traveler.name || '';
          this.emailInputRef.nativeElement.value = traveler.email || '';
        } else {
          // Si las referencias no están disponibles, intentar después
          setTimeout(() => {
            if (this.nombreInputRef && this.emailInputRef) {
              this.nombreInputRef.nativeElement.value = traveler.name || '';
              this.emailInputRef.nativeElement.value = traveler.email || '';
            }
          }, 500);
        }
      },
      error: (error) => {
        console.error('Error al verificar el viajero:', error);
      }
    });
  }

  /**
   * Obtiene toda la información cruda de la departure usando el TKId (externalId)
   */
  loadRawDepartureInfo(externalId: string): void {
    this.periodsService.getRawDepartureByTkId(externalId).subscribe({
      next: (info) => {
        this.rawDepartureInfo = info;
        console.log('Información completa de la departure:', info);
      },
      error: (error) => {
        console.error('Error al obtener la información completa de la departure:', error);
      }
    });
  }

  loadTripInfoFromPeriod(externalId: string): void {
    this.periodsService.getPeriodNameAndDepartureDate(externalId).subscribe({
      next: (info) => {
        this.tripInfo = {
          title: info.tourName || 'Título no disponible',
          date: info.dayOne || 'Fecha no disponible',
          tourId: info.tourId ? Number(info.tourId) : undefined // <-- Asegura que sea número
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
    console.log('Obteniendo tourId para externalId:', externalId);
    
    this.tourNetService.getTourIdByPeriodId(externalId).subscribe({
      next: (tourId) => {
        console.log('Respuesta de getTourIdByPeriodId:', tourId);
        console.log('Tipo de tourId:', typeof tourId);
        
        if (tourId) {
          this.tripInfo.tourId = Number(tourId); // <-- Asegura que sea número
          console.log('Tour ID asignado a tripInfo:', this.tripInfo.tourId);
          
          // Obtenemos el tkid del externalId (asumiendo que son el mismo valor)
          const tkid = externalId;
    
          // Llamada al método para obtener las salidas (usando la nueva función)
          this.periodsService.getRawDepartureByTkId(tkid).subscribe({
            next: (salidas) => {
              console.log('Salidas obtenidas:', salidas);
              if (!Array.isArray(salidas) || salidas.length === 0) {
                console.warn('No se encontraron salidas para el tkid:', tkid);
                return;
              }
              const salida = salidas[0];
              const departureId = salida.id || salida.departureId;
              if (!departureId) {
                console.warn('La salida no contiene id ni departureId:', salida);
              } else {
                console.log('DepartureId obtenido:', departureId);
                this.tripInfo.departureId = departureId;
              }
            },
            error: (error) => {
              console.error('Error al obtener salidas:', error);
            }
          });
        } else {
          console.error('No se pudo obtener el tourId (valor vacío o cero)');
          this.setErrorTripInfo();
        }
      },
      error: (error) => {
        console.error('Error al obtener el tourId:', error);
        this.setErrorTripInfo();
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
    if (this.isSubmitting) {
      return; 
    }
  
  
  
    this.isSubmitting = true;
    
    const nombreValue = this.nombreInputRef.nativeElement.value;
    const emailValue = this.emailInputRef.nativeElement.value;
    const comentarioValue = this.comentarioInputRef.nativeElement.value;
  
    if (!nombreValue || !emailValue || !comentarioValue) {
      alert('Por favor, completa todos los campos: Nombre, Email y Comentario.');
      return;
    }
    if (Object.values(this.ratings).some(rating => rating === 0)) {
        alert('Por favor, valora todas las categorías con estrellas.');
        return;
    }
  
    // Extrae el id de la salida y guárdalo en departureId antes de guardar la reseña
    if (this.rawDepartureInfo) {
      // Si la respuesta es un array, toma el primer elemento
      const salida = Array.isArray(this.rawDepartureInfo) ? this.rawDepartureInfo[0] : this.rawDepartureInfo;
      this.tripInfo.departureId = salida?.id || salida?.departureId || 0;
    }
  
    // Función para continuar con el envío de la reseña
    const continueWithReview = (travelerId: number) => {
      // Calcular el rating promedio
      const ratingValues = Object.values(this.ratings);
      const averageRating = ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length;
      
      const reviewPayload: ReviewPayload = {
        text: comentarioValue,
        accommodationRating: this.ratings.accommodationRating,
        activitiesRating: this.ratings.activitiesRating,
        destinationRating: this.ratings.destinationRating,
        guideRating: this.ratings.guideRating,
        priceQualityRating: this.ratings.priceQualityRating,
        showOnHomePage: true, 
        showOnTourPage: true,  
        tourId: this.tripInfo.tourId ?? 0, 
        travelerId: travelerId, 
        departureId: this.tripInfo.departureId || 0,
        externalId: this.periodExternalId,
        status: 0, 
        reviewDate: new Date().toISOString()
      };
  
      console.log('Enviando reseña con tourId (desde tour_id):', reviewPayload.tourId);
  
      this.reviewsService.saveReview(reviewPayload).subscribe({
        next: (resp) => {
          alert('¡Opinión enviada con éxito!');
          this.nombreInputRef.nativeElement.value = '';
          this.emailInputRef.nativeElement.value = '';
          this.comentarioInputRef.nativeElement.value = '';
          (Object.keys(this.ratings) as RatingCategory[]).forEach(key => {
              this.ratings[key] = 0;
          });
          this.isSubmitting = false;
        },
        error: (err: any) => {
          console.error('Error al enviar la opinión:', err);
          alert('Ha ocurrido un error al enviar tu opinión. Por favor, inténtalo de nuevo más tarde.');
          this.isSubmitting = false;
        }
      });
    };
  
    // Primero verificamos si existe un viajero con el email proporcionado
    const travelerFilter = {
      email: emailValue
    };
  
    this.travelersNetService.getTravelers(travelerFilter).subscribe({
      next: (travelers) => {
        if (travelers && travelers.length > 0) {
          // Si existe un viajero con ese email, usamos su ID
          console.log('Viajero encontrado con el email:', travelers[0]);
          continueWithReview(travelers[0].id);
        } else {
          // Si no existe un viajero con ese email, creamos uno nuevo
          const newTraveler: Partial<Traveler> = {
            name: nombreValue,
            email: emailValue
            // No incluimos el código para que sea asignado automáticamente por la BD
          };
  
          this.travelersNetService.createTraveler(newTraveler).subscribe({
            next: (traveler) => {
              console.log('Nuevo viajero creado:', traveler);
              continueWithReview(traveler.id);
            },
            error: (error) => {
              console.error('Error al crear el viajero:', error);
              // En caso de error, intentamos enviar la reseña con ID 0
              continueWithReview(0);
              this.isSubmitting = false;
            }
          });
        }
      },
      error: (error) => {
        console.error('Error al verificar el viajero por email:', error);
        
        // En caso de error en la verificación, intentamos crear un nuevo viajero
        const newTraveler: Partial<Traveler> = {
          name: nombreValue,
          email: emailValue
          // No incluimos el código para que sea asignado automáticamente por la BD
        };
  
        this.travelersNetService.createTraveler(newTraveler).subscribe({
          next: (traveler) => {
            console.log('Nuevo viajero creado:', traveler);
            continueWithReview(traveler.id);
          },
          error: (createError) => {
            console.error('Error al crear el viajero:', createError);
            // En caso de error, intentamos enviar la reseña con ID 0
            continueWithReview(0);
            this.isSubmitting = false;
          }
        });
      }
    });
  }
}

