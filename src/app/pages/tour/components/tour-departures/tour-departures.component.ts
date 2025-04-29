import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
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
export class TourDeparturesComponent implements OnInit, OnDestroy {
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

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService,
    private tourDataService: TourDataService,
    private tourOrderService: TourOrderService,
    private messageService: MessageService
  ) {}

  filterCities(event: { query: string }): void {
    const query = event.query.toLowerCase();
    this.filteredCities = this.cities.filter((city) =>
      city.toLowerCase().includes(query)
    );
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

    console.log('filteredDepartures', this.filteredDepartures);

    // Automatically select the first departure if available
    if (this.filteredDepartures.length > 0) {
      this.addToCart(this.filteredDepartures[0]);
      this.tourOrderService.updateBasePrice(this.filteredDepartures[0].price);
    }

    console.log('filteredDepartures', this.filteredDepartures);
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
  /*
  previousMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.updateMonthDisplay();
    this.filterDeparturesByMonth();
  }
    */
  /*
  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.updateMonthDisplay();
    this.filterDeparturesByMonth();
  }
*/
  filterDeparturesByMonth(): void {
    /* const startOfMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      1
    );
    const endOfMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      0
    );*/
    /*
    this.filteredDepartures = this.departures.filter((departure) => {
      const departureDate = new Date(departure.departureDate);
      return departureDate >= startOfMonth && departureDate <= endOfMonth;
    });*/

    // Actualizar precios con la primera salida filtrada si existe
    if (this.filteredDepartures.length > 0) {
      this.tourOrderService.updateBasePrice(this.filteredDepartures[0].price);
      // Select the first departure if not already selected
      if (!this.selectedDepartureId) {
        this.addToCart(this.filteredDepartures[0]);
      }
    }
  }

  ngOnInit() {
    this.updateMonthDisplay();
    this.updatePassengerText(); // Inicializa el texto de pasajeros

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
      });
  }

  private setCheapestCityAsDefault() {
    if (this.departures.length > 0) {
      const cheapestDepartures = this.departures.filter(
        (departure) =>
          departure.price === Math.min(...this.departures.map((d) => d.price))
      );
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