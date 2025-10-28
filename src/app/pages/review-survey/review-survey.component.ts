import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReviewsService } from '../../core/services/reviews/reviews.service';
import { ReviewStatusService } from '../../core/services/reviews/review-status.service';
import { PeriodsService } from '../../core/services/departure/periods.service';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import {
  TourService,
  ITourResponse,
} from '../../core/services/tour/tour.service';
import {
  TravelersNetService,
  Traveler,
} from '../../core/services/travelers/travelersNet.service';
import { UsersNetService } from '../../core/services/users/usersNet.service';
import { IUserResponse } from '../../core/models/users/user.model';
import { CloudinaryService } from '../../core/services/media/cloudinary.service';
import {
  DepartureService,
  IDepartureResponse,
} from '../../core/services/departure/departure.service';
import { ItineraryService, IItineraryResponse } from '../../core/services/itinerary/itinerary.service';
import { ReviewImageService } from '../../core/services/reviews/review-image.service';
import { Title } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';

interface ReviewPayload {
  text: string;
  reviewStatusId: number;
  rating: number;
  accommodationRating?: number;
  activitiesRating?: number;
  destinationRating?: number;
  guideRating?: number;
  priceQualityRating?: number;
  overallTourRating?: number;
  showOnHomePage?: boolean;
  showOnTourPage?: boolean;
  tourId: number;
  userId: number;
  departureId: number;
  externalId?: string;
  reviewDate?: string;
  includeInAverageRating?: boolean;
  // Las imágenes se manejan por separado con ReviewImageService
}

type RatingCategory =
  | 'accommodationRating'
  | 'overallTourRating'
  | 'activitiesRating'
  | 'destinationRating'
  | 'guideRating'
  | 'priceQualityRating';

interface TripInfo {
  title: string;
  date: string;
  tourId?: number;
  departureId?: number;
}

interface Period {
  tourExternalID?: string;
}


@Component({
  selector: 'app-review-survey',
  standalone: false,
  templateUrl: './review-survey.component.html',
  styleUrl: './review-survey.component.scss',
})
export class ReviewSurveyComponent implements OnInit {
  @ViewChild('nombreInput') nombreInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('emailInput') emailInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('comentarioInput')
  comentarioInputRef!: ElementRef<HTMLTextAreaElement>;

  ratings: { [key in RatingCategory]: number } = {
    accommodationRating: 0,
    activitiesRating: 0,
    destinationRating: 0,
    guideRating: 0,
    priceQualityRating: 0,
    overallTourRating: 0,
  };

  tripInfo: TripInfo = {
    title: 'Cargando...',
    date: 'Cargando...',
  };
  formattedDate: string = '';
  periodExternalId: string = '';
  userId: number | null = null;
  userData: IUserResponse | null = null;
  isSubmitting: boolean = false;

  // Configuración de imágenes
  readonly MAX_IMAGES = 40;
  uploadedImages: string[] = [];

  constructor(
    private titleService: Title,
    private route: ActivatedRoute,
    private periodsService: PeriodsService,
    private reviewsService: ReviewsService,
    private reviewStatusService: ReviewStatusService,
    private reviewImageService: ReviewImageService,
    private datePipe: DatePipe,
    private tourService: TourService,
    private travelersNetService: TravelersNetService,
    private cloudinaryService: CloudinaryService,
    private departureService: DepartureService,
    private itineraryService: ItineraryService,
    private usersNetService: UsersNetService,
    private messageService: MessageService
  ) {}

  rawDepartureInfo: any = null;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      console.log('params', params);
      if (params['periodTkId']) {
        this.periodExternalId = params['periodTkId'];

        this.departureService.getAll({ tkId: this.periodExternalId }).pipe(
          switchMap((departures: IDepartureResponse[]) => {
            if (departures && departures.length > 0) {
              const departure = departures[0];
              this.rawDepartureInfo = departure;
              this.tripInfo.departureId = departure.id;
              this.tripInfo.date = departure.departureDate || 'Fecha no disponible';
              this.formattedDate = this.datePipe.transform(this.tripInfo.date, 'yyyy/MM/dd') || '';

              return this.itineraryService.getById(departure.itineraryId);
            } else {
              throw new Error('No departures found');
            }
          }),
          switchMap((itinerary: IItineraryResponse) => {
            this.tripInfo.tourId = itinerary.tourId;
            return this.tourService.getById(itinerary.tourId);
          }),
          catchError((error) => {
            console.error('Error during trip info loading:', error);
            this.setErrorTripInfo();
            return [];
          })
        ).subscribe({
          next: (tour: ITourResponse) => {
            this.tripInfo.title = tour.name || 'Título no disponible';
          },
          error: (error) => {
            this.setErrorTripInfo();
          }
        });

      }

