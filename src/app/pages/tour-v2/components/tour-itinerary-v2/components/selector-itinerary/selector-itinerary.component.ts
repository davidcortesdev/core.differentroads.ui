import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, map, switchMap } from 'rxjs/operators';

// Importar servicios necesarios
import { ItineraryService, IItineraryResponse, ItineraryFilters } from '../../../../../../core/services/itinerary/itinerary.service';
import { DepartureService, IDepartureResponse } from '../../../../../../core/services/departure/departure.service';
import { TripTypeService, ITripTypeResponse } from '../../../../../../core/services/trip-type/trip-type.service';

// Interface simplificada para departure con name
interface IDepartureResponseExtended extends IDepartureResponse {
  name?: string;
}

// Interfaces simplificadas
interface ItineraryWithDepartures {
  itinerary: IItineraryResponse;
  departures: DepartureData[];
}

interface DepartureData {
  departure: IDepartureResponseExtended;
  tripType?: ITripTypeResponse;
}

// ✅ NUEVA INTERFACE: Para el evento que se emite
export interface SelectedDepartureEvent {
  departure: IDepartureResponseExtended;
  itinerary: IItineraryResponse;
  departureDate: string;
  formattedDate: string;
  itineraryName: string;
  tripType?: ITripTypeResponse;
}

@Component({
  selector: 'app-selector-itinerary',
  standalone: false,
  templateUrl: './selector-itinerary.component.html',
  styleUrl: './selector-itinerary.component.scss'
})
export class SelectorItineraryComponent implements OnInit, OnDestroy {
  @Input() tourId: number | undefined;
  
  // ✅ NUEVO OUTPUT: Emite cuando cambia la selección
  @Output() departureSelected = new EventEmitter<SelectedDepartureEvent>();

  // Control de destrucción del componente
  private destroy$ = new Subject<void>();

  // Estados del componente
  loading = true;
  error: string | undefined;

  // Datos principales
  itinerariesWithDepartures: ItineraryWithDepartures[] = [];
  dateOptions: any[] = [];
  selectedDeparture: any = null;
  
  // Map para tipos de viaje
  private tripTypesMap = new Map<number, ITripTypeResponse>();

  constructor(
    private itineraryService: ItineraryService,
    private departureService: DepartureService,
    private tripTypeService: TripTypeService
  ) {}

