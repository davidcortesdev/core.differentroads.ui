import { Component, Input, OnDestroy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import {
  TourService,
  Tour as TourNetTour,
} from '../../../../core/services/tour/tour.service';
import {
  CMSTourService,
  ICMSTourResponse,
} from '../../../../core/services/cms/cms-tour.service';
import {
  catchError,
  Observable,
  of,
  Subject,
  takeUntil,
  map,
  concatMap,
  scan,
  forkJoin,
} from 'rxjs';
import { TourDataV2 } from '../../../../shared/components/tour-card-v2/tour-card-v2.model';

// Servicios para filtros por tag y ubicación
import { TourTagService } from '../../../../core/services/tag/tour-tag.service';

// Servicios para fechas y tags
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../core/services/departure/departure.service';
import {
  ItineraryService,
  IItineraryResponse,
  ItineraryFilters,
} from '../../../../core/services/itinerary/itinerary.service';
import {
  ItineraryDayService,
  IItineraryDayResponse,
} from '../../../../core/services/itinerary/itinerary-day/itinerary-day.service';

@Component({
  selector: 'app-tour-grid-v2',
  standalone: false,
  templateUrl: './tour-grid-v2.component.html',
  styleUrls: ['./tour-grid-v2.component.scss'],
})
export class TourGridV2Component implements OnInit, OnDestroy, OnChanges {
  /**
   * Lista de IDs de tours a mostrar en el grid
   */
  @Input() tourIds: number[] = [];

  /**
   * ID para Google Analytics (item_list_id)
   */
  @Input() itemListId: string = 'tour_grid';

  /**
   * Nombre para Google Analytics (item_list_name)
   */
  @Input() itemListName: string = 'Grid de tours';

  /**
   * Mostrar precios de Scalapay en las tarjetas
   */
  @Input() showScalapayPrice: boolean = false;

  /**
   * Número máximo de tours a mostrar
   */
  @Input() maxToursToShow?: number;

  tours: TourDataV2[] = [];
  isLoading: boolean = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private readonly tourService: TourService,
    private readonly cmsTourService: CMSTourService,
    private readonly tourTagService: TourTagService,
    private readonly departureService: DepartureService,
    private readonly itineraryService: ItineraryService,
    private readonly itineraryDayService: ItineraryDayService
  ) {}

  ngOnInit(): void {
    this.loadTours();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambian los IDs de tours, recargar
    if (changes['tourIds'] && !changes['tourIds'].firstChange) {
      this.loadTours();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los tours a partir de los IDs proporcionados
   */
  private loadTours(): void {
    if (!this.tourIds || this.tourIds.length === 0) {
      this.tours = [];
      return;
    }

    // Aplicar límite si está definido
    const tourIdsToLoad = this.maxToursToShow 
      ? this.tourIds.slice(0, this.maxToursToShow)
      : this.tourIds;

    // Convertir IDs a strings
    const tourIdsAsStrings = tourIdsToLoad.map((id) => id.toString());
    
    this.isLoading = true;
    this.tours = [];

    // Cargar tours secuencialmente y mostrarlos a medida que llegan
    of(...tourIdsAsStrings)
      .pipe(
        concatMap((id: string) => {
          // Combinar datos del TourNetService, CMSTourService y datos adicionales
          return forkJoin({
            tourData: this.tourService.getTourById(Number(id)),
            cmsData: this.cmsTourService.getAllTours({ tourId: Number(id) }),
            additionalData: this.getAdditionalTourData(Number(id)),
          }).pipe(
            catchError((error: Error) => {
              console.error(
                `❌ Error loading tour with ID ${id}:`,
                error
              );
              return of(null);
            }),
            map(
              (
                combinedData: {
                  tourData: TourNetTour;
                  cmsData: ICMSTourResponse[];
                  additionalData: {
                    departures: IDepartureResponse[];
                    tags: string[];
                    itineraryDays: IItineraryDayResponse[];
                  };
                } | null
              ): TourDataV2 | null => {
                if (!combinedData) return null;

                return this.mapToTourDataV2(combinedData);
              }
            )
          );
        }),
        // Acumular tours a medida que llegan
        scan((acc: TourDataV2[], tour: TourDataV2 | null) => {
          if (tour) {
            return [...acc, tour];
          }
          return acc;
        }, [] as TourDataV2[]),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (accumulatedTours: TourDataV2[]) => {
          this.tours = accumulatedTours;
        },
        complete: () => {
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  /**
   * Obtiene datos adicionales del tour (departures, tags, días de itinerario)
   */
  private getAdditionalTourData(tourId: number): Observable<{
    departures: IDepartureResponse[];
    tags: string[];
    itineraryDays: IItineraryDayResponse[];
  }> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    // Obtener itinerarios del tour para luego obtener departures
    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      concatMap((itineraries: IItineraryResponse[]) => {
        if (itineraries.length === 0) {
          return of({
            departures: [],
            tags: [],
            itineraryDays: [],
          });
        }

        // Obtener departures de todos los itinerarios
        const departureRequests = itineraries.map((itinerary) =>
          this.departureService.getByItinerary(itinerary.id, false).pipe(
            catchError((error) => {
              console.error(
                `❌ Error obteniendo departures para itinerary ${itinerary.id}:`,
                error
              );
              return of([]);
            })
          )
        );

        return forkJoin(departureRequests).pipe(
          concatMap((departureArrays: IDepartureResponse[][]) => {
            const allDepartures = departureArrays.flat();

            // Obtener días de itinerario del primer itinerario disponible
            const itineraryDaysRequest =
              itineraries.length > 0
                ? this.itineraryDayService
                    .getAll({ itineraryId: itineraries[0].id })
                    .pipe(
                      catchError((error) => {
                        console.error(
                          `❌ Error obteniendo días de itinerario para itinerary ${itineraries[0].id}:`,
                          error
                        );
                        return of([]);
                      })
                    )
                : of([]);

            // Obtener tags del tour
            const tagRequest = this.tourTagService.getAll({ tourId }).pipe(
              map((tourTags) => {
                return [];
              }),
              catchError((error) => {
                console.error(
                  `❌ Error obteniendo tags para tour ${tourId}:`,
                  error
                );
                return of([]);
              })
            );

            return forkJoin([tagRequest, itineraryDaysRequest]).pipe(
              map(([tags, itineraryDays]) => {
                return {
                  departures: allDepartures,
                  tags: tags as string[],
                  itineraryDays: itineraryDays as IItineraryDayResponse[],
                };
              })
            );
          })
        );
      }),
      catchError((error) => {
        console.error(
          `❌ Error obteniendo datos adicionales para tour ${tourId}:`,
          error
        );
        return of({
          departures: [],
          tags: [],
          itineraryDays: [],
        });
      })
    );
  }

  /**
   * Mapea los datos combinados a TourDataV2
   */
  private mapToTourDataV2(combinedData: {
    tourData: TourNetTour;
    cmsData: ICMSTourResponse[];
    additionalData: {
      departures: IDepartureResponse[];
      tags: string[];
      itineraryDays: IItineraryDayResponse[];
    };
  }): TourDataV2 {
    const tour = combinedData.tourData;
    const cmsArray = combinedData.cmsData;
    const cms = cmsArray && cmsArray.length > 0 ? cmsArray[0] : null;
    const additional = combinedData.additionalData;

    // Obtener precio: Usar minPrice del TourNetService
    let tourPrice = tour.minPrice || 0;

    // Obtener fechas: Extraer fechas de los departures
    const availableMonths: string[] = [];
    const departureDates: string[] = [];
    let nextDepartureDate: string | undefined;

    if (additional.departures && additional.departures.length > 0) {
      // Ordenar departures por fecha
      const sortedDepartures = additional.departures
        .filter((departure) => departure.departureDate)
        .sort(
          (a, b) =>
            new Date(a.departureDate!).getTime() -
            new Date(b.departureDate!).getTime()
        );

      sortedDepartures.forEach((departure: IDepartureResponse) => {
        if (departure.departureDate) {
          const date = new Date(departure.departureDate);
          const month = date
            .toLocaleDateString('es-ES', { month: 'short' })
            .toUpperCase();
          if (!availableMonths.includes(month)) {
            availableMonths.push(month);
          }
          departureDates.push(departure.departureDate);
        }
      });

      // Obtener la próxima fecha de departure
      const today = new Date();
      const futureDepartures = sortedDepartures.filter(
        (departure) =>
          departure.departureDate &&
          new Date(departure.departureDate) >= today
      );

      if (futureDepartures.length > 0) {
        nextDepartureDate = futureDepartures[0].departureDate!;
      }
    }

    // Obtener tag: Usar el primer tag disponible
    const tourTag =
      additional.tags && additional.tags.length > 0
        ? additional.tags[0]
        : '';

    // Obtener días de itinerario: Contar los días disponibles
    const itineraryDaysCount = additional.itineraryDays
      ? additional.itineraryDays.length
      : 0;

    // Crear texto de días: Formato "Colombia: en 10 días" (línea superior)
    const countryName = tour.name ? tour.name.split(':')[0].trim() : '';
    const itineraryDaysText =
      itineraryDaysCount > 0 && countryName
        ? `${countryName}: en ${itineraryDaysCount} días`
        : '';

    // Aplicar imagen como en TOUR-OVERVIEW-V2
    const imageUrl = cms?.imageUrl || '';

    return {
      id: tour.id,
      imageUrl: imageUrl,
      title: tour.name || '',
      description: '',
      rating: 5,
      tag: tourTag,
      price: tourPrice,
      availableMonths: availableMonths,
      departureDates: departureDates,
      nextDepartureDate: nextDepartureDate,
      itineraryDaysCount: itineraryDaysCount,
      itineraryDaysText: itineraryDaysText,
      isByDr: true,
      webSlug:
        tour.slug ||
        tour.name?.toLowerCase().replace(/\s+/g, '-') ||
        '',
      tripType: [],
      externalID: tour.tkId || '',
      continent: '',
      country: '',
    };
  }
}
