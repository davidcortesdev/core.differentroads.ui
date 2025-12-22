import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, finalize, switchMap, map } from 'rxjs/operators';

// Servicios necesarios
import { DepartureDayService, IDepartureDayResponse } from '../../../../../../../core/services/departure/departure-day.service';
import { DepartureHotelService, IDepartureHotelResponse } from '../../../../../../../core/services/departure/departure-hotel.service';
import { HotelService, IHotelResponse } from '../../../../../../../core/services/hotels/hotel.service';

// Interface optimizada
interface OptimizedHotelInfo {
  departureHotelId: number;
  departureDayId: number;
  hotel: IHotelResponse;
}

@Component({
  selector: 'app-hotel-details',
  standalone: false,
  templateUrl: './hotel-details.component.html',
  styleUrl: './hotel-details.component.scss'
})
export class HotelDetailsComponent implements OnInit, OnChanges {
  
  // Inputs del componente
  @Input() itineraryDayId: number | undefined;
  @Input() departureId: number | undefined;
  
  // Estados del componente
  loading = true;
  
  // Datos optimizados
  hotelsForThisDay: OptimizedHotelInfo[] = [];
  
  // NUEVO: Propiedad para el logo de booking (igual que hotel-card)
  readonly bookingLogoSrc: string = 'assets/images/booking-logo.png';
  
  // NUEVO: Cache para evitar consultas duplicadas
  private lastQuery: string = '';
  private isLoadingData = false;
  
  constructor(
    private departureDayService: DepartureDayService,
    private departureHotelService: DepartureHotelService,
    private hotelService: HotelService
  ) {}

  ngOnInit(): void {
    this.loadDataWithFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // OPTIMIZACIÓN: Solo recargar si realmente cambió algo importante
    const itineraryDayChanged = changes['itineraryDayId'] && 
                               changes['itineraryDayId'].currentValue !== changes['itineraryDayId'].previousValue;
    const departureChanged = changes['departureId'] && 
                            changes['departureId'].currentValue !== changes['departureId'].previousValue;
    
    if (itineraryDayChanged || departureChanged) {
      this.loadDataWithFilters();
    }
  }

  /**
   * MÉTODO OPTIMIZADO: Obtener múltiples hoteles usando el servicio actual
   */
  private getMultipleHotelsByIds(hotelIds: number[]): Observable<IHotelResponse[]> {
    if (hotelIds.length === 0) {
      return of([]);
    }

    if (hotelIds.length === 1) {
      // Un solo hotel - usar getById
      return this.hotelService.getById(hotelIds[0]).pipe(
        map(hotel => [hotel]),
        catchError(error => {
          return of([]);
        })
      );
    }

    // ESTRATEGIA OPTIMIZADA: Consultas paralelas limitadas en lotes    
    const batchSize = 3; // Máximo 3 consultas paralelas por lote
    const batches: number[][] = [];
    
    // Dividir en lotes
    for (let i = 0; i < hotelIds.length; i += batchSize) {
      batches.push(hotelIds.slice(i, i + batchSize));
    }

    // Procesar lotes secuencialmente para no sobrecargar el servidor
    const batchObservables = batches.map(batch => 
      forkJoin(batch.map(hotelId =>
        this.hotelService.getById(hotelId).pipe(
          catchError(error => {
            return of(null);
          })
        )
      ))
    );

    return forkJoin(batchObservables).pipe(
      map(batchResults => {
        const allHotels = batchResults.flat().filter(hotel => hotel !== null) as IHotelResponse[];
        return allHotels;
      }),
      catchError(error => {
        return of([]);
      })
    );
  }