  ngOnInit(): void {
    if (this.tourId) {
      this.loadSelectorData(this.tourId);
    } else {
      console.warn('⚠️ No se proporcionó tourId para el selector de itinerarios');
      this.loading = false;
      this.error = 'ID del tour no proporcionado';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar todos los datos necesarios para el selector
   */
  private loadSelectorData(tourId: number): void {
    this.loading = true;
    this.error = undefined;

    // Cargar tipos de viaje primero
    this.tripTypeService.getAll().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('❌ Error loading trip types:', error);
        return of([]);
      }),
      switchMap(tripTypes => {
        // Crear map de tipos de viaje
        this.createTripTypesMap(tripTypes);
        
        // Cargar itinerarios del tour
        return this.loadItinerariesWithDepartures(tourId);
      })
    ).subscribe({
      next: (itinerariesData) => {
        this.itinerariesWithDepartures = itinerariesData;
        this.createDateOptions();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando datos del selector:', error);
        this.error = 'Error al cargar los datos del selector';
        this.loading = false;
      }
    });
  }

  /**
   * Crear map para tipos de viaje
   */
  private createTripTypesMap(tripTypes: ITripTypeResponse[]): void {
    this.tripTypesMap.clear();
    tripTypes.forEach(tripType => {
      this.tripTypesMap.set(tripType.id, tripType);
    });
  }

  /**
   * Cargar itinerarios con sus departures correspondientes
   */
  private loadItinerariesWithDepartures(tourId: number) {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true
    };

    return this.itineraryService.getAll(itineraryFilters).pipe(
      map(itineraries => {
        return itineraries.filter(itinerary => 
          itinerary.tkId && 
          itinerary.tkId.trim() !== ''
        );
      }),
      switchMap(validItineraries => {
        if (validItineraries.length === 0) {
          return of([]);
        }

        const itineraryDeparturesObservables = validItineraries.map(itinerary => 
          this.loadDeparturesForItinerary(itinerary)
        );

        return forkJoin(itineraryDeparturesObservables);
      }),
      catchError(error => {
        console.error('❌ Error loading itineraries:', error);
        return of([]);
      })
    );
  }

  /**
   * Cargar departures para un itinerario específico
   */
  private loadDeparturesForItinerary(itinerary: IItineraryResponse) {
    return this.departureService.getByItinerary(itinerary.id).pipe(
      map(departures => {
        const departuresData: DepartureData[] = departures.map(departure => ({
          departure,
          tripType: this.tripTypesMap.get(departure.tripTypeId)
        }));

        // Ordenar departures por fecha de salida (orden cronológico)
        const sortedDepartures = departuresData.sort((a, b) => {
          const dateA = new Date(a.departure.departureDate);
          const dateB = new Date(b.departure.departureDate);
          return dateA.getTime() - dateB.getTime();
        });

        const itineraryWithDepartures: ItineraryWithDepartures = {
          itinerary,
          departures: sortedDepartures
        };

        return itineraryWithDepartures;
      }),
      catchError(error => {
        console.error(`❌ Error loading departures for itinerary ${itinerary.id}:`, error);
        
        const itineraryWithDepartures: ItineraryWithDepartures = {
          itinerary,
          departures: []
        };

        return of(itineraryWithDepartures);
      })
    );
  }

  /**
   * Crear opciones para el dropdown
   */
  private createDateOptions(): void {
    this.dateOptions = [];
    
    this.itinerariesWithDepartures.forEach(itineraryData => {
      itineraryData.departures.forEach(departureData => {
        const option = {
          label: this.formatDate(departureData.departure.departureDate), // Solo la fecha en el dropdown
          value: departureData.departure.id,
          departureDate: departureData.departure.departureDate,
          departureName: departureData.departure.name || 'Sin nombre',
          itineraryName: itineraryData.itinerary.name || 'Itinerario sin nombre',
          tripType: this.getTripTypeFirstLetter(departureData.departure.tripTypeId),
          tripTypeId: departureData.departure.tripTypeId,
          departure: departureData.departure,
          itinerary: itineraryData.itinerary
        };
        this.dateOptions.push(option);
      });
    });

    // Ordenar por fecha
    this.dateOptions.sort((a, b) => {
      return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
    });

    // Seleccionar automáticamente el primer departure
    if (this.dateOptions.length > 0) {
      this.selectedDeparture = this.dateOptions[0];
      // ✅ EMITIR EVENTO: Cuando se selecciona automáticamente el primer departure
      this.emitDepartureSelected();
    }
  }

  /**
   * Manejar selección de departure
   */
  onDepartureChange(event: any): void {
    this.selectedDeparture = this.dateOptions.find(option => option.value === event.value);    
    // ✅ EMITIR EVENTO: Cuando el usuario cambia la selección
    this.emitDepartureSelected();
  }

  /**
   * ✅ NUEVO MÉTODO: Emitir evento con la información del departure seleccionado
   */
  private emitDepartureSelected(): void {
    if (!this.selectedDeparture) return;

    const eventData: SelectedDepartureEvent = {
      departure: this.selectedDeparture.departure,
      itinerary: this.selectedDeparture.itinerary,
      departureDate: this.selectedDeparture.departureDate,
      formattedDate: this.formatDate(this.selectedDeparture.departureDate),
      itineraryName: this.selectedDeparture.itineraryName,
      tripType: this.tripTypesMap.get(this.selectedDeparture.tripTypeId)
    };

    this.departureSelected.emit(eventData);
  }

  /**
   * Formatear fecha para mostrar
   */
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Obtener primera letra del tipo de viaje en mayúscula
   */
  getTripTypeFirstLetter(tripTypeId: number): string {
    const tripType = this.tripTypesMap.get(tripTypeId);
    if (!tripType || !tripType.name) return 'S'; // 'S' para 'Sin tipo'
    return tripType.name.charAt(0).toUpperCase();
  }

  /**
   * Obtener clase CSS para el tipo de viaje
   */
  getTripTypeClass(tripTypeId: number): string {
    const tripType = this.tripTypesMap.get(tripTypeId);
    if (!tripType || !tripType.name) return 'trip-type-default';
    
    const firstLetter = tripType.name.charAt(0).toLowerCase();
    return `trip-type-${firstLetter}`;
  }

  /**
   * Obtener nombre completo del tipo de viaje para tooltip
   */
  getTripTypeFullName(tripTypeId: number): string {
    const tripType = this.tripTypesMap.get(tripTypeId);
    return tripType ? tripType.name : 'Sin tipo';
  }

  /**
   * Refrescar datos del selector
   */
  refreshSelector(): void {
    if (this.tourId) {
      this.selectedDeparture = null;
      this.loadSelectorData(this.tourId);
    }
  }

  /**
   * Getters para el estado del componente
   */
  get hasValidData(): boolean {
    return !this.loading && !this.error && this.dateOptions.length > 0;
  }
}