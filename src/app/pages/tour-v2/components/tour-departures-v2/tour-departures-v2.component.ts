import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

// Importar la interface del selector
import { SelectedDepartureEvent } from '../tour-itinerary-v2/components/selector-itinerary/selector-itinerary.component';

// Importar servicios necesarios
import { DepartureService, IDepartureResponse } from '../../../../core/services/departure/departure.service';
import { ItineraryService, IItineraryResponse } from '../../../../core/services/itinerary/itinerary.service';

// Interfaces para los datos de ejemplo (SOLO CIUDADES)
interface City {
  name: string;
  code: string;
}

interface Travelers {
  adults: number;
  children: number;
  babies: number;
}

@Component({
  selector: 'app-tour-departures-v2',
  standalone: false,
  templateUrl: './tour-departures-v2.component.html',
  styleUrl: './tour-departures-v2.component.scss',
  providers: [MessageService]
})
export class TourDeparturesV2Component implements OnInit, OnDestroy, OnChanges {
  @Input() tourId: number | undefined;
  @Input() selectedDepartureEvent: SelectedDepartureEvent | null = null;

  // Control de destrucción del componente
  private destroy$ = new Subject<void>();

  // Estados del componente
  loading = false;
  error: string | undefined;

  // Datos del departure seleccionado
  selectedDeparture: SelectedDepartureEvent | null = null;
  departureDetails: IDepartureResponse | null = null;
  itineraryDetails: IItineraryResponse | null = null;

  // Datos para mostrar
  departureInfo = {
    departureDate: '',
    formattedDepartureDate: '',
    arrivalDate: '',
    formattedArrivalDate: '',
    itineraryId: 0,
    itineraryName: '',
    departureId: 0,
    departureName: '',
    tripTypeName: ''
  };

  // Datos de ejemplo: Solo ciudades
  cities: City[] = [
    { name: 'Madrid', code: 'MAD' },
    { name: 'Barcelona', code: 'BCN' }
  ];
  
  filteredCities: City[] = [];
  selectedCity: City | null = null;

  // Pasajeros
  travelers: Travelers = {
    adults: 1,
    children: 0,
    babies: 0
  };

  showPassengersPanel = false;

  // Validaciones del ejemplo
  shouldBlockKidsAndBabies: boolean = false;
  selectedDepartureId: number | null = null;
  passengerText: string = '1 Adulto';

  constructor(
    private departureService: DepartureService,
    private itineraryService: ItineraryService,
    private messageService: MessageService
  ) {
    this.filteredCities = [...this.cities];
    this.updatePassengerText();
  }

  ngOnInit(): void {
    if (!this.tourId) {
      console.warn('⚠️ No se proporcionó tourId para tour-departures-v2');
      this.error = 'ID del tour no proporcionado';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDepartureEvent'] && changes['selectedDepartureEvent'].currentValue) {
      const departureEvent = changes['selectedDepartureEvent'].currentValue;
      console.log('🎯 Departure seleccionado recibido en tour-departures-v2:', departureEvent);
      this.handleDepartureSelection(departureEvent);
    }
  }

  private handleDepartureSelection(event: SelectedDepartureEvent): void {
    this.selectedDeparture = event;
    this.selectedDepartureId = event.departure.id;
    this.loadDepartureDetails(event.departure.id);
  }

