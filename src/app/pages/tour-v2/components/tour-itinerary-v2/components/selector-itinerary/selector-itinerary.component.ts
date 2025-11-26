import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, map, switchMap } from 'rxjs/operators';

// Importar servicios necesarios
import {
  ItineraryService,
  IItineraryResponse,
  ItineraryFilters,
} from '../../../../../../core/services/itinerary/itinerary.service';
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../../../core/services/departure/departure.service';
import {
  TripTypeService,
  ITripTypeResponse,
} from '../../../../../../core/services/trip-type/trip-type.service';

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

// ✅ Interface para las opciones del dropdown
interface DateOption {
  label: string;
  value: number;
  departureDate: string;
  departureName: string;
  itineraryName: string;
  tripType: string;
  tripTypeId: number;
  tripTypeData?: ITripTypeResponse;
  departure: IDepartureResponseExtended;
  itinerary: IItineraryResponse;
}

// ✅ Interface para departure seleccionado desde el padre
interface DepartureFromParent {
  id: number;
  departureDate?: string;
  returnDate?: string;
  price?: number;
  status?: string;
  waitingList?: boolean;
  group?: string;
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
  styleUrl: './selector-itinerary.component.scss',
})
export class SelectorItineraryComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() tourId: number | undefined;
  @Input() preview: boolean = false;
  // ✅ NUEVO INPUT: Para recibir el departure seleccionado desde el componente departures
  @Input() selectedDepartureFromParent: DepartureFromParent | null = null;

  // ✅ NUEVO OUTPUT: Emite cuando cambia la selección
  @Output() departureSelected = new EventEmitter<SelectedDepartureEvent>();

  // Control de destrucción del componente
  private destroy$ = new Subject<void>();

  // Estados del componente
  loading: boolean = true;
  error: string | undefined;

  // Datos principales con tipado fuerte
  itinerariesWithDepartures: ItineraryWithDepartures[] = [];
  dateOptions: DateOption[] = [];
  selectedDeparture: DateOption | null = null;
  selectedValue: number | null = null; // ✅ Para el dropdown

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
      console.warn(
        '⚠️ No se proporcionó tourId para el selector de itinerarios'
      );
      this.loading = false;
      this.error = 'ID del tour no proporcionado';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ NUEVO: Manejar cambios en el input selectedDepartureFromParent
  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['selectedDepartureFromParent'] &&
      changes['selectedDepartureFromParent'].currentValue
    ) {
      const departureFromParent = changes['selectedDepartureFromParent']
        .currentValue as DepartureFromParent;
      this.updateSelectorFromParent(departureFromParent);
    }
  }

  // ✅ CORREGIDO: Actualizar el selector cuando el padre cambia el departure
  private updateSelectorFromParent(
    departureFromParent: DepartureFromParent
  ): void {
    if (!this.dateOptions || this.dateOptions.length === 0) return;

    // Buscar la opción que corresponde al departure seleccionado en el padre
    const matchingOption = this.dateOptions.find(
      (option) => option.value === departureFromParent.id
    );

    if (matchingOption) {
      this.selectedDeparture = matchingOption;
      this.selectedValue = matchingOption.value; // ✅ CRÍTICO: Actualizar selectedValue
      // No emitir evento aquí para evitar bucle infinito
    } else if (!this.selectedDeparture && this.dateOptions.length > 0) {
      // ✅ FALLBACK: Si no encuentra coincidencia, seleccionar el primero
      this.selectedDeparture = this.dateOptions[0];
      this.selectedValue = this.dateOptions[0].value;
      this.emitDepartureSelected();
    }
  }

  /**
   * Cargar todos los datos necesarios para el selector
   */
  private loadSelectorData(tourId: number): void {
    this.loading = true;
    this.error = undefined;

    // Cargar tipos de viaje primero
    this.tripTypeService
      .getAll()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('❌ Error loading trip types:', error);
          return of([]);
        }),
        switchMap((tripTypes) => {
          // Crear map de tipos de viaje
          this.createTripTypesMap(tripTypes);

          // Cargar itinerarios del tour
          return this.loadItinerariesWithDepartures(tourId);
        })
      )
      .subscribe({
        next: (itinerariesData) => {
          this.itinerariesWithDepartures = itinerariesData;
          this.createDateOptions();
          this.loading = false;

          // ✅ NUEVO: Verificación final para asegurar sincronización
          setTimeout(() => {
            if (this.selectedDeparture && !this.selectedValue) {
              this.selectedValue = this.selectedDeparture.value;
              console.log(
                '🔧 Corrección aplicada - selectedValue:',
                this.selectedValue
              );
            }
          }, 100);
        },
        error: (error) => {
          console.error('❌ Error cargando datos del selector:', error);
          this.error = 'Error al cargar los datos del selector';
          this.loading = false;
        },
      });
  }

  /**
   * Crear map para tipos de viaje
   */
  private createTripTypesMap(tripTypes: ITripTypeResponse[]): void {
    this.tripTypesMap.clear();
    tripTypes.forEach((tripType) => {
      this.tripTypesMap.set(tripType.id, tripType);
    });
  }

  /**
   * Cargar itinerarios con sus departures correspondientes
   */
  private loadItinerariesWithDepartures(tourId: number) {
    let itineraryFilters: ItineraryFilters;
    if (this.preview) {
      itineraryFilters = {
        tourId: tourId,
      };
    } else {
      itineraryFilters = {
        tourId: tourId,
        isBookable: true,
        isVisibleOnWeb: true,
      };
    }

    return this.itineraryService.getAll(itineraryFilters, this.preview).pipe(
      map((itineraries) => {
        return itineraries.filter(
          (itinerary) => itinerary.tkId && itinerary.tkId.trim() !== ''
        );
      }),
      switchMap((validItineraries) => {
        if (validItineraries.length === 0) {
          return of([]);
        }

        const itineraryDeparturesObservables = validItineraries.map(
          (itinerary) => this.loadDeparturesForItinerary(itinerary)
        );

        return forkJoin(itineraryDeparturesObservables);
      }),
      catchError((error) => {
        console.error('❌ Error loading itineraries:', error);
        return of([]);
      })
    );
  }

  /**
   * Cargar departures para un itinerario específico
   */
  private loadDeparturesForItinerary(itinerary: IItineraryResponse) {
    return this.departureService.getByItinerary(itinerary.id, this.preview).pipe(
      map((departures) => {
        const departuresData: DepartureData[] = departures.map((departure) => {
          const tripTypeId = departure.tripTypeId ?? 0;
          const tripType = tripTypeId > 0 ? this.tripTypesMap.get(tripTypeId) : undefined;
          return {
            departure,
            tripType: tripType,
          };
        });

        // Ordenar departures por fecha de salida (orden cronológico)
        const sortedDepartures = departuresData.sort((a, b) => {
          const dateA = new Date(a.departure.departureDate ?? '');
          const dateB = new Date(b.departure.departureDate ?? '');
          return dateA.getTime() - dateB.getTime();
        });

        const itineraryWithDepartures: ItineraryWithDepartures = {
          itinerary,
          departures: sortedDepartures,
        };

        return itineraryWithDepartures;
      }),
      catchError((error) => {
        console.error(
          `❌ Error loading departures for itinerary ${itinerary.id}:`,
          error
        );

        const itineraryWithDepartures: ItineraryWithDepartures = {
          itinerary,
          departures: [],
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

    this.itinerariesWithDepartures.forEach((itineraryData) => {
      itineraryData.departures.forEach((departureData) => {
        const tripTypeId = departureData.departure.tripTypeId ?? 0;
        // Asegurar que tenemos el tripType, si no está en departureData, obtenerlo del mapa
        const tripTypeData = departureData.tripType || (tripTypeId > 0 ? this.tripTypesMap.get(tripTypeId) : undefined);
        
        // Debug: verificar que tripTypeData se asigne correctamente
        if (!tripTypeData && tripTypeId > 0) {
          console.warn('⚠️ TripType no encontrado para tripTypeId:', tripTypeId, 'Mapa tiene:', Array.from(this.tripTypesMap.keys()));
        }

        const option: DateOption = {
          label: this.formatDate(departureData.departure?.departureDate ?? ''), // Solo la fecha en el dropdown
          value: departureData.departure.id,
          departureDate: departureData.departure.departureDate ?? '',
          departureName: departureData.departure.name || 'Sin nombre',
          itineraryName:
            itineraryData.itinerary.name || 'Itinerario sin nombre',
          tripType: this.getTripTypeFirstLetter(tripTypeId),
          tripTypeId: tripTypeId,
          tripTypeData: tripTypeData,
          departure: departureData.departure,
          itinerary: itineraryData.itinerary,
        };
        this.dateOptions.push(option);
      });
    });

    // Ordenar por fecha
    this.dateOptions.sort((a, b) => {
      return (
        new Date(a.departureDate ?? '').getTime() -
        new Date(b.departureDate ?? '').getTime()
      );
    });

    // ✅ CORREGIDO: Seleccionar automáticamente y asegurar que selectedValue se actualice
    if (this.dateOptions.length > 0) {
      if (this.selectedDepartureFromParent) {
        // Si hay un departure desde el padre, intentar seleccionarlo
        this.updateSelectorFromParent(this.selectedDepartureFromParent);
      } else {
        // Si no hay departure del padre, seleccionar el primero
        this.selectedDeparture = this.dateOptions[0];
        this.selectedValue = this.dateOptions[0].value; // ✅ CRÍTICO: Asegurar selectedValue
        this.emitDepartureSelected();
      }

      // ✅ NUEVO: Verificar que selectedValue esté configurado después de cualquier selección
      if (this.selectedDeparture && !this.selectedValue) {
        this.selectedValue = this.selectedDeparture.value;
      }
    }
  }

  /**
   * Manejar selección de departure
   */
  onDepartureChange(event: { value: number }): void {
    this.selectedDeparture =
      this.dateOptions.find((option) => option.value === event.value) || null;
    this.selectedValue = event.value;
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
      tripType: this.tripTypesMap.get((this.selectedDeparture.tripTypeId ?? 0)),
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
        day: '2-digit',
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
      this.selectedValue = null;
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
