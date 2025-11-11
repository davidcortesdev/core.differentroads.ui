import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, forkJoin, of, Observable, switchMap, map, catchError, take } from 'rxjs';

import { HomeSectionConfigurationService, IHomeSectionConfigurationResponse, } from '../../core/services/home/home-section-configuration.service';
import { HomeSectionTourFilterService, IHomeSectionTourFilterResponse } from '../../core/services/home/home-section-tour-filter.service';
import { Title } from '@angular/platform-browser';
import { AuthenticateService } from '../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../core/services/users/usersNet.service';
import { TourTagService } from '../../core/services/tag/tour-tag.service';
import { TagService } from '../../core/services/tag/tag.service';
import { TripTypeService } from '../../core/services/trip-type/trip-type.service';
import { TourLocationService } from '../../core/services/tour/tour-location.service';
import { TourService, Tour as TourNetTour } from '../../core/services/tour/tour.service';
import { CMSTourService, ICMSTourResponse } from '../../core/services/cms/cms-tour.service';
import { AnalyticsService } from '../../core/services/analytics/analytics.service';
import { TourDataV2 } from '../../shared/components/tour-card-v2/tour-card-v2.model';
import { DepartureService, IDepartureResponse } from '../../core/services/departure/departure.service';
import { ItineraryService, IItineraryResponse, ItineraryFilters } from '../../core/services/itinerary/itinerary.service';
import { ItineraryDayService, IItineraryDayResponse } from '../../core/services/itinerary/itinerary-day/itinerary-day.service';
import { LocationNetService, Location } from '../../core/services/locations/locationNet.service';
import { ReviewsService } from '../../core/services/reviews/reviews.service';

@Component({
  selector: 'app-home-v2',
  standalone: false,
  templateUrl: './home-v2.component.html',
  styleUrls: ['./home-v2.component.scss'],
})
export class HomeV2Component implements OnInit, OnDestroy {
  // Configuraciones ordenadas globalmente por displayOrder
  orderedConfigurations: IHomeSectionConfigurationResponse[] = [];

  // Estado de carga
  isLoading = true;
  hasError = false;

  // Control simple: solo trackear qué listas ya dispararon el evento
  private trackedListIds = new Set<string>();
  private isTrackingInProgress = false;

  private destroy$ = new Subject<void>();

  constructor(
    private titleService: Title,
    private homeSectionConfigurationService: HomeSectionConfigurationService,
    private homeSectionTourFilterService: HomeSectionTourFilterService,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private tourTagService: TourTagService,
    private tagService: TagService,
    private tripTypeService: TripTypeService,
    private tourLocationService: TourLocationService,
    private tourService: TourService,
    private cmsTourService: CMSTourService,
    private analyticsService: AnalyticsService,
    private departureService: DepartureService,
    private itineraryService: ItineraryService,
    private itineraryDayService: ItineraryDayService,
    private locationNetService: LocationNetService,
    private reviewsService: ReviewsService
  ) {}

