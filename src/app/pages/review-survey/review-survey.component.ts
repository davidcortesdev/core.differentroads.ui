import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReviewsService } from '../../core/services/reviews/reviews.service';
import { ReviewStatusService } from '../../core/services/reviews/review-status.service';
import { PeriodsService } from '../../core/services/periods.service';
import { DatePipe } from '@angular/common';
import {
  TourNetService,
} from '../../core/services/tourNet.service';
import {
  TravelersNetService,
  Traveler,
} from '../../core/services/travelersNet.service';
import { CloudinaryService } from '../../core/services/cloudinary.service';
import {
  DepartureService,
  IDepartureResponse,
} from '../../core/services/departure/departure.service';
import { ReviewImageService } from '../../core/services/reviews/review-image.service';
import { Title } from '@angular/platform-browser';

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
  travelerId: number;
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
  travelerId: number | null = null;
  travelerData: Traveler | null = null;
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
    private tourNetService: TourNetService,
    private travelersNetService: TravelersNetService,
    private cloudinaryService: CloudinaryService,
    private departureService: DepartureService
  ) {}

  rawDepartureInfo: any = null;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      console.log('params', params);
      if (params['periodTkId']) {
        this.periodExternalId = params['periodTkId'];
        this.loadTripInfoFromPeriod(this.periodExternalId);
        this.getTourIdFromExternalId(this.periodExternalId);
        this.loadRawDepartureInfo(this.periodExternalId);
      }

      this.route.queryParams.subscribe((queryParams) => {
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
          return;
        }
        this.travelerData = traveler;
        if (this.nombreInputRef && this.emailInputRef) {
          this.nombreInputRef.nativeElement.value = traveler.name || '';
          this.emailInputRef.nativeElement.value = traveler.email || '';
        } else {
          setTimeout(() => {
            if (this.nombreInputRef && this.emailInputRef) {
              this.nombreInputRef.nativeElement.value = traveler.name || '';
              this.emailInputRef.nativeElement.value = traveler.email || '';
            }
          }, 500);
        }
      },
      error: (error) => {
        // Error silencioso para no afectar la UX
      },
    });
  }

  /**
   * Obtiene toda la información cruda de la departure usando el TKId (externalId)
   */
  loadRawDepartureInfo(externalId: string): void {
    // Usar el DepartureService para obtener la información por tkId
    this.departureService.getAll({ tkId: externalId }).subscribe({
      next: (departures: IDepartureResponse[]) => {
        if (departures && departures.length > 0) {
          this.rawDepartureInfo = departures[0];

          // Asignar el departureId al tripInfo
          if (this.rawDepartureInfo.id) {
            this.tripInfo.departureId = this.rawDepartureInfo.id;
          }
        }
      },
      error: (error: any) => {
        // Error silencioso para no afectar la UX
      },
    });
  }

  loadTripInfoFromPeriod(externalId: string): void {
   
  }

  getTourIdFromExternalId(externalId: string): void {
    this.tourNetService.getTourIdByPeriodId(externalId).subscribe({
      next: (tourId) => {
        if (tourId) {
          this.tripInfo.tourId = Number(tourId);
          const tkid = externalId;
          this.periodsService.getRawDepartureByTkId(tkid).subscribe({
            next: (salidas) => {
              if (!Array.isArray(salidas) || salidas.length === 0) {
                return;
              }
              const salida = salidas[0];
              const departureId = salida.id || salida.departureId;
              if (departureId) {
                this.tripInfo.departureId = departureId;
              }
            },
            error: (error) => {
              // Error silencioso para no afectar la UX
            },
          });
        } else {
          this.setErrorTripInfo();
        }
      },
      error: (error) => {
        this.setErrorTripInfo();
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
      alert(
        'Por favor, completa todos los campos: Nombre, Email y Comentario.'
      );
      this.isSubmitting = false;
      return;
    }

    // Verificar que todas las calificaciones tengan un valor
    if (Object.values(this.ratings).some((rating) => rating === 0)) {
      alert('Por favor, valora todas las categorías con estrellas.');
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

    const continueWithReview = (travelerId: number) => {
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
            showOnHomePage: false,
            showOnTourPage: false,
            tourId: this.tripInfo.tourId ?? 0,
            travelerId: travelerId,
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
                    },
                  });
              } else {
                // Si no hay imágenes, solo limpiar el formulario
                this.cleanupForm();
              }
            },
            error: (err: any) => {
              this.isSubmitting = false;
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
            showOnHomePage: false,
            showOnTourPage: false,
            tourId: this.tripInfo.tourId ?? 0,
            travelerId: travelerId,
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
                    },
                  });
              } else {
                // Si no hay imágenes, solo limpiar el formulario
                this.cleanupForm();
              }
            },
            error: (err: any) => {
              this.isSubmitting = false;
            },
          });
        },
      });
    };

    const travelerFilter = {
      email: emailValue,
      name: nombreValue,
    };

    this.travelersNetService.getTravelers(travelerFilter).subscribe({
      next: (travelers) => {
        const travelerMatch = travelers.find(
          (t) => t.email === emailValue && t.name === nombreValue
        );
        if (travelerMatch) {
          continueWithReview(travelerMatch.id);
        } else {
          const newTraveler: Partial<Traveler> = {
            name: nombreValue,
            email: emailValue,
            code: emailValue.split('@')[0],
          };
          this.travelersNetService.createTraveler(newTraveler).subscribe({
            next: (traveler) => {
              continueWithReview(traveler.id);
            },
            error: (error) => {
              continueWithReview(0);
              this.isSubmitting = false;
            },
          });
        }
      },
      error: (error) => {
        const newTraveler: Partial<Traveler> = {
          name: nombreValue,
          email: emailValue,
        };
        this.travelersNetService.createTraveler(newTraveler).subscribe({
          next: (traveler) => {
            continueWithReview(traveler.id);
          },
          error: (createError) => {
            continueWithReview(0);
            this.isSubmitting = false;
          },
        });
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
