import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DepartureAccommodationService, IDepartureAccommodationResponse } from '../../../../core/services/departure/departure-accommodation.service';
import { DepartureAccommodationPriceService, IDepartureAccommodationPriceResponse } from '../../../../core/services/departure/departure-accommodation-price.service';
import { DepartureAccommodationTypeService, IDepartureAccommodationTypeResponse } from '../../../../core/services/departure/departure-accommodation-type.service';
import { forkJoin } from 'rxjs';

interface RoomAvailability {
  id: number;
  tkId: string;
  name: string;
  description: string;
  capacity: number;
  basePrice: number;
  qty?: number;
}

@Component({
  selector: 'app-selector-room',
  standalone: false,
  templateUrl: './selector-room.component.html',
  styleUrl: './selector-room.component.scss'
})
export class SelectorRoomComponent implements OnChanges {
  @Input() departureId: number | null = null;

  roomsAvailability: RoomAvailability[] = [];
  selectedRooms: { [tkId: string]: number } = {};
  errorMsg: string | null = null;
  
  // Información de viajeros (simulada por ahora)
  travelers: {
    adults?: number;
    childs?: number;
    babies?: number;
  } = { adults: 2, childs: 0, babies: 0 };

  constructor(
    private departureAccommodationService: DepartureAccommodationService,
    private departureAccommodationPriceService: DepartureAccommodationPriceService,
    private departureAccommodationTypeService: DepartureAccommodationTypeService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['departureId'] && this.departureId) {
      this.loadAccommodations();
    }
  }

  loadAccommodations(): void {
    if (this.departureId) {
      this.departureAccommodationService.getByDeparture(this.departureId).subscribe(accommodations => {
        this.processAccommodations(accommodations);
      });
    }
  }

  processAccommodations(accommodations: IDepartureAccommodationResponse[]): void {
    // Transformar los datos de alojamiento al formato esperado por el componente
    this.roomsAvailability = accommodations.map(accommodation => {
      return {
        id: accommodation.id,
        tkId: accommodation.tkId,
        name: accommodation.name,
        description: accommodation.description,
        capacity: accommodation.capacity,
        basePrice: 0, // Se actualizará con los precios reales
        qty: 0
      };
    });

    // Inicializar selectedRooms usando tkId
    this.selectedRooms = this.roomsAvailability.reduce((acc, room) => {
      acc[room.tkId] = 0;
      return acc;
    }, {} as { [tkId: string]: number });

    // Cargar precios para cada alojamiento
    if (this.departureId) {
      this.departureAccommodationPriceService.getByDeparture(this.departureId).subscribe(prices => {
        this.assignPricesToRooms(prices);
      });
    }
  }

  assignPricesToRooms(prices: IDepartureAccommodationPriceResponse[]): void {
    // Asignar precios a las habitaciones correspondientes
    this.roomsAvailability.forEach(room => {
      const roomPrice = prices.find(price => 
        price.departureAccommodationId === room.id
      );
      
      if (roomPrice && roomPrice.basePrice !== undefined) {
        // Usar el basePrice que viene en la respuesta de la API
        room.basePrice = roomPrice.basePrice;
      } else {
        room.basePrice = 0;
      }
    });
    
    // Filtrar solo las habitaciones que tienen precio mayor a 0
    this.roomsAvailability = this.roomsAvailability.filter(room => room.basePrice > 0);
  }

  onRoomSpacesChange(room: RoomAvailability, newValue: number): void {
    if (newValue === 0) {
      delete this.selectedRooms[room.tkId];
    } else {
      this.selectedRooms[room.tkId] = newValue;
    }

    this.updateRooms();
  }

  updateRooms(): void {
    const updatedRooms = Object.keys(this.selectedRooms).map(tkId => {
      const room = this.roomsAvailability.find(r => r.tkId === tkId);
      return {
        ...room,
        qty: this.selectedRooms[tkId]
      } as RoomAvailability;
    });

    const totalTravelers = 
      (this.travelers.adults || 0) + 
      (this.travelers.childs || 0) + 
      (this.travelers.babies || 0);

    const selectedPlaces = updatedRooms.reduce(
      (sum, room) => sum + (room.capacity || 0) * (room.qty || 0),
      0
    );

    if (selectedPlaces > totalTravelers) {
      this.errorMsg = 'Las habitaciones seleccionadas no se corresponden con la cantidad de viajeros.';
    } else {
      this.errorMsg = null;
    }

    // Aquí deberías actualizar el servicio que gestiona las habitaciones seleccionadas
    // similar a this.roomsService.updateSelectedRooms(updatedRooms);
  }

  // Método para verificar si hay bebés en la lista de viajeros
  hasBabies(): boolean {
    return this.travelers.babies ? this.travelers.babies > 0 : false;
  }

  get isSharedRoomSelected(): boolean {
    return Object.keys(this.selectedRooms).some(tkId => {
      const room = this.roomsAvailability.find(r => r.tkId === tkId);
      return (
        room &&
        room.name?.toLowerCase().includes('doble') &&
        room.capacity === 1 &&
        this.selectedRooms[tkId] > 0
      );
    });
  }
}