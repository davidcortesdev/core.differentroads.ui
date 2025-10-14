import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  HomeSectionContentService,
  IHomeSectionContentResponse,
  ContentType,
} from '../../../../core/services/home/home-section-content.service';
import {
  TripTypeService,
  ITripTypeResponse,
} from '../../../../core/services/trip-type/trip-type.service';
import { CountriesService } from '../../../../core/services/countries.service';
import { Country } from '../../../../shared/models/country.model';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { AuthenticateService } from '../../../../core/services/auth-service.service';

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
export class HeroSectionV2Component implements OnInit, AfterViewInit {
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
  selectedTripType: string | null = null;
  destinationInput: string | null = null;

  // DatePicker Range properties
  rangeDates: Date[] = [];
  dateFlexibility: number = 0; // Flexibilidad de días (±X)
  datePresets = [
    { label: '±2 días', value: 2 },
    { label: '±3 días', value: 3 },
    { label: '±7 días', value: 7 }
  ];
  
  // Validation state
  showDateValidationError: boolean = false;
  dateValidationMessage: string = '';

  filteredDestinations: Country[] = [];
  filteredTripTypes: ITripTypeResponse[] = [];

  destinations: Country[] = [];
  tripTypes: ITripTypeResponse[] = [];

  constructor(
    private router: Router,
    private homeSectionContentService: HomeSectionContentService,
    private tripTypeService: TripTypeService,
    private countriesService: CountriesService,
    private analyticsService: AnalyticsService,
    private authService: AuthenticateService
  ) {}

  ngOnInit(): void {
    this.setInitialValues();
    this.loadBannerContent();
    this.loadDestinations();
    this.loadTripTypes();
  }

  ngAfterViewInit(): void {
    // Ensure video plays when view is initialized
    if (this.isVideo && this.bannerContent) {
      setTimeout(() => this.playVideo(), 200);
    }
  }


  private loadBannerContent(): void {
    // Assuming banner content has a specific configuration ID
    // You may need to adjust this based on your actual configuration
    this.homeSectionContentService.getVideos(true).subscribe({
      next: (videos) => {
        if (videos && videos.length > 0) {
          // Get the first video content
          this.bannerContent = videos[0];
          this.isVideo = true;
          this.isImage = false;
          // Trigger video play after content is set
          setTimeout(() => this.playVideo(), 100);
        } else {
          // Fallback to images if no videos
          this.homeSectionContentService.getImages(true).subscribe({
            next: (images) => {
              if (images && images.length > 0) {
                this.bannerContent = images[0];
                this.isVideo = false;
                this.isImage = true;
              }
            },
            error: (error) => {
              console.error('Error loading banner images:', error);
            },
          });
        }
      },
      error: (error) => {
        console.error('Error loading banner videos:', error);
        // Fallback to images on error
        this.homeSectionContentService.getImages(true).subscribe({
          next: (images) => {
            if (images && images.length > 0) {
              this.bannerContent = images[0];
              this.isVideo = false;
              this.isImage = true;
            }
          },
          error: (imageError) => {
            console.error('Error loading banner images:', imageError);
          },
        });
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
          console.error('Error playing video:', error);
          // Try to play again after a short delay
          setTimeout(() => {
            video.play().catch((retryError) => {
              console.error('Retry failed:', retryError);
            });
          }, 100);
        });
    }
  }

  private loadDestinations(): void {
    this.countriesService.getCountries().subscribe({
      next: (countries) => {
        this.destinations = countries;
      },
      error: (error) => {
        console.error('Error loading destinations:', error);
      },
    });
  }

  private loadTripTypes(): void {
    this.tripTypeService.getActiveTripTypes().subscribe({
      next: (tripTypes) => {
        this.tripTypes = tripTypes;
      },
      error: (error) => {
        console.error('Error loading trip types:', error);
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

    if (this.destinationInput) {
      queryParams.destination = this.destinationInput.trim();
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

    if (this.selectedTripType) {
      queryParams.tripType = this.selectedTripType.toString().trim();
    }

    // Disparar evento search antes de navegar
    this.trackSearch(queryParams);

    this.router.navigate(['/tours'], { queryParams });
  }

  /**
   * Manejar selección de fechas del datepicker
   * El modelo rangeDates se actualiza automáticamente con [(ngModel)]
   * Solo sincronizamos las propiedades individuales
   */
  onDateSelect(): void {
    if (this.rangeDates && this.rangeDates.length >= 2) {
      this.departureDate = this.rangeDates[0];
      this.returnDate = this.rangeDates[1];
    } else if (this.rangeDates && this.rangeDates.length === 1) {
      this.departureDate = this.rangeDates[0];
      this.returnDate = null;
    }
  }

  /**
   * Aplicar flexibilidad de fechas (±X días)
   * Indica cuántos días antes o después el usuario acepta viajar
   * manteniendo la misma duración del viaje
   * @param flexibility Número de días de flexibilidad (±X)
   */
  applyDatePreset(flexibility: number): void {
    this.dateFlexibility = flexibility;
    // La flexibilidad se usará en la búsqueda para encontrar opciones alternativas
  }

  /**
   * Establecer fechas para "Desde Hoy"
   * Establece un viaje comenzando hoy por 7 días
   */
  applyPresetFromToday(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const returnDate = new Date(today);
    returnDate.setDate(today.getDate() + 7);
    
    this.rangeDates = [today, returnDate];
    this.departureDate = today;
    this.returnDate = returnDate;
    this.dateFlexibility = 0;
  }

  /**
   * Limpiar fechas seleccionadas y flexibilidad
   */
  clearDates(): void {
    this.rangeDates = [];
    this.departureDate = null;
    this.returnDate = null;
    this.dateFlexibility = 0;
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
      this.selectedTripType = this.initialTripType.trim();
    } else {
      this.selectedTripType = null;
    }
  }

  /**
   * Disparar evento search cuando el usuario realiza una búsqueda
   */
  private trackSearch(queryParams: TripQueryParams): void {
    this.analyticsService.search(
      {
        search_term: queryParams.destination || '',
        start_date: queryParams.departureDate || '',
        end_date: queryParams.returnDate || '',
        trip_type: queryParams.tripType || ''
      },
      this.getUserData()
    );
  }

  /**
   * Obtener datos del usuario para analytics
   */
  private getUserData() {
    return this.analyticsService.getUserData(
      this.authService.getUserEmailValue(),
      '', // No tenemos teléfono en este contexto
      this.authService.getCognitoIdValue()
    );
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

  /**
   * Obtener el número de días del rango seleccionado
   * @returns Número de días entre las fechas seleccionadas
   */
  getDaysInRange(): number {
    if (!this.rangeDates || this.rangeDates.length < 2) {
      return 0;
    }
    
    const [start, end] = this.rangeDates;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
}
