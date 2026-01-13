import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { catchError, switchMap, map, takeUntil } from 'rxjs/operators';
import {
  HomeSectionContentService,
  IHomeSectionContentResponse,
} from '../../../../core/services/home/home-section-content.service';
import {
  TripTypeService,
  ITripTypeResponse,
} from '../../../../core/services/trip-type/trip-type.service';
import { CountriesService } from '../../../../core/services/locations/countries.service';
import { Country } from '../../../../shared/models/country.model';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { TourService, UnifiedSearchResult } from '../../../../core/services/tour/tour.service';

interface TripQueryParams {
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  tripType?: string;
}

@Component({
  selector: 'app-hero-section-v2',
  standalone: false,
  templateUrl: './hero-section-v2.component.html',
  styleUrls: ['./hero-section-v2.component.scss'],
})
export class HeroSectionV2Component implements OnInit, AfterViewInit, OnDestroy {

  @Input() initialDestination: string | null = null;
  @Input() initialDepartureDate: Date | null = null;
  @Input() initialReturnDate: Date | null = null;
  @Input() initialTripType: string | null = null;

  @ViewChild('videoElement', { static: false })
  videoElement!: ElementRef<HTMLVideoElement>;

  // Banner content from service
  bannerContent: IHomeSectionContentResponse | null = null;
  isVideo: boolean = false;
  isImage: boolean = false;

  selectedDestination: string | null = null;
  departureDate: Date | null = null;
  returnDate: Date | null = null;
  selectedTripTypeId: number | null = null;
  destinationInput: string | UnifiedSearchResult | null = null;

  // DatePicker Range properties
  rangeDates: Date[] = [];
  dateFlexibility: number = 0;

  // Validation state
  showDateValidationError: boolean = false;
  dateValidationMessage: string = '';

  filteredDestinations: Country[] = [];
  filteredTripTypes: ITripTypeResponse[] = [];
  
  // Autocomplete con PrimeNG
  sugerencias: UnifiedSearchResult[] = [];
  selectedSuggestion: UnifiedSearchResult | null = null;

  destinations: Country[] = [];
  tripTypes: ITripTypeResponse[] = [];