      this.route.queryParams.subscribe((queryParams) => {
        if (queryParams['travelerId']) {
          this.userId = parseInt(queryParams['travelerId'], 10);
          this.checkTravelerExists(this.userId);
        }
      });
    });
  }

  /**
   * Verifica si existe un user con el ID proporcionado
   * @param userId ID del user a verificar
   */
  checkTravelerExists(userId: number): void {
    this.usersNetService.getUserById(userId).subscribe({
      next: (user) => {
        if (user && user.id !== userId) {
          return;
        }
        this.userData = user;
        if (this.nombreInputRef && this.emailInputRef) {
          this.nombreInputRef.nativeElement.value = user.name || '';
          this.emailInputRef.nativeElement.value = user.email || '';
        } else {
          setTimeout(() => {
            if (this.nombreInputRef && this.emailInputRef) {
              this.nombreInputRef.nativeElement.value = user.name || '';
              this.emailInputRef.nativeElement.value = user.email || '';
            }
          }, 500);
        }
      },
      error: (error) => {
        // Error silencioso para no afectar la UX
      },
    });
  }

  private setErrorTripInfo(): void {
    this.tripInfo = {
      title: 'Error al cargar el título',
      date: 'Error al cargar la fecha',
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
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, completa todos los campos: Nombre, Email y Comentario.',
        life: 3000,
      });
      this.isSubmitting = false;
      return;
    }

    // Verificar que todas las calificaciones tengan un valor
    if (Object.values(this.ratings).some((rating) => rating === 0)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, valora todas las categorías con estrellas.',
        life: 3000,
      });
      this.isSubmitting = false;
      return;
    }

    // Verificar específicamente el overallTourRating
    if (this.ratings.overallTourRating === 0) {
      // Puedes descomentar la siguiente línea si quieres forzar un valor para pruebas
      // this.ratings.overallTourRating = 5;
    }

    if (this.rawDepartureInfo) {
      const salida = Array.isArray(this.rawDepartureInfo)
        ? this.rawDepartureInfo[0]
        : this.rawDepartureInfo;
      this.tripInfo.departureId = salida?.id || salida?.departureId || 0;
    }

    const continueWithReview = (userId: number) => {
      // Primero obtenemos el reviewStatusId para "DRAFT"
      this.reviewStatusService.getByCode('DRAFT').subscribe({
        next: (reviewStatuses) => {
          let reviewStatusId = 1; // Valor por defecto en caso de error

          if (reviewStatuses && reviewStatuses.length > 0) {
            reviewStatusId = reviewStatuses[0].id;
          }

          const ratingValues = Object.values(this.ratings);
          const averageRating =
            ratingValues.reduce((sum, rating) => sum + rating, 0) /
            ratingValues.length;

          const reviewPayload: ReviewPayload = {
            text: comentarioValue,
            reviewStatusId: reviewStatusId,
            rating: Math.floor(averageRating),
            accommodationRating: this.ratings.accommodationRating,
            activitiesRating: this.ratings.activitiesRating,
            destinationRating: this.ratings.destinationRating,
            guideRating: this.ratings.guideRating,
            priceQualityRating: this.ratings.priceQualityRating,
            overallTourRating: this.ratings.overallTourRating,
            showOnHomePage: true,
            showOnTourPage: true,
            tourId: this.tripInfo.tourId ?? 0,
            userId: userId,
            departureId: this.tripInfo.departureId || 0,
            externalId: this.periodExternalId,
            reviewDate: new Date().toISOString(),
            includeInAverageRating: true,
            // Las imágenes se manejan por separado con ReviewImageService
          };

          this.reviewsService.create(reviewPayload).subscribe({
            next: (resp) => {
              // Si hay imágenes, guardarlas usando el ReviewImageService
              if (this.uploadedImages.length > 0 && resp.id) {
                this.reviewImageService
                  .createMultiple(resp.id, this.uploadedImages)
                  .subscribe({
                    next: (images) => {
                      this.cleanupForm();
                    },
                    error: (imageError) => {
                      // Aún limpiamos el formulario aunque falle el guardado de imágenes
                      this.cleanupForm();
                      this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al subir algunas imágenes.',
                        life: 3000,
                      });
                    },
                  });
              } else {
                // Si no hay imágenes, solo limpiar el formulario
                this.cleanupForm();
              }
            },
            error: (err: any) => {
              this.isSubmitting = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al enviar la review. Por favor, intente de nuevo.',
                life: 5000,
              });
            },
          });
        },
        error: (error) => {
          // En caso de error, usamos valor por defecto
          const reviewStatusId = 1;

          const ratingValues = Object.values(this.ratings);
          const averageRating =
            ratingValues.reduce((sum, rating) => sum + rating, 0) /
            ratingValues.length;

          const reviewPayload: ReviewPayload = {
            text: comentarioValue,
            reviewStatusId: reviewStatusId,
            rating: Math.floor(averageRating),
            accommodationRating: this.ratings.accommodationRating,
            activitiesRating: this.ratings.activitiesRating,
            destinationRating: this.ratings.destinationRating,
            guideRating: this.ratings.guideRating,
            priceQualityRating: this.ratings.priceQualityRating,
            overallTourRating: this.ratings.overallTourRating,
            showOnHomePage: true,
            showOnTourPage: true,
            tourId: this.tripInfo.tourId ?? 0,
            userId: userId,
            departureId: this.tripInfo.departureId || 0,
            externalId: this.periodExternalId,
            reviewDate: new Date().toISOString(),
            includeInAverageRating: true,
            // Las imágenes se manejan por separado con ReviewImageService
          };

          this.reviewsService.create(reviewPayload).subscribe({
            next: (resp) => {
              // Si hay imágenes, guardarlas usando el ReviewImageService
              if (this.uploadedImages.length > 0 && resp.id) {
                this.reviewImageService
                  .createMultiple(resp.id, this.uploadedImages)
                  .subscribe({
                    next: (images) => {
                      this.cleanupForm();
                    },
                    error: (imageError) => {
                      // Aún limpiamos el formulario aunque falle el guardado de imágenes
                      this.cleanupForm();
                      this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al subir algunas imágenes.',
                        life: 3000,
                      });
                    },
                  });
              } else {
                // Si no hay imágenes, solo limpiar el formulario
                this.cleanupForm();
              }
            },
            error: (err: any) => {
              this.isSubmitting = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al enviar la review. Por favor, intente de nuevo.',
                life: 5000,
              });
            },
          });
        },
      });
    };

    this.usersNetService.getUsersByEmail(emailValue).subscribe({
      next: (users) => {
        if (users && users.length > 0) {
          const userMatch = users[0];
          continueWithReview(userMatch.id);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Usuario no encontrado. Por favor, use un email válido.',
            life: 5000,
          });
          this.isSubmitting = false;
        }
      },
      error: (error) => {
        console.error('Error al buscar usuario por email', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Ocurrió un error al verificar el usuario. Por favor, intente de nuevo.',
          life: 5000,
        });
        this.isSubmitting = false;
      },
    });
  }

  // ==================== MÉTODOS PARA MANEJO DE IMÁGENES ====================

  /**
   * Limpia el formulario después de enviar la review
   */
  private cleanupForm(): void {
    this.nombreInputRef.nativeElement.value = '';
    this.emailInputRef.nativeElement.value = '';
    this.comentarioInputRef.nativeElement.value = '';
    (Object.keys(this.ratings) as RatingCategory[]).forEach((key) => {
      this.ratings[key] = 0;
    });
    // Limpiar también las imágenes subidas
    this.uploadedImages = [];
    this.isSubmitting = false;
  }

  /**
   * Maneja la imagen recortada y subida
   */
  onImageCropped(imageUrl: string): void {
    if (imageUrl) {
      this.uploadedImages.push(imageUrl);
    }
  }

  /**
   * Elimina una imagen de la lista
   */
  removeImage(index: number): void {
    this.uploadedImages.splice(index, 1);
  }

  /**
   * Maneja errores de subida de imagen
   */
  onUploadError(errorMessage: string): void {
    // Error silencioso para no afectar la UX
  }
}
