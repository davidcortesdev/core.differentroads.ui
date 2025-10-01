import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output } from '@angular/core';
import { catchError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../core/services/tours.service';
import { AnalyticsService, EcommerceItem } from '../../../core/services/analytics.service';
import { AuthenticateService } from '../../../core/services/auth-service.service';

interface ITour {
  imageUrl: string;
  title: string;
  description: string;
  rating: number;
  tag: string;
  price: number;
  availableMonths: string[];
  isByDr: boolean;
  webSlug: string;
  externalID?: string;
}

@Component({
  selector: 'app-tours',
  standalone: false,
  templateUrl: './tours.component.html',
  styleUrl: './tours.component.scss',
})
export class ToursComponent implements OnInit, OnChanges {
  // Inputs from ContentPageComponent
  @Input() initialTags: string[] = [];
  @Input() showTours: boolean = true;
  @Input() isOffersCollection: boolean = false;

  // Output to ContentPageComponent
  @Output() toursLoaded = new EventEmitter<ITour[]>();

  // Layout configuration
  layout: 'grid' | 'list' = 'grid';

  // Filter options
  orderOptions = [
    { name: 'Próximas salidas', value: 'next-departures' },
    { name: 'Precio (de menor a mayor)', value: 'min-price' },
    { name: 'Precio (de mayor a menor)', value: 'max-price' },
  ];
  selectedOrderOption: string = 'next-departures';

  priceOptions: { name: string; value: string }[] = [
    { name: 'Menos de $1000', value: '0-1000' },
    { name: '$1000 - $3000', value: '1000-3000' },
    { name: '+ 3000', value: '3000+' },
  ];
  selectedPriceOption: string[] = [];

  seasonOptions: { name: string; value: string }[] = [
    { name: 'Verano', value: 'Verano' },
    { name: 'Invierno', value: 'invierno' },
    { name: 'Primavera', value: 'Primavera' },
    { name: 'Otoño', value: 'otono' },
  ];
  selectedSeasonOption: string[] = [];

  monthOptions: { name: string; value: string }[] = [];
  selectedMonthOption: string[] = [];

  // Tag options from filter component
  tagOptions: { name: string; value: string }[] = [];
  selectedTagOption: string[] = [];

  // Core data
  displayedTours: ITour[] = [];
  destination: string = '';
  minDate: Date | null = null;
  maxDate: Date | null = null;
  tourType: string = '';

  constructor(
    private readonly toursService: ToursService,
    private readonly route: ActivatedRoute,
    private readonly analyticsService: AnalyticsService,
    private readonly authService: AuthenticateService
  ) {}

  ngOnInit() {
    // Handle initialTags from parent component
    if (this.initialTags && this.initialTags.length > 0) {
      this.selectedTagOption = [...this.initialTags];
    }

    // Handle routing params (when used as standalone)
    this.route.queryParams.subscribe((params) => {
      this.destination = params['destination'] || '';
      this.minDate = params['departureDate']
        ? new Date(params['departureDate'])
        : null;
      this.maxDate = params['returnDate']
        ? new Date(params['returnDate'])
        : null;
      this.tourType = params['tripType'] || '';
      this.selectedOrderOption = params['order'] || 'next-departures';

      // Handle initialization of filter options from query params
      if (params['price']) {
        this.selectedPriceOption = Array.isArray(params['price'])
          ? params['price']
          : [params['price']];
      }

      if (params['season']) {
        this.selectedSeasonOption = Array.isArray(params['season'])
          ? params['season']
          : [params['season']];
      }

      if (params['month']) {
        this.selectedMonthOption = Array.isArray(params['month'])
          ? params['month']
          : [params['month']];
      }

      // Only use tags from URL if not already set from input
      if (params['tags'] && this.selectedTagOption.length === 0) {
        this.selectedTagOption = Array.isArray(params['tags'])
          ? params['tags']
          : [params['tags']];
      }

      this.loadTours();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Verificar si initialTags ha cambiado
    if (changes['initialTags'] && !changes['initialTags'].firstChange) {
      // Actualizar selectedTagOption con los nuevos tags
      this.selectedTagOption = [...this.initialTags];
      
      // Recargar los tours con los nuevos filtros
      this.loadTours();
    }
  }

  loadTours() {
    const filters = {
      destination: this.destination,
      minDate: this.minDate ? this.minDate.toISOString() : '',
      maxDate: this.maxDate ? this.maxDate.toISOString() : '',
      tourType: this.tourType,
      price: this.selectedPriceOption,
      tourSeason: this.selectedSeasonOption,
      month: this.selectedMonthOption,
      sort: this.selectedOrderOption,
      ...(this.selectedTagOption.length > 0 && {
        tags: this.selectedTagOption,
      }),
    };

    this.toursService
      .getFilteredToursList(filters)
      .pipe(
        catchError((error: Error) => {
          // Silent error handling
          return [];
        })
      )
      .subscribe((tours: any) => {
        // Process month options
        this.monthOptions =
          tours.filtersOptions?.month?.map((month: string) => {
            return {
              name: month.toUpperCase(),
              value: month,
            };
          }) || [];

        // Process tag options
        this.tagOptions =
          tours.filtersOptions?.tags?.map((tag: string) => {
            return {
              name: tag.toUpperCase(),
              value: tag,
            };
          }) || [];

        // Process tour data
        this.displayedTours = tours.data.map((tour: any) => {
          const days = tour?.activePeriods?.[0]?.days || '';

          return {
            imageUrl: tour.image?.[0]?.url || '',
            title: tour.name || '',
            description:
              tour.country && days ? `${tour.country} en: ${days} dias` : '',
            rating: 5,
            tag: tour.marketingSection?.marketingSeasonTag || '',
            price: tour.price || 0,
            availableMonths:
              (tour.monthTags || [])?.map((month: string) =>
                month.substring(0, 3).toUpperCase()
              ) || [],
            isByDr: tour.tourType !== 'FIT',
            webSlug: tour.webSlug || '',
            externalID: tour.externalID,
          };
        });

        // Disparar evento de analytics view_item_list
        if (tours.data && tours.data.length > 0) {
          this.trackViewItemList(tours.data);
        }

        // Emit tours to parent component
        this.toursLoaded.emit(this.displayedTours);
      });
  }

  // Filter change methods
  onTagFilterChange() {
    this.trackFilter();
    this.loadTours();
  }

  onPriceFilterChange() {
    this.trackFilter();
    this.loadTours();
  }

  onSeasonFilterChange() {
    this.trackFilter();
    this.loadTours();
  }

  onMonthFilterChange() {
    this.trackFilter();
    this.loadTours();
  }

  onOrderChange() {
    this.trackFilterOrder();
    this.loadTours();
  }

  toggleLayout() {
    this.layout = this.layout === 'grid' ? 'list' : 'grid';
  }

  /**
   * Disparar evento view_item_list cuando se cargan tours
   */
  private trackViewItemList(tours: any[]): void {
    const items: EcommerceItem[] = tours.map((tour, index) => ({
      item_id: tour.externalID?.toString() || tour.id?.toString() || '',
      item_name: tour.name || '',
      index: index + 1,
      item_brand: 'Different Roads',
      item_category: tour.continent || '',
      item_category2: tour.country || '',
      item_category3: tour.marketingSection?.marketingSeasonTag || '',
      item_category4: Array.isArray(tour.monthTags) ? tour.monthTags.join(', ') : (tour.monthTags || ''),      
      item_category5: tour.tourType === 'FIT' ? 'Privados' : 'Grupos',
      item_list_id: this.getListId(),
      item_list_name: this.getListName(),
      price: tour.price || 0,
      quantity: 1,
      duracion: tour.activePeriods?.[0]?.days 
        ? `${tour.activePeriods[0].days} días` 
        : ''
    }));

    this.analyticsService.viewItemList(
      this.getListId(),
      this.getListName(),
      items,
      this.getUserData()
    );
  }

  /**
   * Disparar evento filter cuando se aplican filtros
   */
  private trackFilter(): void {
    this.analyticsService.filter(
      {
        filter_categoria: this.selectedTagOption.join(', ') || undefined,
        filter_temporada: this.selectedSeasonOption.join(', ') || undefined,
        filter_mes: this.selectedMonthOption.join(', ') || undefined,
        filter_precio: this.selectedPriceOption.join(', ') || undefined
      },
      this.getUserData()
    );
  }

  /**
   * Disparar evento filter_order cuando se cambia el orden
   */
  private trackFilterOrder(): void {
    const selectedOption = this.orderOptions.find(
      opt => opt.value === this.selectedOrderOption
    );
    
    if (selectedOption) {
      this.analyticsService.filterOrder(
        selectedOption.name,
        this.getUserData()
      );
    }
  }

  /**
   * Obtener ID de lista para analytics
   */
  private getListId(): string {
    if (this.destination) {
      return `destination_${this.destination.toLowerCase().replace(/\s+/g, '_')}`;
    }
    if (this.isOffersCollection) {
      return 'ofertas';
    }
    if (this.selectedTagOption.length > 0) {
      return `tags_${this.selectedTagOption[0].toLowerCase().replace(/\s+/g, '_')}`;
    }
    return 'todos_los_tours';
  }

  /**
   * Obtener nombre de lista para analytics
   */
  private getListName(): string {
    if (this.destination) {
      return `Tours en ${this.destination}`;
    }
    if (this.isOffersCollection) {
      return 'Ofertas especiales';
    }
    if (this.selectedTagOption.length > 0) {
      return `Tours ${this.selectedTagOption[0]}`;
    }
    return 'Todos los tours';
  }

  /**
   * Obtener datos del usuario actual si está logueado
   */
  private getUserData() {
    if (this.authService.isAuthenticatedValue()) {
      return this.analyticsService.getUserData(
        this.authService.getUserEmailValue(),
        undefined,
        this.authService.getCognitoIdValue()
      );
    }
    return undefined;
  }
}