  /**
   * MÉTODO OPTIMIZADO: Evitar consultas duplicadas
   */
  private loadDataWithFilters(): void {
    if (!this.itineraryDayId || !this.departureId) {
      this.loading = false;
      this.hotelsForThisDay = [];
      return;
    }

    // OPTIMIZACIÓN: Crear clave única para evitar consultas duplicadas
    const queryKey = `${this.itineraryDayId}-${this.departureId}`;
    if (this.lastQuery === queryKey || this.isLoadingData) {
      return;
    }

    this.lastQuery = queryKey;
    this.isLoadingData = true;
    this.loading = true;
    // CONSULTA 1: Departure days filtrados directamente por el servicio
    this.departureDayService.getByItineraryDayId(this.itineraryDayId).pipe(
      map((departureDays: IDepartureDayResponse[]) => {
        // Filtrar solo los del departure seleccionado
        const filteredDepartureDays = departureDays.filter(dd => 
          dd && dd.id && dd.departureId === this.departureId
        );
        
        return filteredDepartureDays.map(dd => dd.id);
      }),
      switchMap((departureDayIds: number[]) => {
        if (departureDayIds.length === 0) {
          return of([]);
        }

        // CONSULTA 2: Departure hotels filtrados POR CADA departureDayId específico
        // Usar el filtro del servicio directamente
        const departureHotelObservables = departureDayIds.map(departureDayId => 
          this.departureHotelService.getAll({ departureDayId }).pipe(
            catchError(error => {
              return of([]);
            })
          )
        );

        return forkJoin(departureHotelObservables).pipe(
          map(results => results.flat())
        );
      }),
      switchMap((departureHotels: IDepartureHotelResponse[]) => {
        const validDepartureHotels = departureHotels.filter(dh => dh && dh.id && dh.hotelId);

        if (validDepartureHotels.length === 0) {
          return of({ departureHotels: [], hotels: [] });
        }

        // CONSULTA 3 OPTIMIZADA: UNA SOLA petición con todos los hotel IDs
        const uniqueHotelIds = [...new Set(validDepartureHotels.map(dh => dh.hotelId))];
        
        if (uniqueHotelIds.length === 0) {
          return of({ departureHotels: validDepartureHotels, hotels: [] });
        }

        // MÉTODO OPTIMIZADO: Usar consulta optimizada para múltiples hoteles
        return this.getMultipleHotelsByIds(uniqueHotelIds).pipe(
          map(hotels => ({
            departureHotels: validDepartureHotels,
            hotels: hotels // Ya viene como array de IHotelResponse[]
          }))
        );
      }),
      catchError(error => {
        return of({ departureHotels: [], hotels: [] });
      }),
      finalize(() => {
        this.loading = false;
        this.isLoadingData = false; // NUEVO: Permitir futuras consultas
      })
    ).subscribe(({ departureHotels, hotels }) => {
      // Construir resultado final
      this.hotelsForThisDay = [];
      
      // Map para búsquedas eficientes
      const hotelMap = new Map<number, IHotelResponse>();
      hotels.forEach((hotelResult: any) => {
        if (hotelResult.hotel) {
          hotelMap.set(hotelResult.hotel.id, hotelResult.hotel);
        } else {
          // Si viene directamente del método optimizado
          hotelMap.set(hotelResult.id, hotelResult);
        }
      });

      // Resultado final
      departureHotels.forEach((departureHotel: IDepartureHotelResponse) => {
        const hotel = hotelMap.get(departureHotel.hotelId!);
        if (hotel && departureHotel.departureDayId) {
          this.hotelsForThisDay.push({
            departureHotelId: departureHotel.id,
            departureDayId: departureHotel.departureDayId,
            hotel: hotel
          });
        }
      });

    });
  }

  /**
   * MÉTODO HELPER: Convertir estrellas string a número para p-rating
   */
  getHotelStarsAsNumber(stars: string): number {
    if (!stars) return 0;
    
    // Convertir string a número, manejar formatos como "4", "4.5", "****"
    const parsed = parseFloat(stars);
    if (!isNaN(parsed)) {
      return Math.min(Math.max(parsed, 0), 5); // Entre 0 y 5
    }
    
    // Si son asteriscos, contar la cantidad
    if (stars.includes('*')) {
      return Math.min(stars.length, 5);
    }
    
    return 0;
  }

  /**
   * MÉTODO HELPER: Obtener hoteles únicos
   */
  get uniqueHotels(): IHotelResponse[] {
    const hotelMap = new Map<number, IHotelResponse>();
    
    this.hotelsForThisDay.forEach(info => {
      if (!hotelMap.has(info.hotel.id)) {
        hotelMap.set(info.hotel.id, info.hotel);
      }
    });
    
    return Array.from(hotelMap.values());
  }

  /**
   * MÉTODO HELPER: Verificar si hay datos
   */
  get hasHotels(): boolean {
    return this.hotelsForThisDay.length > 0;
  }

  /**
   * MÉTODO HELPER: Contar departure hotels por hotel
   */
  getDepartureHotelsCountForHotel(hotelId: number): number {
    return this.hotelsForThisDay.filter(info => info.hotel.id === hotelId).length;
  }

  /**
   * MÉTODO HELPER: Obtener departure hotel IDs para un hotel específico
   */
  getDepartureHotelIdsForHotel(hotelId: number): number[] {
    return this.hotelsForThisDay
      .filter(info => info.hotel.id === hotelId)
      .map(info => info.departureHotelId);
  }
}