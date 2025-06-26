import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

// Servicios necesarios
import { HotelService, IHotelResponse } from '../../../../../../../core/services/hotels/hotel.service';
import { ItineraryService, IItineraryResponse } from '../../../../../../../core/services/itinerary/itinerary.service';
import { DepartureService, IDepartureResponse } from '../../../../../../../core/services/departure/departure.service';
import { DepartureDayService, IDepartureDayResponse } from '../../../../../../../core/services/departure/departure-day.service';
import { DepartureHotelService, IDepartureHotelResponse } from '../../../../../../../core/services/departure/departure-hotel.service';

@Component({
  selector: 'app-hotel-details',
  standalone: false,
  templateUrl: './hotel-details.component.html',
  styleUrl: './hotel-details.component.scss'
})
export class HotelDetailsComponent implements OnInit, OnChanges {
  
  // Inputs que recibirá desde el componente padre
  @Input() itineraryId: number | undefined;
  
  // Estados del componente
  loading = true;
  
  // Datos del componente
  departures: IDepartureResponse[] = [];
  itinerary: IItineraryResponse | undefined;
  departureDays: IDepartureDayResponse[] = [];
  departureHotels: IDepartureHotelResponse[] = [];
  hotels: IHotelResponse[] = [];
  
  constructor(
    private itineraryService: ItineraryService,
    private departureService: DepartureService,
    private departureDayService: DepartureDayService,
    private departureHotelService: DepartureHotelService,
    private hotelService: HotelService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['itineraryId']) {
      this.loadData();
    }
  }

  private loadData(): void {
    if (!this.itineraryId) {
      this.loading = false;
      return;
    }

    this.loading = true;

    const observables = [];

    // Departures by itinerary
    observables.push(
      this.departureService.getByItinerary(this.itineraryId).pipe(
        catchError(() => of([]))
      )
    );

    // Itinerary
    observables.push(
      this.itineraryService.getById(this.itineraryId).pipe(
        catchError(() => of(undefined))
      )
    );

    forkJoin(observables).pipe(
      finalize(() => this.loading = false)
    ).subscribe((results: any[]) => {
      this.departures = (results[0] || []).filter((d: any) => d && d.id);
      this.itinerary = results[1];
      
      console.log('Departures obtenidos (filtrados):', this.departures);
      console.log('Itinerary obtenido:', this.itinerary);
      
      // Si hay departures, cargar departure days
      if (this.departures && this.departures.length > 0) {
        this.loadDepartureDays();
      }
    });
  }

  private loadDepartureDays(): void {
    console.log('Cargando departure days para departures:', this.departures);
    
    // Crear observables para obtener departure days de cada departure
    const departureDayObservables = this.departures.map(departure => {
      console.log('Obteniendo departure days para departureId:', departure.id);
      return this.departureDayService.getByDepartureId(departure.id).pipe(
        catchError((error) => {
          console.error('Error obteniendo departure days para departure', departure.id, error);
          return of([]);
        })
      );
    });

    forkJoin(departureDayObservables).subscribe((results: any[]) => {
      console.log('Resultados departure days RAW:', results);
      // Aplanar todos los departure days en un solo array y filtrar nulos
      this.departureDays = results.flat().filter((dd: any) => dd && dd.id);
      console.log('Departure days finales (filtrados):', this.departureDays);
      
      // Si hay departure days, cargar departure hotels
      if (this.departureDays && this.departureDays.length > 0) {
        this.loadDepartureHotels();
      }
    });
  }

  private loadDepartureHotels(): void {
    console.log('Cargando departure hotels para departure days:', this.departureDays);
    
    // Crear observables para obtener departure hotels usando departureDayId
    const departureHotelObservables = this.departureDays.map(departureDay => {
      console.log('Obteniendo departure hotels para departureDayId:', departureDay.id);
      return this.departureHotelService.getAll({ departureDayId: departureDay.id }).pipe(
        catchError((error) => {
          console.error('Error obteniendo departure hotels para departure day', departureDay.id, error);
          return of([]);
        })
      );
    });

    forkJoin(departureHotelObservables).subscribe((results: any[]) => {
      console.log('Resultados departure hotels RAW:', results);
      // Aplanar todos los departure hotels en un solo array y filtrar nulos
      this.departureHotels = results.flat().filter((dh: any) => dh && dh.id && dh.hotelId);
      console.log('Departure hotels finales (filtrados):', this.departureHotels);
      
      // Si hay departure hotels, cargar hoteles
      if (this.departureHotels && this.departureHotels.length > 0) {
        this.loadHotels();
      }
    });
  }

  private loadHotels(): void {
    console.log('Cargando hoteles para departure hotels:', this.departureHotels);
    
    // Obtener IDs únicos de hoteles
    const uniqueHotelIds = [...new Set(this.departureHotels.map(dh => dh.hotelId))];
    console.log('IDs únicos de hoteles:', uniqueHotelIds);
    
    if (uniqueHotelIds.length === 0) {
      console.log('No hay IDs de hoteles para cargar');
      return;
    }
    
    // PRUEBA: Cargar un hotel específico primero
    console.log('PRUEBA: Intentando cargar hotel ID 340...');
    this.hotelService.getById(340).subscribe({
      next: (hotel) => {
        console.log('PRUEBA: Hotel 340 obtenido:', hotel);
      },
      error: (error) => {
        console.error('PRUEBA: Error obteniendo hotel 340:', error);
      }
    });
    
    // Crear observables para obtener información de cada hotel
    const hotelObservables = uniqueHotelIds.map(hotelId => {
      console.log('Obteniendo hotel para hotelId:', hotelId);
      return this.hotelService.getById(hotelId).pipe(
        catchError((error) => {
          console.error('Error obteniendo hotel', hotelId, error);
          return of(undefined);
        })
      );
    });

    if (hotelObservables.length === 0) {
      console.log('No se crearon observables para hoteles');
      return;
    }

    forkJoin(hotelObservables).subscribe({
      next: (results: any[]) => {
        console.log('Resultados hoteles RAW:', results);
        // Filtrar hoteles válidos (no undefined)
        this.hotels = results.filter(hotel => hotel !== undefined);
        console.log('Hoteles finales filtrados:', this.hotels);
      },
      error: (error) => {
        console.error('Error en forkJoin de hoteles:', error);
      }
    });
  }
}