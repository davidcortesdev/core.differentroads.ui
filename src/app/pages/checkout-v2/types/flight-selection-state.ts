import { IFlightPackDTO } from '../../../core/services/flight/flight-search.service';

// Interfaz para el estado de selección de vuelos
export interface FlightSelectionState {
  selectedFlight: IFlightPackDTO | null;
  totalPrice: number;
  source: 'default' | 'specific'; // Indica si viene de default-flights o specific-search
  packId: number | null; // ID del paquete seleccionado
}