  async ngOnInit() {
    
    this.titleService.setTitle('Different Roads - Viajes y Experiencias Únicas');
    this.loadAllHomeSections();
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      console.log('✅ Detectado callback de OAuth en App Component');
      await this.handleOAuthCallback();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async handleOAuthCallback(): Promise<void> {
    try {
      // Procesar la autenticación
      await this.authService.handleAuthRedirect();
      
      console.log('✅ handleAuthRedirect completado');
      
      // Obtener atributos del usuario
      this.authService.getUserAttributes().subscribe({
        next: async (attributes) => {
          console.log('✅ Atributos obtenidos:', attributes);
          
          const username = this.authService.getCurrentUsername();
          const cognitoId = attributes.sub;
          const email = attributes.email;
          
          if (!cognitoId || !email) {
            console.error('❌ Datos incompletos');
            return;
          }
          
          console.log('🔍 Verificando usuario en API...');
          
          // Buscar por Cognito ID
          this.usersNetService.getUsersByCognitoId(cognitoId).subscribe({
            next: (users) => {
              if (users && users.length > 0) {
                console.log('✅ Usuario encontrado');
                // Limpiar URL y navegar
                this.cleanUrlAndNavigate();
              } else {
                // Buscar por email
                this.usersNetService.getUsersByEmail(email).subscribe({
                  next: (usersByEmail) => {
                    if (usersByEmail && usersByEmail.length > 0) {
                      console.log('✅ Usuario encontrado por email, actualizando...');
                      // Actualizar con Cognito ID
                      this.usersNetService.updateUser(usersByEmail[0].id, {
                        cognitoId: cognitoId,
                        name: usersByEmail[0].name ?? '',
                        email: usersByEmail[0].email ?? ''
                      }).subscribe(() => {
                        this.cleanUrlAndNavigate();
                      });
                    } else {
                      console.log('🆕 Creando nuevo usuario...');
                      // Crear usuario
                      this.usersNetService.createUser({
                        cognitoId: cognitoId,
                        name: email,
                        email: email,
                        hasWebAccess: true,
                        hasMiddleAccess: false
                      }).subscribe(() => {
                        this.cleanUrlAndNavigate();
                      });
                    }
                  }
                });
              }
            }
          });
        },
        error: (error) => {
          console.error('❌ Error obteniendo atributos:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error procesando callback:', error);
    }
  }

  private cleanUrlAndNavigate(): void {
    // Limpiar URL (quitar code y state)
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Ya estás en la página correcta, solo limpia la URL
    console.log('✅ Proceso completado');
  }
  private loadAllHomeSections(): void {
    this.isLoading = true;
    this.hasError = false;

    // Limpiar tracking previo al cargar nuevas secciones
    this.trackedListIds.clear();
    this.isTrackingInProgress = false;
    this.analyticsService.clearTrackedListIds();

    // Cargar todas las configuraciones activas ordenadas
    this.homeSectionConfigurationService
      .getActiveOrdered()
      .pipe(
        take(1), // Solo tomar el primer valor para evitar múltiples emisiones
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (configurations) => {
          this.distributeConfigurationsBySection(configurations);
          this.isLoading = false;
          // Disparar eventos view_item_list para todas las secciones con tours
          // Solo se ejecuta una vez cuando se cargan las configuraciones
          this.trackViewItemListForAllSections();
        },
        error: (error) => {
          console.error('Error loading home configurations:', error);
          this.hasError = true;
          this.isLoading = false;
        },
      });
  }

  private distributeConfigurationsBySection(
    configurations: IHomeSectionConfigurationResponse[]
  ): void {
    // Ordenar configuraciones por displayOrder y almacenar globalmente
    this.orderedConfigurations = configurations.sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
  }

  // Método para obtener la configuración del banner (siempre la primera)
  getBannerConfiguration(): IHomeSectionConfigurationResponse | null {
    return (
      this.orderedConfigurations.find((config) => config.homeSectionId === 1) ||
      null
    );
  }

  // Método para obtener configuraciones ordenadas excluyendo el banner
  getOrderedConfigurationsExcludingBanner(): IHomeSectionConfigurationResponse[] {
    return this.orderedConfigurations.filter(
      (config) => config.homeSectionId !== 1
    );
  }

  // Método para determinar qué componente renderizar según el homeSectionId
  getComponentType(homeSectionId: number): string {
    const componentMap: { [key: number]: string } = {
      1: 'banner', // app-hero-section-v2
      2: 'tour-carousel', // app-tour-carrussel-v2
      3: 'tour-grid', // app-carousel-section-v2
      4: 'fullscreen-cards', // app-full-card-section-v2
      5: 'mixed-section', // app-carousel-section-v2
      6: 'traveler-section', // app-community-section-v2
      7: 'reviews-section', // app-reviews-section-v2
      8: 'featured-section', // app-highlight-section-v2
      10: 'partners-section', // app-partners-section-v2
      11: 'publicity-section', // app-publicity-section-v2
    };
    return componentMap[homeSectionId] || 'unknown';
  }

  // Método para obtener el nombre de la sección por ID
  getSectionName(sectionId: number): string {
    const sectionNames: { [key: number]: string } = {
      1: 'Banner',
      2: 'Carrusel de Tours',
      3: 'Lista de Tours en Cuadrícula',
      4: 'Cards a Pantalla Completa',
      5: 'Sección Mixta',
      6: 'Sección de Viajeros',
      7: 'Sección de Reviews',
      8: 'Sección Destacada',
      10: 'Carrusel de Colaboradores',
      11: 'Sección de Publicidad',
    };
    return sectionNames[sectionId] || 'Sección desconocida';
  }

  /**
   * Dispara eventos view_item_list para todas las secciones que contienen tours
   * Solo dispara un evento por lista cuando se carga
   */
  private trackViewItemListForAllSections(): void {
    // Evitar ejecución múltiple
    if (this.isTrackingInProgress) {
      return;
    }

    // Filtrar solo las secciones que contienen tours (tour-carousel ID:2 y tour-grid ID:3)
    const tourSections = this.orderedConfigurations.filter(
      (config) => config.homeSectionId === 2 || config.homeSectionId === 3
    );

    if (tourSections.length === 0) {
      return;
    }

    // Marcar como en progreso inmediatamente
    this.isTrackingInProgress = true;

    // Para cada sección, obtener sus tours y disparar el evento solo una vez
    tourSections.forEach((config) => {
      const itemListId = config.id.toString();
      
      // Verificar tanto en componente como en servicio
      if (this.trackedListIds.has(itemListId) || this.analyticsService.isListTracked(itemListId)) {
        return;
      }

      // Marcar como trackeada ANTES de cargar para evitar race conditions
      this.trackedListIds.add(itemListId);

      this.loadToursForSection(config).pipe(
        take(1), // Solo tomar el primer valor
        takeUntil(this.destroy$)
      ).subscribe({
        next: (tours) => {
          // Verificar nuevamente antes de disparar
          if (this.analyticsService.isListTracked(itemListId)) {
            this.trackedListIds.delete(itemListId);
            return;
          }

          if (tours && tours.length > 0) {
            this.trackViewItemListForSection(config, tours);
          } else {
            // Si no hay tours, remover del tracking para permitir reintento
            this.trackedListIds.delete(itemListId);
          }
        },
        error: (error) => {
          console.error(`[Analytics] Error cargando tours para sección ${config.id}:`, error);
          this.trackedListIds.delete(itemListId);
        }
      });
    });
  }

  /**
   * Carga los tours de una sección específica
   */
  private loadToursForSection(
    config: IHomeSectionConfigurationResponse
  ): Observable<TourDataV2[]> {
    // Obtener los filtros de la configuración
    return this.homeSectionTourFilterService
      .getByConfigurationOrdered(config.id, true)
      .pipe(
        switchMap((filters) => {
          if (filters.length === 0) {
            return of([]);
          }
          // Obtener los IDs de tours de todos los filtros
          return this.getTourIdsFromFilters(filters).pipe(
            switchMap((tourIds) => {
              if (tourIds.length === 0) {
                return of([]);
              }
              // Limitar por maxToursToShow si está definido
              const limitedTourIds = config.maxToursToShow
                ? tourIds.slice(0, config.maxToursToShow)
                : tourIds;
              // Cargar los tours completos
              return this.loadToursFromIds(limitedTourIds);
            })
          );
        }),
        catchError((error) => {
          console.error(`Error cargando tours para configuración ${config.id}:`, error);
          return of([]);
        })
      );
  }

  /**
   * Obtiene los IDs de tours desde los filtros
   */
  private getTourIdsFromFilters(
    filters: IHomeSectionTourFilterResponse[]
  ): Observable<number[]> {
    const filterObservables = filters.map((filter) =>
      this.getTourIdsFromFilter(filter)
    );

    return forkJoin(filterObservables).pipe(
      map((tourIdArrays: number[][]) => {
        const allTourIds = tourIdArrays.flat();
        return [...new Set(allTourIds)]; // Eliminar duplicados
      }),
      catchError((error) => {
        console.error('Error obteniendo tour IDs desde filtros:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene los IDs de tours de un filtro específico
   */
  private getTourIdsFromFilter(
    filter: IHomeSectionTourFilterResponse
  ): Observable<number[]> {
    switch (filter.filterType) {
      case 'tag':
        return this.tourTagService.getToursByTags([filter.tagId!]).pipe(
          catchError((error) => {
            console.error(`Error obteniendo tours por tag ${filter.tagId}:`, error);
            return of([]);
          })
        );

      case 'location':
        return this.tourLocationService.getToursByLocations([filter.locationId!]).pipe(
          catchError((error) => {
            console.error(`Error obteniendo tours por location ${filter.locationId}:`, error);
            return of([]);
          })
        );

      case 'specific_tours':
        try {
          const tourIds = this.homeSectionTourFilterService.parseSpecificTourIds(
            filter.specificTourIds!
          );
          return of(tourIds);
        } catch (error) {
          console.error('Error parseando specific tour IDs:', error);
          return of([]);
        }

      default:
        console.warn(`Tipo de filtro desconocido: ${filter.filterType}`);
        return of([]);
    }
  }

  /**
   * Carga los tours completos desde sus IDs
   * Usa forkJoin para cargar todos en paralelo (mejor para analytics)
   */
  private loadToursFromIds(tourIds: number[]): Observable<TourDataV2[]> {
    if (tourIds.length === 0) {
      return of([]);
    }

    // Crear observables para cada tour
    const tourObservables = tourIds.map((id) => {
      return this.tourService.getTourById(id).pipe(
        switchMap((tourData) => {
          // Obtener tripType si existe tripTypeId
          const tripTypeObservable = tourData.tripTypeId
            ? this.tripTypeService.getById(tourData.tripTypeId).pipe(
                map((tripType) => [tripType.name]),
                catchError(() => of([]))
              )
            : of([]);

          return forkJoin({
            tourData: of(tourData),
            cmsData: this.cmsTourService.getAllTours({ tourId: id }),
            additionalData: this.getAdditionalTourData(id),
            tripType: tripTypeObservable,
            rating: this.reviewsService.getAverageRating({ tourId: id }).pipe(
              map((ratingResponse) => {
                // Si hay rating, devolverlo tal cual (sin redondeos)
                // Si no hay rating o es 0, devolver null para que formatRating devuelva ''
                const avgRating = ratingResponse?.averageRating;
                return avgRating && avgRating > 0 ? avgRating : null;
              }),
              catchError(() => of(null))
            ),
          });
        }),
        catchError((error: Error) => {
          console.error(`Error cargando tour ${id}:`, error);
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
                continent?: string;
                country?: string;
              };
              tripType: string[];
              rating: number | null;
            } | null
          ): TourDataV2 | null => {
            if (!combinedData) return null;

            const tour = combinedData.tourData;
            const cmsArray = combinedData.cmsData;
            const cms = cmsArray && cmsArray.length > 0 ? cmsArray[0] : null;
            const additional = combinedData.additionalData;

            let tourPrice = tour.minPrice || 0;

            const availableMonths: string[] = [];
            const departureDates: string[] = [];
            let nextDepartureDate: string | undefined;

            if (additional.departures && additional.departures.length > 0) {
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

            // El tag viene como array de strings, tomar el primero
            const tourTag =
              additional.tags && additional.tags.length > 0 && typeof additional.tags[0] === 'string'
                ? additional.tags[0]
                : '';

            const itineraryDaysCount = additional.itineraryDays
              ? additional.itineraryDays.length
              : 0;

            const countryName = tour.name
              ? tour.name.split(':')[0].trim()
              : '';
            const itineraryDaysText =
              itineraryDaysCount > 0 && countryName
                ? `${countryName}: en ${itineraryDaysCount} días`
                : '';

            const imageUrl = cms?.imageUrl || '';

            // Usar el rating tal cual, sin redondeos
            // Si es null, usar undefined para que formatRating devuelva ''
            const ratingValue = combinedData.rating !== null ? combinedData.rating : undefined;

            return {
              id: tour.id,
              imageUrl: imageUrl,
              title: tour.name || '',
              description: '',
              rating: ratingValue,
              tag: tourTag,
              price: tourPrice,
              availableMonths: availableMonths,
              nextDepartureDate: nextDepartureDate,
              itineraryDaysCount: itineraryDaysCount,
              itineraryDaysText: itineraryDaysText,
              isByDr: tour.productStyleId === 1,
              webSlug:
                tour.slug ||
                tour.name?.toLowerCase().replace(/\s+/g, '-') ||
                '',
              tripType: combinedData.tripType || [],
              externalID: tour.tkId || '',
              continent: additional.continent || '',
              country: additional.country || '',
              productStyleId: tour.productStyleId,
            };
          }
        )
      );
    });

    // Cargar todos los tours en paralelo y filtrar los null
    return forkJoin(tourObservables).pipe(
      map((tours: (TourDataV2 | null)[]) => {
        return tours.filter((tour): tour is TourDataV2 => tour !== null);
      }),
      catchError((error) => {
        console.error('Error cargando tours:', error);
        return of([]);
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Obtiene datos adicionales del tour (fechas, tags, días)
   */
  private getAdditionalTourData(tourId: number): Observable<{
    departures: IDepartureResponse[];
    tags: string[];
    itineraryDays: IItineraryDayResponse[];
    continent?: string;
    country?: string;
  }> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      switchMap((itineraries: IItineraryResponse[]) => {
        if (itineraries.length === 0) {
          return of({
            departures: [],
            tags: [],
            itineraryDays: [],
          });
        }

        const departureRequests = itineraries.map((itinerary) =>
          this.departureService.getByItinerary(itinerary.id, false).pipe(
            catchError(() => of([]))
          )
        );

        return forkJoin(departureRequests).pipe(
          switchMap((departureArrays: IDepartureResponse[][]) => {
            const allDepartures = departureArrays.flat();

            const itineraryDaysRequest =
              itineraries.length > 0
                ? this.itineraryDayService
                    .getAll({ itineraryId: itineraries[0].id })
                    .pipe(catchError(() => of([])))
                : of([]);

            const tagRequest = this.tourTagService
              .getByTourAndType(tourId, 'VISIBLE')
              .pipe(
                switchMap((tourTags) => {
                  if (tourTags.length > 0 && tourTags[0]?.tagId && tourTags[0].tagId > 0) {
                    const firstTagId = tourTags[0].tagId;
                    return this.tagService.getById(firstTagId).pipe(
                      map((tag) => tag?.name && tag.name.trim().length > 0 ? [tag.name.trim()] : []),
                      catchError(() => of([]))
                    );
                  }
                  return of([]);
                }),
                catchError(() => of([]))
              );

            // Obtener continent y country usando TourLocationService
            const countryLocationRequest = this.tourLocationService
              .getByTourAndType(tourId, 'COUNTRY')
              .pipe(
                map((response) => Array.isArray(response) ? response : response ? [response] : []),
                catchError(() => of([]))
              );

            const continentLocationRequest = this.tourLocationService
              .getByTourAndType(tourId, 'CONTINENT')
              .pipe(
                map((response) => Array.isArray(response) ? response : response ? [response] : []),
                catchError(() => of([]))
              );

            return forkJoin([tagRequest, itineraryDaysRequest, countryLocationRequest, continentLocationRequest]).pipe(
              switchMap(([tags, itineraryDays, countryLocations, continentLocations]) => {
                const validCountryLocations = countryLocations.filter(
                  (loc: any) => loc && loc.id && loc.locationId
                );
                const validContinentLocations = continentLocations.filter(
                  (loc: any) => loc && loc.id && loc.locationId
                );

                const allLocationIds = [
                  ...validCountryLocations.map((tl: any) => tl.locationId),
                  ...validContinentLocations.map((tl: any) => tl.locationId),
                ];
                const uniqueLocationIds = [...new Set(allLocationIds)];

                if (uniqueLocationIds.length === 0) {
                  return of({
                    departures: allDepartures,
                    tags: tags as string[],
                    itineraryDays: itineraryDays as IItineraryDayResponse[],
                    continent: '',
                    country: '',
                  });
                }

                return this.locationNetService.getLocationsByIds(uniqueLocationIds).pipe(
                  map((locations: Location[]) => {
                    const locationsMap = new Map<number, Location>();
                    locations.forEach((location) => {
                      locationsMap.set(location.id, location);
                    });

                    const countries = validCountryLocations
                      .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                      .map((tl: any) => locationsMap.get(tl.locationId)?.name)
                      .filter((name) => name) as string[];

                    const continents = validContinentLocations
                      .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                      .map((tl: any) => locationsMap.get(tl.locationId)?.name)
                      .filter((name) => name) as string[];

                    return {
                      departures: allDepartures,
                      tags: tags as string[],
                      itineraryDays: itineraryDays as IItineraryDayResponse[],
                      continent: continents.join(', ') || '',
                      country: countries.join(', ') || '',
                    };
                  }),
                  catchError(() => {
                    return of({
                      departures: allDepartures,
                      tags: tags as string[],
                      itineraryDays: itineraryDays as IItineraryDayResponse[],
                      continent: '',
                      country: '',
                    });
                  })
                );
              })
            );
          })
        );
      }),
      catchError(() => {
        return of({
          departures: [],
          tags: [],
          itineraryDays: [],
        });
      })
    );
  }

  /**
   * Dispara el evento view_item_list para una sección específica
   */
  private trackViewItemListForSection(
    config: IHomeSectionConfigurationResponse,
    tours: TourDataV2[]
  ): void {
    if (!tours || tours.length === 0) {
      return;
    }

    const itemListId = config.id.toString();
    const itemListName = config.title || this.getSectionName(config.homeSectionId);

    // Disparar el evento directamente
    this.analyticsService.trackViewItemListFromTours(
      tours,
      itemListId,
      itemListName
    );
  }
}