  private loadDepartureDetails(departureId: number): void {
    this.loading = true;
    this.error = undefined;

    this.departureService.getById(departureId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (departure) => {
        this.departureDetails = departure;
        this.updateDepartureInfo();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando detalles del departure:', error);
        this.error = 'Error al cargar los detalles del departure';
        this.loading = false;
      }
    });
  }

  private updateDepartureInfo(): void {
    if (!this.selectedDeparture || !this.departureDetails) return;

    this.departureInfo = {
      departureDate: this.departureDetails.departureDate,
      formattedDepartureDate: this.formatDate(this.departureDetails.departureDate),
      arrivalDate: this.departureDetails.arrivalDate,
      formattedArrivalDate: this.formatDate(this.departureDetails.arrivalDate),
      itineraryId: this.departureDetails.itineraryId,
      itineraryName: this.selectedDeparture.itineraryName,
      departureId: this.departureDetails.id,
      departureName: this.selectedDeparture.departure.name || 'Sin nombre',
      tripTypeName: this.selectedDeparture.tripType?.name || 'Sin tipo'
    };

    // Verificar validaciones después de actualizar info
    this.shouldBlockKidsAndBabies = this.checkIfShouldBlockKids();
    
    // Si se deben bloquear y hay niños o bebés seleccionados, resetearlos
    if (this.shouldBlockKidsAndBabies) {
      if (this.travelers.children > 0 || this.travelers.babies > 0) {
        this.travelers.children = 0;
        this.travelers.babies = 0;
        this.updatePassengerText();
      }
    }

    // AÑADIR AUTOMÁTICAMENTE EL PRIMER DEPARTURE
    setTimeout(() => {
      if (this.filteredDepartures.length > 0) {
        this.addToCart(this.filteredDepartures[0]);
      }
    }, 0);

    console.log('📊 Información del departure actualizada:', this.departureInfo);
  }

  private formatDate(dateString: string): string {
    if (!dateString) return 'Fecha no disponible';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  get tripDuration(): number {
    if (!this.departureDetails) return 0;
    
    try {
      const departureDate = new Date(this.departureDetails.departureDate);
      const arrivalDate = new Date(this.departureDetails.arrivalDate);
      const diffTime = Math.abs(arrivalDate.getTime() - departureDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  }

  // Validaciones del ejemplo
  checkIfShouldBlockKids(): boolean {
    // Si no hay departure seleccionado, no bloqueamos
    if (!this.selectedDepartureId || this.filteredDepartures.length === 0) {
      return false;
    }

    // Encontrar la salida seleccionada - EXACTO COMO EL EJEMPLO
    const selectedDeparture = this.filteredDepartures.find(
      d => d.id === this.selectedDepartureId
    );

    if (!selectedDeparture) {
      return false;
    }

    // Si el precio es 0 o el tipo de viaje es 'single', bloqueamos - EXACTO COMO EL EJEMPLO
    const isSingleTrip = selectedDeparture.group?.toLowerCase().includes('single') ||
                          this.getTripTypeInfo(selectedDeparture.group)?.class === 'single';

    return isSingleTrip || selectedDeparture.price === 0;
  }

  showBlockedPassengersToast(): void {
    const selectedDeparture = this.filteredDepartures.find(
      d => d.id === this.selectedDepartureId
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

  // Convertir el departure actual en formato para la tabla
  get filteredDepartures(): any[] {
    if (!this.departureDetails) return [];
    
    const departure = {
      id: this.departureDetails.id,
      departureDate: this.departureDetails.departureDate,
      returnDate: this.departureDetails.arrivalDate,
      price: 1495.00, // Precio del ejemplo 
      status: 'available',
      waitingList: false,
      group: this.selectedDeparture?.tripType?.name || 'group'
    };

    return [departure];
  }

  // Métodos de ejemplo
  filterCities(event: any): void {
    const query = event.query;
    this.filteredCities = this.cities.filter(city => 
      city.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  onCityChange(event: any): void {
    this.selectedCity = event;
    console.log('Ciudad seleccionada:', event);
  }

  togglePassengersPanel(event: Event): void {
    this.showPassengersPanel = !this.showPassengersPanel;
    event.stopPropagation();
  }

  updatePassengers(type: keyof Travelers, change: number): void {
    this.shouldBlockKidsAndBabies = this.checkIfShouldBlockKids();
    
    if (type === 'adults') {
      this.travelers.adults = Math.max(1, this.travelers.adults + change);
    } else if (type === 'children') {
      if (this.shouldBlockKidsAndBabies && change > 0) {
        this.showBlockedPassengersToast();
        return;
      }
      this.travelers.children = Math.max(0, this.travelers.children + change);
    } else if (type === 'babies') {
      if (this.shouldBlockKidsAndBabies && change > 0) {
        this.showBlockedPassengersToast();
        return;
      }
      this.travelers.babies = Math.max(0, this.travelers.babies + change);
    }

    this.updatePassengerText();
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

  applyPassengers(): void {
    this.showPassengersPanel = false;
    console.log('Pasajeros aplicados:', this.travelers);
  }

  getTripTypeInfo(group: string): any {
    if (!group) return undefined;

    const type = group.toLowerCase();

    if (type.includes('single') || type.includes('singles')) {
      return { title: 'Single', description: 'Viaje individual', class: 'single' };
    }

    if (type.includes('group') || type.includes('grupo')) {
      return { title: 'Group', description: 'Viaje en grupo', class: 'group' };
    }

    if (type.includes('private') || type.includes('privado')) {
      return { title: 'Private', description: 'Viaje privado', class: 'private' };
    }

    return undefined;
  }

  addToCart(item: any): void {
    console.log('Añadir al carrito:', item);
    
    // Marcar como seleccionado para cambiar el botón
    this.selectedDepartureId = item.id;
  }

  // Verificar si el departure está seleccionado - EXACTO COMO EL EJEMPLO
  isDepartureSelected(item: any): boolean {
    return this.selectedDepartureId === item.id;
  }

  get hasSelectedDeparture(): boolean {
    return this.selectedDeparture !== null;
  }

  get hasValidData(): boolean {
    return !this.loading && !this.error && this.hasSelectedDeparture;
  }
}