import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { TourComponent } from '../../tour.component';
import { TourDataService } from '../../../../core/services/tour-data/tour-data.service';
import { Subscription } from 'rxjs';
import { TourOrderService } from '../../../../core/services/tour-data/tour-order.service';
import { MessageService } from 'primeng/api';
import { TripType } from '../../../../shared/models/interfaces/trip-type.interface';
import { TRIP_TYPES } from '../../../../shared/constants/trip-types.constants';
import { DataView } from 'primeng/dataview';


export interface Departure {
  name: string;
  departureDate: Date;
  returnDate: Date;
  destination?: string;
  flights?: string;
  flightID: string;
  price: number;
  originalPrice: number;
  discount: number;
  group?: string;
  waitingList: boolean;
  status: DepartureStatus;
  externalID: string;
}

export type DepartureStatus = 'available' | 'complete';

@Component({
  selector: 'app-tour-departures',
  standalone: false,
  templateUrl: './tour-departures.component.html',
  styleUrls: ['./tour-departures.component.scss'],
  providers: [MessageService]
})
export class TourDeparturesComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('dv') dataView!: DataView;

  departures: Departure[] = [];
  filteredDepartures: Departure[] = [];
  selectedCity: string = '';

  // Propiedades para pasajeros (incluye bebés pero no se usarán para el precio)
  travelers = {
    adults: 1,
    children: 0,
    babies: 0,
  };

  // Emitir cambios en la selección de pasajeros (solo adultos y niños)
  @Output() passengerChange = new EventEmitter<{
    adults: number;
    children: number;
  }>();

  passengerText: string = '1 Adulto'; // Valor inicial

  // Nueva propiedad para el panel de pasajeros
  showPassengersPanel: boolean = false;

  // Navegación de mes
  currentMonth: Date = new Date();
  monthName: string = '';
  year: number = 0;

  private cities: string[] = [];
  filteredCities: string[] = [];

  // Para manejar las suscripciones
  private subscriptions = new Subscription();

  // Add properties to track selected departure
  selectedDepartureId: string | null = null;
  selectedFlightId: string | null = null;

  // Nueva propiedad para verificar si los botones de niños y bebés deben estar bloqueados
  shouldBlockKidsAndBabies: boolean = false;

  // Constants
  tripTypes: TripType[] = TRIP_TYPES;
  
  // Bandera para controlar si estamos procesando una actualización externa
  private isProcessingDateUpdate = false;
  
  // Flag para controlar si la ciudad ha sido seleccionada manualmente
  private isCityManuallySelected = false;
  
  // Nuevas propiedades para manejar el paginador
  private pendingNavigateToIndex: number | null = null;
  private dataViewInitialized = false;

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService,
    private tourDataService: TourDataService,
    private tourOrderService: TourOrderService,
    private messageService: MessageService
  ) {}
  
  ngAfterViewInit() {
    this.dataViewInitialized = true;
    
    // Si hay una navegación pendiente, procesarla
    if (this.pendingNavigateToIndex !== null) {
      this.navigateToItemIndex(this.pendingNavigateToIndex);
      this.pendingNavigateToIndex = null;
    }
  }

  filterCities(event: { query: string }): void {
    const query = event.query.toLowerCase();
    this.filteredCities = this.cities.filter((city) =>
      city.toLowerCase().includes(query)
    );
  }
  
  // Evento para manejar la selección manual de ciudad
  onSelectCity(event: any): void {
    this.isCityManuallySelected = true;
  }
  
  // Método para manejar cambio manual de ciudad
  onCityChange(newCity: string): void {
    // Marcar que la ciudad ha sido seleccionada manualmente
    this.isCityManuallySelected = true;
    this.selectedCity = newCity;
    this.filterDepartures();
    
    // Actualizar el precio base si hay salidas filtradas
    if (this.filteredDepartures.length > 0) {
      this.tourOrderService.updateBasePrice(this.filteredDepartures[0].price);
    }
  }

  // Métodos para el selector de pasajeros
  togglePassengersPanel(event: Event): void {
    this.showPassengersPanel = !this.showPassengersPanel;
    event.stopPropagation();
  }

  // Verifica si se deben bloquear las opciones de niños y bebés
  checkIfShouldBlockKids(): boolean {
    // Si no hay salida seleccionada, no bloqueamos
    if (!this.selectedDepartureId || this.filteredDepartures.length === 0) {
      return false;
    }

    // Encontrar la salida seleccionada
    const selectedDeparture = this.filteredDepartures.find(
      d => d.externalID === this.selectedDepartureId && d.flightID === this.selectedFlightId
    );

    if (!selectedDeparture) {
      return false;
    }

    // Si el precio es 0 o el tipo de viaje es 'single', bloqueamos
    const isSingleTrip = selectedDeparture.group?.toLowerCase().includes('single') ||
                          this.getTripTypeInfo(selectedDeparture.group)?.class === 'single';

    return isSingleTrip || selectedDeparture.price === 0;
  }

  updatePassengers(
    type: 'adults' | 'children' | 'babies',
    change: number
  ): void {
    // Verificar si deberíamos bloquear niños y bebés
    this.shouldBlockKidsAndBabies = this.checkIfShouldBlockKids();
    
    if (type === 'adults') {
      this.travelers.adults = Math.max(1, this.travelers.adults + change);
    } else if (type === 'children') {
      if (this.shouldBlockKidsAndBabies && change > 0) {
        // Mostrar toast si se intenta agregar niños y está bloqueado
        this.showBlockedPassengersToast();
        return;
      }
      this.travelers.children = Math.max(0, this.travelers.children + change);
    } else if (type === 'babies') {
      if (this.shouldBlockKidsAndBabies && change > 0) {
        // Mostrar toast si se intenta agregar bebés y está bloqueado
        this.showBlockedPassengersToast();
        return;
      }
      this.travelers.babies = Math.max(0, this.travelers.babies + change);
    }

    this.tourOrderService.updateSelectedTravelers(this.travelers);
    this.updatePassengerText();
  }
  
  // Método para mostrar el toast cuando se intenta agregar niños o bebés y está bloqueado
  showBlockedPassengersToast(): void {
    const selectedDeparture = this.filteredDepartures.find(
      d => d.externalID === this.selectedDepartureId && d.flightID === this.selectedFlightId
    );
    
    const isSingleTrip = selectedDeparture?.group?.toLowerCase().includes('single') || 
                          this.getTripTypeInfo(selectedDeparture?.group)?.class === 'single';
    
    let message = '';
    if (isSingleTrip) {
      message = 'Este viaje es para Singles y solo permite pasajeros adultos';
    } else if (selectedDeparture?.price === 0) {
      message = 'Este viaje con precio 0€ no permite añadir niños o bebés';
    } else {
      message = 'No se pueden añadir niños o bebés a este viaje';
    }
    
    this.messageService.add({
      severity: 'warn',
      summary: 'Pasajeros no permitidos',
      detail: message,
      life: 3000
    });
  }

  applyPassengers(): void {
    this.showPassengersPanel = false;

    // Emitir cambio de pasajeros al aplicar (solo adultos y niños)
    this.passengerChange.emit({
      adults: this.travelers.adults,
      children: this.travelers.children,
      // No enviamos los bebés para el cálculo del precio
    });
  }

  updatePassengerText(): void {
    const parts = [];

    if (this.travelers.adults > 0) {
      parts.push(
        `${this.travelers.adults} ${
          this.travelers.adults === 1 ? 'Adulto' : 'Adultos'
        }`
      );
    }

    if (this.travelers.children > 0) {
      parts.push(
        `${this.travelers.children} ${
          this.travelers.children === 1 ? 'Niño' : 'Niños'
        }`
      );
    }

    if (this.travelers.babies > 0) {
      parts.push(
        `${this.travelers.babies} ${
          this.travelers.babies === 1 ? 'Bebé' : 'Bebés'
        }`
      );
    }

    this.passengerText = parts.join(', ');
  }

  addToCart(departure: Departure): void {
    // Si estamos procesando una actualización externa, evitar ciclos
    if (this.isProcessingDateUpdate) {
      return;
    }
    
    // Antes de redirigir, actualizamos la información en el servicio compartido
    const selectedDate = new Date(departure.departureDate);
    const returnDate = new Date(departure.returnDate);

    // Formatear las fechas para mostrar en el header
    const dateString = `${selectedDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    })} - ${returnDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    })}`;

    // Actualizar la información compartida
    this.tourOrderService.updateSelectedDateInfo(
      departure.externalID,
      departure.flightID
    );

    // Update our local tracking properties
    this.selectedDepartureId = departure.externalID;
    this.selectedFlightId = departure.flightID;

    // Verificar si debemos bloquear niños y bebés para esta salida
    this.shouldBlockKidsAndBabies = this.checkIfShouldBlockKids();
    
    // Si se deben bloquear y hay niños o bebés seleccionados, resetearlos
    if (this.shouldBlockKidsAndBabies) {
      if (this.travelers.children > 0 || this.travelers.babies > 0) {
        this.travelers.children = 0;
        this.travelers.babies = 0;
        this.updatePassengerText();
      }
    }

    this.tourOrderService.updateSelectedTravelers(this.travelers);

    // Emitir información de pasajeros (solo adultos y niños)
    this.passengerChange.emit({
      adults: this.travelers.adults,
      children: this.travelers.children,
    });

    // Continuar con la redirección
    //this.tourComponent.createOrderAndRedirect(departure);
  }

  // Add a helper method to check if a departure is currently selected
  isDepartureSelected(departure: Departure): boolean {
    return (
      this.selectedDepartureId === departure.externalID &&
      this.selectedFlightId === departure.flightID
    );
  }

  filterDepartures(): void {
    this.filteredDepartures = this.departures.filter(
      (departure) =>
        departure.destination === this.selectedCity ||
        departure.flights === this.selectedCity
    );

    // Ordenar las salidas filtradas por fecha de salida (ascendente)
    this.filteredDepartures.sort((a, b) => {
      return a.departureDate.getTime() - b.departureDate.getTime();
    });

    // Automatically select the first departure if available
    if (this.filteredDepartures.length > 0) {
      // Si estamos actualizando manualmente, no llamamos a addToCart
      // ya que eso podría interferir con la actualización manual
      if (!this.isCityManuallySelected) {
        this.addToCart(this.filteredDepartures[0]);
      }
      this.tourOrderService.updateBasePrice(this.filteredDepartures[0].price);
    }
  }

  // Métodos para la navegación del mes
  updateMonthDisplay(): void {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    this.monthName = months[this.currentMonth.getMonth()];
    // Mantenemos el año en la propiedad pero no lo mostramos en la interfaz
    this.year = this.currentMonth.getFullYear();
  }

  filterDeparturesByMonth(): void {
    // Actualizar precios con la primera salida filtrada si existe
    if (this.filteredDepartures.length > 0) {
      this.tourOrderService.updateBasePrice(this.filteredDepartures[0].price);
      // Select the first departure if not already selected
      if (!this.selectedDepartureId) {
        this.addToCart(this.filteredDepartures[0]);
      }
    }
  }
  
  // Método simplificado para navegar al elemento seleccionado en el DataView
  navigateToItemIndex(index: number): void {
    if (!this.dataViewInitialized || !this.dataView) {
      // Si el dataView no está inicializado, guardamos la navegación para más tarde
      this.pendingNavigateToIndex = index;
      return;
    }
    
    try {
      // Obtener el tamaño de página
      const rowsPerPage = this.dataView.rows || 5;
      
      // Calcular la página donde debería estar el elemento
      const targetPage = Math.floor(index / rowsPerPage);
      
      // Actualizar la página del DataView
      this.dataView.first = targetPage * rowsPerPage;
      
      // También intentar cambiar directamente la página del paginador
      setTimeout(() => {
        // Verificar si hay un paginador físico en la página
        const paginatorElement = document.querySelector('.p-paginator');
        if (paginatorElement) {
          // Encontrar todos los botones de página
          const pageButtons = paginatorElement.querySelectorAll('.p-paginator-page');
          
          // Buscar el botón de la página específica
          for (let i = 0; i < pageButtons.length; i++) {
            const button = pageButtons[i] as HTMLElement;
            if (button.textContent?.trim() === (targetPage + 1).toString()) {
              // Clickear el botón directamente
              button.click();
              break;
            }
          }
        }
      }, 0);
    } catch (err) {
      // Error handling without console.log
    }
  }
  
  // Método para buscar el índice de una salida en el array filtrado
  findDepartureIndex(departureId: string, flightId: string): number {
    return this.filteredDepartures.findIndex(
      d => d.externalID === departureId && d.flightID === flightId
    );
  }

  ngOnInit() {
    this.updateMonthDisplay();
    this.updatePassengerText(); // Inicializa el texto de pasajeros

    // Configurar la suscripción a cambios externos
    this.subscriptions.add(
      this.tourOrderService.selectedDateInfo$.subscribe(dateInfo => {
        // No reaccionar a cambios durante la carga inicial
        if (dateInfo.periodID && 
            dateInfo.periodID !== this.selectedDepartureId &&
            this.departures.length > 0 && 
            this.selectedDepartureId !== null) { // Solo si ya hay algo seleccionado
          
          try {
            this.isProcessingDateUpdate = true;
            
            // Buscar una salida que corresponda al periodID y a la ciudad actualmente seleccionada
            // Si la ciudad incluye "Sin vuelos", queremos mantener esta selección
            const isSinVuelosSelected = this.selectedCity.toLowerCase().includes('sin');
            
            // Primero intentamos encontrar una salida que coincida con el periodID y la ciudad actual
            let matchingDeparture = null;
            
            // Si la ciudad actual es "Sin vuelos" o no ha sido seleccionada manualmente,
            // intentamos encontrar una salida "Sin vuelos" para el nuevo período
            if (isSinVuelosSelected || !this.isCityManuallySelected) {
              matchingDeparture = this.departures.find(
                d => d.externalID === dateInfo.periodID && 
                    (d.destination?.toLowerCase().includes('sin') || 
                     d.flights?.toLowerCase().includes('sin'))
              );
            }
            
            // Si no encontramos una salida "Sin vuelos" o la ciudad fue seleccionada manualmente,
            // buscamos cualquier salida que coincida con el nuevo período y la ciudad actual
            if (!matchingDeparture && this.isCityManuallySelected) {
              matchingDeparture = this.departures.find(
                d => d.externalID === dateInfo.periodID && 
                    (d.destination === this.selectedCity || 
                     d.flights === this.selectedCity)
              );
            }
            
            // Si aún no encontramos una salida, tomamos cualquiera con el periodID correcto
            if (!matchingDeparture) {
              matchingDeparture = this.departures.find(
                d => d.externalID === dateInfo.periodID
              );
            }
            
            if (matchingDeparture) {
              // Si la ciudad actual es "Sin vuelos" o no ha sido seleccionada manualmente,
              // y tenemos una salida "Sin vuelos" disponible en el nuevo período,
              // mantenemos "Sin vuelos" como la ciudad seleccionada
              if (!this.isCityManuallySelected && 
                  (isSinVuelosSelected || this.selectedCity === '') && 
                  matchingDeparture.destination?.toLowerCase().includes('sin')) {
                // No cambiamos la ciudad seleccionada, mantenemos "Sin vuelos"
              }
              // Solo cambiamos la ciudad si el usuario la seleccionó manualmente
              // y la ciudad actual no coincide con la salida encontrada
              else if (this.isCityManuallySelected && 
                       matchingDeparture.destination !== this.selectedCity && 
                       matchingDeparture.flights !== this.selectedCity) {
                this.selectedCity = matchingDeparture.destination || matchingDeparture.flights || '';
              }
              
              // Filtrar las salidas manualmente sin cambiar la selección automática
              this.filteredDepartures = this.departures.filter(
                (departure) =>
                  departure.destination === this.selectedCity ||
                  departure.flights === this.selectedCity
              );
              
              // Ordenar las salidas filtradas por fecha (ascendente)
              this.filteredDepartures.sort((a, b) => {
                return a.departureDate.getTime() - b.departureDate.getTime();
              });
              
              // Actualizar propiedades locales
              this.selectedDepartureId = matchingDeparture.externalID;
              this.selectedFlightId = matchingDeparture.flightID;
              
              // Verificar bloqueo de niños/bebés
              this.shouldBlockKidsAndBabies = this.checkIfShouldBlockKids();
              
              // Resetear niños/bebés si es necesario
              if (this.shouldBlockKidsAndBabies) {
                if (this.travelers.children > 0 || this.travelers.babies > 0) {
                  this.travelers.children = 0;
                  this.travelers.babies = 0;
                  this.updatePassengerText();
                }
              }
              
              // Actualizar viajeros
              this.tourOrderService.updateSelectedTravelers(this.travelers);
              
              // Emitir cambio
              this.passengerChange.emit({
                adults: this.travelers.adults,
                children: this.travelers.children,
              });
              
              // Buscar el índice del elemento seleccionado
              const index = this.findDepartureIndex(matchingDeparture.externalID, matchingDeparture.flightID);
              
              if (index !== -1) {
                // Navegar a la página que contiene el elemento
                setTimeout(() => {
                  this.navigateToItemIndex(index);
                }, 50);
              }
            }
          } finally {
            setTimeout(() => {
              this.isProcessingDateUpdate = false;
            }, 0);
          }
        }
      })
    );

    // Continuar con la carga normal
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadTourData(slug);
      }
    });

    // Emitir la información inicial de pasajeros
    setTimeout(() => {
      this.passengerChange.emit({
        adults: this.travelers.adults,
        children: this.travelers.children,
      });
      this.tourOrderService.updateSelectedTravelers(this.travelers);
    }, 0);
  }

  ngOnDestroy() {
    // Limpieza de suscripciones
    this.subscriptions.unsubscribe();
  }

  private loadTourData(slug: string) {
    this.toursService
      .getTourDetailBySlug(slug, ['activePeriods', 'basePrice'])
      .subscribe((tour) => {
        const uniquePeriods = new Set<string>();
        this.departures = tour.activePeriods.flatMap((period) =>
          period.flights
            .map((flight) => {
              const periodKey = `${period.dayOne}-${flight.name}`;
              if (uniquePeriods.has(periodKey)) {
                return null;
              }
              uniquePeriods.add(periodKey);

              return {
                name: period.name,
                departureDate: new Date(period.dayOne),
                returnDate: new Date(period.returnDate),
                destination: flight.name,
                flightID: `${flight.activityID}`,
                flights: flight.name,
                price:
                  tour.basePrice +
                  (period.basePrice || 0) +
                  (flight.prices || 0),
                originalPrice: tour.basePrice + 200,
                discount: 10,
                group: period.tripType || 'Grupo',
                waitingList: false,
                status: 'available' as DepartureStatus,
                externalID: `${period.externalID}`,
              };
            })
            .filter((departure) => departure !== null)
        );
        
        // Ordenar las salidas por fecha de salida (ascendente)
        this.departures.sort((a, b) => {
          return a.departureDate.getTime() - b.departureDate.getTime();
        });

        this.cities = [
          ...new Set(
            this.departures
              .map((departure) => departure.destination)
              .filter((destination): destination is string => !!destination)
          ),
        ];
        this.setCheapestCityAsDefault();
        this.filterDepartures();
        this.filterDeparturesByMonth(); // Filtrar por el mes actual
        
        // Verificar si debemos bloquear niños y bebés para la salida seleccionada por defecto
        this.shouldBlockKidsAndBabies = this.checkIfShouldBlockKids();

        // Ensure we have a selected departure after loading data
        if (!this.selectedDepartureId && this.filteredDepartures.length > 0) {
          this.addToCart(this.filteredDepartures[0]);
        }
        
        // Reiniciamos la bandera después de la carga inicial
        this.isCityManuallySelected = false;
      });
  }

  private setCheapestCityAsDefault() {
    if (this.departures.length > 0) {
      const cheapestDepartures = this.departures.filter(
        (departure) =>
          departure.price === Math.min(...this.departures.map((d) => d.price))
      );
      
      // Preferencia por salidas "Sin vuelos"
      const preferredDeparture = cheapestDepartures.find((departure) =>
        departure.destination?.toLowerCase().includes('sin')
      );
      
      this.selectedCity =
        preferredDeparture?.destination ||
        cheapestDepartures[0].destination ||
        '';

      // Ensure the cheapest city is the first in the list of cities
      this.cities = [
        this.selectedCity,
        ...this.cities.filter((city) => city !== this.selectedCity),
      ];
      
      // Reiniciamos la bandera, ya que esta selección es automática
      this.isCityManuallySelected = false;
    }
  }

  // Trip type handling
  getTripTypeInfo(tripType: string | undefined): TripType | undefined {
    if (!tripType) return undefined;

    const type = tripType.toLowerCase();

    if (type.includes('single') || type.includes('singles')) {
      return this.tripTypes.find((tt) => tt.class === 'single');
    }

    if (type.includes('group') || type.includes('grupo')) {
      return this.tripTypes.find((tt) => tt.class === 'group');
    }

    if (type.includes('private') || type.includes('privado')) {
      return this.tripTypes.find((tt) => tt.class === 'private');
    }

    return undefined;
  }
}