  private abortController = new AbortController();
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private homeSectionContentService: HomeSectionContentService,
    private tripTypeService: TripTypeService,
    private countriesService: CountriesService,
    private analyticsService: AnalyticsService,
    private authService: AuthenticateService,
    private tourService: TourService
  ) { }

  ngOnInit(): void {
    this.setInitialValues();
    this.loadBannerContent();
    this.loadDestinations();
    this.loadTripTypes();
  }

  /**
   * Método que se ejecuta cuando el usuario escribe en el autocomplete
   * Normaliza el texto y busca sugerencias
   */
  onCompleteMethod(event: { query: string }): void {
    const query = event.query.trim();
    
    if (!query || query.length < 2) {
      this.sugerencias = [];
      return;
    }

    // Normalizar el texto eliminando diacríticos
    const normalized = query.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    
    this.tourService
      .autocomplete({ searchText: normalized, maxResults: 8 })
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$)
      )
      .subscribe((results: UnifiedSearchResult[]) => {
        this.sugerencias = Array.isArray(results) ? results : [];
      });
  }
  ngAfterViewInit(): void {
    // Ensure video plays when view is initialized
    if (this.isVideo && this.bannerContent) {
      setTimeout(() => this.playVideo(), 200);
    }
  }

  ngOnDestroy(): void {
    this.abortController.abort();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga el contenido del banner (video o imagen).
   * Intenta cargar videos primero, si no hay videos o hay error, carga imágenes como fallback.
   */
  private loadBannerContent(): void {
    this.homeSectionContentService
      .getVideos(true, this.abortController.signal)
      .pipe(
        switchMap((videos) => {
          // Si hay videos, usar el primero
          if (videos && videos.length > 0) {
            return of({
              content: videos[0],
              isVideo: true,
              isImage: false,
            });
          }
          // Si no hay videos, intentar cargar imágenes
          return this.homeSectionContentService
            .getImages(true, this.abortController.signal)
            .pipe(
              map((images) => {
                if (images && images.length > 0) {
                  return {
                    content: images[0],
                    isVideo: false,
                    isImage: true,
                  };
                }
                // No hay imágenes ni videos
                return {
                  content: null,
                  isVideo: false,
                  isImage: false,
                };
              }),
              catchError(() => {
                // Error al cargar imágenes, retornar null
                return of({
                  content: null,
                  isVideo: false,
                  isImage: false,
                });
              })
            );
        }),
        catchError(() => {
          // Error al cargar videos, intentar cargar imágenes como fallback
          return this.homeSectionContentService
            .getImages(true, this.abortController.signal)
            .pipe(
              map((images) => {
                if (images && images.length > 0) {
                  return {
                    content: images[0],
                    isVideo: false,
                    isImage: true,
                  };
                }
                return {
                  content: null,
                  isVideo: false,
                  isImage: false,
                };
              }),
              catchError((imageError) => {
                console.error('HeroSectionV2 - Error loading banner images:', imageError);
                return of({
                  content: null,
                  isVideo: false,
                  isImage: false,
                });
              })
            );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          this.bannerContent = result.content;
          this.isVideo = result.isVideo;
          this.isImage = result.isImage;
          
          // Si es video, intentar reproducirlo después de un breve delay
          if (result.isVideo && result.content) {
            setTimeout(() => this.playVideo(), 100);
          }
        },
        error: (error) => {
          console.error('HeroSectionV2 - Error loading banner content:', error);
          this.bannerContent = null;
          this.isVideo = false;
          this.isImage = false;
        },
      });
  }

  getBannerUrl(): string | null {
    return this.bannerContent?.contentUrl || null;
  }

  getBannerAltText(): string {
    return this.bannerContent?.altText || '';
  }

  onVideoLoaded(): void {
    this.playVideo();
  }

  onVideoCanPlay(): void {
    this.playVideo();
  }

  private playVideo(): void {
    if (this.videoElement && this.videoElement.nativeElement) {
      const video = this.videoElement.nativeElement;
      video.muted = true; // Ensure muted for autoplay
      video
        .play()
        .then(() => {
          // Video playing successfully
        })
        .catch((error) => {
          // Try to play again after a short delay
          setTimeout(() => {
            video.play().catch((retryError) => {
            });
          }, 100);
        });
    }
  }

  private loadDestinations(): void {
    this.countriesService
      .getCountries(this.abortController.signal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (countries) => {
          this.destinations = countries;
        },
        error: (error) => {
          console.error('HeroSectionV2 - Error loading destinations:', error);
        },
      });
  }

  private loadTripTypes(): void {
    this.tripTypeService
      .getActiveTripTypes(this.abortController.signal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tripTypes) => {
          this.tripTypes = tripTypes;
          // Si viene initialTripType (code), mapea a id
          if (this.initialTripType && this.selectedTripTypeId == null) {
            const match = this.tripTypes.find(t => t.code === this.initialTripType);
            this.selectedTripTypeId = match ? match.id : null;
          }
        },
        error: (error) => {
          console.error('HeroSectionV2 - Error loading trip types:', error);
        },
      });
  }

  filterDestinations(event: { query: string }): void {
    const query = event.query.toLowerCase().trim();
    this.filteredDestinations = this.destinations.filter(
      (destination) =>
        destination.name.toLowerCase().includes(query) ||
        destination.code.toLowerCase().includes(query)
    );
  }

  filterTripTypes(event: { query: string }): void {
    const query = event.query.toLowerCase().trim();
    this.filteredTripTypes = this.tripTypes.filter(
      (tripType) =>
        tripType.name.toLowerCase().includes(query) ||
        tripType.code.toLowerCase().includes(query)
    );
  }

  searchTrips(): void {
    // Validar fechas antes de buscar
    if (this.rangeDates && this.rangeDates.length > 0 && !this.isValidDateRange()) {
      this.showDateValidationError = true;
      this.dateValidationMessage = 'Por favor, selecciona un rango de fechas válido (fecha de inicio y fin)';

      // Ocultar mensaje después de 3 segundos
      setTimeout(() => {
        this.showDateValidationError = false;
      }, 3000);

      return;
    }

    // Limpiar errores de validación
    this.showDateValidationError = false;
    this.dateValidationMessage = '';

    const queryParams: TripQueryParams = {};

    // Extraer el nombre del destino (puede ser string u objeto UnifiedSearchResult)
    let destinationText: string | null = null;
    if (this.destinationInput) {
      if (typeof this.destinationInput === 'string') {
        destinationText = this.destinationInput.trim();
      } else if (typeof this.destinationInput === 'object' && 'name' in this.destinationInput) {
        destinationText = (this.destinationInput as UnifiedSearchResult).name || '';
      }
    }
    
    if (destinationText) {
      queryParams.destination = destinationText;
    }

    // Usar fechas del rango
    if (this.rangeDates && this.rangeDates.length >= 2) {
      queryParams.departureDate = this.rangeDates[0].toISOString().split('T')[0];
      queryParams.returnDate = this.rangeDates[1].toISOString().split('T')[0];
    } else if (this.departureDate) {
      queryParams.departureDate = this.departureDate
        .toISOString()
        .split('T')[0];
      if (this.returnDate) {
        queryParams.returnDate = this.returnDate.toISOString().split('T')[0];
      }
    }

    if (this.selectedTripTypeId !== null && this.selectedTripTypeId !== undefined) {
      queryParams.tripType = this.selectedTripTypeId.toString();
    }

    // Añadir flexibilidad al navegar para que la lista pueda usarla
    if (this.dateFlexibility > 0) {
      (queryParams as any).flexDays = this.dateFlexibility;
    }

    // Disparar evento search antes de navegar
    this.trackSearch(queryParams);

    this.router.navigate(['/tours'], { queryParams });

    // Pre-búsqueda opcional con todos los parámetros
    const startDate = this.rangeDates?.[0] ? this.rangeDates[0].toISOString() : undefined;
    const endDate = this.rangeDates?.[1] ? this.rangeDates[1].toISOString() : undefined;
    const tripTypeId = this.selectedTripTypeId !== null && this.selectedTripTypeId !== undefined ? this.selectedTripTypeId : undefined;

    this.tourService
      .searchWithScore({
        searchText: destinationText || undefined,
        startDate,
        endDate,
        tripTypeId,
        fuzzyThreshold: 0.7,
        tagScoreThreshold: 0.7,
        flexDays: this.dateFlexibility > 0 ? this.dateFlexibility : undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {},
        error: (error) => {
          console.error('HeroSectionV2 - Error in searchWithScore:', error);
        },
      });
  }

  /**
   * Manejar cambio de flexibilidad desde el componente datepicker
   */
  onFlexibilityChange(flexibility: number): void {
    this.dateFlexibility = flexibility;
  }

  /**
   * Recibir cambios de fechas desde el datepicker
   */
  onDatesChange(dates: Date[]): void {
    this.rangeDates = dates || [];
  }

  /**
   * Obtener fecha mínima (hoy)
   */
  get minDate(): Date {
    return new Date();
  }

  /**
   * Obtener fecha máxima (1 año desde hoy)
   */
  get maxDate(): Date {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return maxDate;
  }

  private setInitialValues(): void {
    if (this.initialDestination) {
      this.selectedDestination = this.initialDestination.trim();
      this.destinationInput = this.initialDestination.trim();
    }

    if (this.initialDepartureDate) {
      this.departureDate = new Date(this.initialDepartureDate);
    }

    if (this.initialReturnDate) {
      this.returnDate = new Date(this.initialReturnDate);
    }

    // Inicializar rangeDates si tenemos fechas iniciales
    if (this.departureDate && this.returnDate) {
      this.rangeDates = [this.departureDate, this.returnDate];
    } else if (this.departureDate) {
      this.rangeDates = [this.departureDate];
    }

    if (this.initialTripType) {
      const match = this.tripTypes.find(t => t.code === this.initialTripType);
      this.selectedTripTypeId = match ? match.id : null;
    } else {
      this.selectedTripTypeId = null;
    }
  }

  /**
   * Disparar evento search cuando el usuario realiza una búsqueda
   */
  private trackSearch(queryParams: TripQueryParams): void {
    // Obtener el nombre del tipo de viaje basándose en el ID seleccionado
    let tripTypeName = '';
    if (this.selectedTripTypeId !== null && this.selectedTripTypeId !== undefined) {
      const selectedTripType = this.tripTypes.find(t => t.id === this.selectedTripTypeId);
      tripTypeName = selectedTripType?.name || '';
    }

    // Obtener datos completos del usuario si está logueado
    this.analyticsService
      .getCurrentUserData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userData) => {
          this.analyticsService.search(
            {
              search_term: queryParams.destination || '',
              start_date: queryParams.departureDate || '',
              end_date: queryParams.returnDate || '',
              trip_type: tripTypeName
            },
            userData
          );
        },
        error: (error) => {
          console.error('HeroSectionV2 - Error getting user data for analytics:', error);
          // Fallback si no se pueden obtener datos completos - incluir todos los campos según estructura requerida
          const fallbackUserData = this.analyticsService.getUserData(
            this.authService.getUserEmailValue(),
            '',
            this.authService.getCognitoIdValue()
          ) || {
            email_address: this.authService.getUserEmailValue() || '',
            phone_number: '',
            user_id: this.authService.getCognitoIdValue() || ''
          };
          this.analyticsService.search(
            {
              search_term: queryParams.destination || '',
              start_date: queryParams.departureDate || '',
              end_date: queryParams.returnDate || '',
              trip_type: tripTypeName
            },
            fallbackUserData
          );
        }
      });
  }

  /**
   * Validar que el rango de fechas sea válido
   * @returns true si el rango es válido, false en caso contrario
   */
  isValidDateRange(): boolean {
    if (!this.rangeDates || this.rangeDates.length < 2) {
      return false;
    }

    const [start, end] = this.rangeDates;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // La fecha de inicio no puede ser anterior a hoy
    if (start < today) {
      return false;
    }

    // La fecha de fin debe ser posterior a la fecha de inicio
    if (end <= start) {
      return false;
    }

    return true;
  }
}
