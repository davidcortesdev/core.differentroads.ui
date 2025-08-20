import {
  Component,
  Input,
  Output,
  OnInit,
  EventEmitter,
  HostListener,
  ElementRef,
  Renderer2,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  TourNetService,
  Tour,
} from '../../../../core/services/tourNet.service';
import {
  TourLocationService,
  ITourLocationResponse,
} from '../../../../core/services/tour/tour-location.service';
import {
  LocationNetService,
  Location,
} from '../../../../core/services/locations/locationNet.service';
import {
  ReservationService,
  ReservationCreate,
  IReservationResponse,
} from '../../../../core/services/reservation/reservation.service';
import {
  ReservationTravelerService,
  ReservationTravelerCreate,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerActivityService,
  ReservationTravelerActivityCreate,
} from '../../../../core/services/reservation/reservation-traveler-activity.service';
// ✅ SOLO AGREGANDO: Servicio para paquetes
import {
  ReservationTravelerActivityPackService,
  ReservationTravelerActivityPackCreate,
} from '../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import { Subscription, forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ActivityHighlight } from '../../../../shared/components/activity-card/activity-card.component';
import { environment } from '../../../../../environments/environment';
import { AuthenticateService } from '../../../../core/services/auth-service.service';
import { UsersNetService } from '../../../../core/services/usersNet.service';

// ✅ INTERFACES para tipado fuerte
interface PassengersData {
  adults: number;
  children: number;
  babies: number;
}

interface AgeGroupCategory {
  id: number | null;
  lowerAge: number | null;
  upperAge: number | null;
}

interface AgeGroupCategories {
  adults: AgeGroupCategory;
  children: AgeGroupCategory;
  babies: AgeGroupCategory;
}

// ✅ INTERFACE: Para análisis de tipos de actividades
interface ActivityTypesAnalysis {
  hasAct: boolean;
  hasPack: boolean;
  actCount: number;
  packCount: number;
}

// ✅ INTERFACE para resultados de creación de actividades
interface ActivityCreationResult {
  success: boolean;
  activity: ActivityHighlight;
  result?: any;
  error?: any;
}

@Component({
  selector: 'app-tour-header-v2',
  standalone: false,
  templateUrl: './tour-header-v2.component.html',
  styleUrls: ['./tour-header-v2.component.scss'],
})
export class TourHeaderV2Component
  implements OnInit, AfterViewInit, OnDestroy, OnChanges
{
  @Input() tourId: number | undefined;
  @Input() totalPrice: number = 0;
  @Input() selectedCity: string = '';
  @Input() selectedDeparture: any = null;
  @Input() totalPassengers: number = 1;
  @Input() selectedActivities: ActivityHighlight[] = [];
  @Input() showActivitiesStatus: boolean = false;
  @Input() passengersData: PassengersData = {
    adults: 1,
    children: 0,
    babies: 0,
  };
  @Input() ageGroupCategories: AgeGroupCategories = {
    adults: { id: null, lowerAge: null, upperAge: null },
    children: { id: null, lowerAge: null, upperAge: null },
    babies: { id: null, lowerAge: null, upperAge: null },
  };
  @Input() activityTypesAnalysis: ActivityTypesAnalysis = {
    hasAct: false,
    hasPack: false,
    actCount: 0,
    packCount: 0,
  };
  @Input() preview: boolean = false;
  // Tour data
  tour: Partial<Tour> = {};

  // Información geográfica
  country: string = '';
  continent: string = '';

  // Scroll effect
  private isScrolled = false;
  private headerHeight = 0;
  private subscriptions = new Subscription();

  // Estado para controlar el proceso de reservación
  isCreatingReservation = false;

  constructor(
    private tourNetService: TourNetService,
    private tourLocationService: TourLocationService,
    private locationNetService: LocationNetService,
    private reservationService: ReservationService,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    // ✅ SOLO AGREGANDO: Servicio para paquetes
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private el: ElementRef,
    private renderer: Renderer2,
    private router: Router,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService
  ) {}

  ngOnInit() {
    if (this.tourId) {
      this.loadTourData(this.tourId);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tourId'] && changes['tourId'].currentValue) {
      this.loadTourData(changes['tourId'].currentValue);
    }
  }

  ngAfterViewInit() {
    this.setHeaderHeight();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.handleScrollEffect();
  }

  get hasPrice(): boolean {
    return this.totalPriceWithActivities > 0;
  }

  get totalPriceWithActivities(): number {
    const activitiesTotal = this.selectedActivities
      .filter((activity) => activity.added)
      .reduce((sum, activity) => sum + (activity.price || 0), 0);

    return this.totalPrice + activitiesTotal;
  }

  get addedActivities(): ActivityHighlight[] {
    return this.selectedActivities.filter((activity) => activity.added);
  }

  get hasAddedActivities(): boolean {
    return this.addedActivities.length > 0;
  }

  get shouldShowActivitiesStatus(): boolean {
    return (
      this.showActivitiesStatus &&
      this.selectedDeparture &&
      this.selectedDeparture.departureDate
    );
  }

  // ✅ GETTER dinámico para texto de actividades
  get activitiesStatusText(): string {
    if (!this.hasAddedActivities) {
      return 'Sin actividades opcionales';
    }

    const analysis = this.activityTypesAnalysis;

    if (analysis.hasAct && analysis.hasPack) {
      return 'Con actividades opcionales y paquetes';
    }

    if (analysis.hasAct && !analysis.hasPack) {
      return 'Con actividades opcionales';
    }

    if (!analysis.hasAct && analysis.hasPack) {
      return 'Con paquete de actividades';
    }

    return 'Con actividades opcionales';
  }

  get activitiesDetailText(): string {
    if (!this.hasAddedActivities) {
      return '';
    }

    const analysis = this.activityTypesAnalysis;
    const parts: string[] = [];

    if (analysis.hasAct) {
      parts.push(
        `${analysis.actCount} actividad${analysis.actCount !== 1 ? 'es' : ''}`
      );
    }

    if (analysis.hasPack) {
      parts.push(
        `${analysis.packCount} paquete${analysis.packCount !== 1 ? 's' : ''}`
      );
    }

    return parts.join(' y ');
  }

  get formattedPrice(): string {
    if (this.totalPriceWithActivities <= 0) return '';

    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(this.totalPriceWithActivities);
  }

  get formattedFlights(): string {
    return this.selectedCity || '';
  }

  get formattedDepartureWithType(): string {
    if (!this.selectedDeparture || !this.selectedDeparture.departureDate)
      return '';

    try {
      const dateString = this.selectedDeparture.departureDate;
      const dateParts = dateString.split('-');

      if (dateParts.length !== 3) return dateString;

      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);

      const date = new Date(year, month, day);

      const formattedDate = date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
      });

      const isSingle = this.selectedDeparture.group
        ?.toLowerCase()
        .includes('single');

      if (isSingle) {
        return `${formattedDate} (S) - Single`;
      }

      return formattedDate;
    } catch {
      return this.selectedDeparture.departureDate;
    }
  }

  private loadTourData(tourId: number) {
    this.subscriptions.add(
      this.tourNetService.getTourById(tourId).subscribe({
        next: (tourData) => {
          this.tour = { ...tourData };
          this.loadCountryAndContinent(tourId);
        },
        error: (error) => {
          console.error('Error cargando tour:', error);
        },
      })
    );
  }

  private loadCountryAndContinent(tourId: number): void {
    this.subscriptions.add(
      forkJoin([
        this.tourLocationService.getByTourAndType(tourId, 'COUNTRY').pipe(
          map((response) =>
            Array.isArray(response) ? response : response ? [response] : []
          ),
          catchError((error) => {
            return of([]);
          })
        ),
        this.tourLocationService.getByTourAndType(tourId, 'CONTINENT').pipe(
          map((response) =>
            Array.isArray(response) ? response : response ? [response] : []
          ),
          catchError((error) => {
            return of([]);
          })
        ),
      ])
        .pipe(
          switchMap(([countryLocations, continentLocations]) => {
            const validCountryLocations = countryLocations.filter(
              (loc) => loc && loc.id && loc.locationId
            );
            const validContinentLocations = continentLocations.filter(
              (loc) => loc && loc.id && loc.locationId
            );

            const allLocationIds = [
              ...validCountryLocations.map((tl) => tl.locationId),
              ...validContinentLocations.map((tl) => tl.locationId),
            ];
            const uniqueLocationIds = [...new Set(allLocationIds)];

            if (uniqueLocationIds.length === 0) {
              return of({
                countryLocations: validCountryLocations,
                continentLocations: validContinentLocations,
                locations: [],
              });
            }

            return this.locationNetService
              .getLocationsByIds(uniqueLocationIds)
              .pipe(
                map((locations) => ({
                  countryLocations: validCountryLocations,
                  continentLocations: validContinentLocations,
                  locations,
                })),
                catchError((error) => {
                  return of({
                    countryLocations: validCountryLocations,
                    continentLocations: validContinentLocations,
                    locations: [],
                  });
                })
              );
          })
        )
        .subscribe(({ countryLocations, continentLocations, locations }) => {
          const locationsMap = new Map<number, Location>();
          locations.forEach((location) => {
            locationsMap.set(location.id, location);
          });

          const countries = countryLocations
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((tl) => locationsMap.get(tl.locationId)?.name)
            .filter((name) => name) as string[];

          const continents = continentLocations
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((tl) => locationsMap.get(tl.locationId)?.name)
            .filter((name) => name) as string[];

          this.country = countries.join(', ');
          this.continent = continents.join(', ');
        })
    );
  }

  private setHeaderHeight() {
    const headerElement = this.el.nativeElement.querySelector('.tour-header');
    if (headerElement) {
      this.headerHeight = headerElement.offsetHeight;
      document.documentElement.style.setProperty(
        '--header-height',
        `${this.headerHeight}px`
      );
    }
  }

  private handleScrollEffect() {
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    const headerElement = this.el.nativeElement.querySelector('.tour-header');

    if (!headerElement) return;

    const scrollThreshold = 100;

    if (scrollPosition > scrollThreshold && !this.isScrolled) {
      this.renderer.addClass(headerElement, 'scrolled');
      this.renderer.addClass(this.el.nativeElement, 'header-fixed');
      this.isScrolled = true;
    } else if (scrollPosition <= scrollThreshold && this.isScrolled) {
      this.renderer.removeClass(headerElement, 'scrolled');
      this.renderer.removeClass(this.el.nativeElement, 'header-fixed');
      this.isScrolled = false;
    }
  }

  onCountryClick(event: MouseEvent, fullCountryText: string): void {
    event.preventDefault();

    const clickedCountry = this.getClickedCountry(event, fullCountryText);
    if (clickedCountry) {
      this.router.navigate(['/tours'], {
        queryParams: {
          destination: clickedCountry,
        },
      });
    }
  }

  private getClickedCountry(
    event: MouseEvent,
    fullText: string
  ): string | null {
    const target = event.target as HTMLElement;
    const countries = fullText
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c);

    if (countries.length === 1) {
      return countries[0];
    }

    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    const tempElement = document.createElement('span');
    tempElement.style.visibility = 'hidden';
    tempElement.style.position = 'absolute';
    tempElement.style.fontSize = window.getComputedStyle(target).fontSize;
    tempElement.style.fontFamily = window.getComputedStyle(target).fontFamily;
    document.body.appendChild(tempElement);

    let currentX = 0;
    let clickedCountry: string | null = null;

    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      const separator = i < countries.length - 1 ? ', ' : '';
      const textToMeasure = country + separator;

      tempElement.textContent = textToMeasure;
      const textWidth = tempElement.offsetWidth;

      if (clickX >= currentX && clickX <= currentX + textWidth) {
        tempElement.textContent = country;
        const countryWidth = tempElement.offsetWidth;

        if (clickX <= currentX + countryWidth) {
          clickedCountry = country;
          break;
        }
      }

      currentX += textWidth;
    }

    document.body.removeChild(tempElement);
    return clickedCountry;
  }

  @Output() bookingClick = new EventEmitter<void>();

  // ✅ MÉTODO: Validar actividad
  private validateActivity(activity: ActivityHighlight): {
    isValid: boolean;
    error?: string;
  } {
    const activityId = parseInt(activity.id);

    if (isNaN(activityId) || activityId <= 0) {
      return {
        isValid: false,
        error: `ID de actividad inválido: ${activity.id}`,
      };
    }

    if (
      !activity.type ||
      (activity.type !== 'act' && activity.type !== 'pack')
    ) {
      return {
        isValid: false,
        error: `Tipo de actividad inválido: ${activity.type}`,
      };
    }

    return { isValid: true };
  }

  // ✅ MÉTODO: Crear actividad individual (sin cambios)
  private createTravelerActivity(
    travelerId: number,
    activity: ActivityHighlight
  ): Observable<ActivityCreationResult> {
    const validation = this.validateActivity(activity);

    if (!validation.isValid) {
      console.error(
        '❌ Booking - Actividad inválida:',
        validation.error,
        activity
      );
      return of({
        success: false,
        activity: activity,
        error: validation.error,
      });
    }

    const travelerActivityData: ReservationTravelerActivityCreate = {
      id: 0,
      reservationTravelerId: travelerId,
      activityId: parseInt(activity.id),
    };

    return this.reservationTravelerActivityService
      .create(travelerActivityData)
      .pipe(
        map((result) => {
          return {
            success: true,
            activity: activity,
            result: result,
          };
        }),
        catchError((error) => {
          console.error('❌ Booking - Error creando actividad individual:', {
            activityId: activity.id,
            activityTitle: activity.title,
            error: error,
          });

          return of({
            success: false,
            activity: activity,
            error: error,
          });
        })
      );
  }

  // ✅ MÉTODO NUEVO: Crear paquete de actividades
  private createTravelerActivityPack(
    travelerId: number,
    activity: ActivityHighlight
  ): Observable<ActivityCreationResult> {
    const validation = this.validateActivity(activity);

    if (!validation.isValid) {
      console.error(
        '❌ Booking - Paquete inválido:',
        validation.error,
        activity
      );
      return of({
        success: false,
        activity: activity,
        error: validation.error,
      });
    }

    const travelerActivityPackData: ReservationTravelerActivityPackCreate = {
      id: 0,
      reservationTravelerId: travelerId,
      activityPackId: parseInt(activity.id), // ✅ activityPackId para paquetes
    };

    return this.reservationTravelerActivityPackService
      .create(travelerActivityPackData)
      .pipe(
        map((result) => {
          return {
            success: true,
            activity: activity,
            result: result,
          };
        }),
        catchError((error) => {
          console.error('❌ Booking - Error creando paquete de actividades:', {
            activityPackId: activity.id,
            activityTitle: activity.title,
            error: error,
          });

          return of({
            success: false,
            activity: activity,
            error: error,
          });
        })
      );
  }

  // ✅ MÉTODO MODIFICADO: Procesar actividades usando servicios apropiados según tipo
  private processActivitiesForTravelers(travelers: any[]): Observable<{
    successful: number;
    failed: number;
    details: ActivityCreationResult[];
  }> {
    const addedActivities = this.addedActivities;

    if (addedActivities.length === 0) {
      return of({ successful: 0, failed: 0, details: [] });
    }

    const activityObservables: Observable<ActivityCreationResult>[] = [];

    // Crear observables para cada combinación traveler-actividad
    travelers.forEach((traveler: any) => {
      addedActivities.forEach((activity: ActivityHighlight) => {
        // ✅ USAR SERVICIO APROPIADO SEGÚN TIPO
        if (activity.type === 'act') {
          activityObservables.push(
            this.createTravelerActivity(traveler.id, activity)
          );
        } else if (activity.type === 'pack') {
          activityObservables.push(
            this.createTravelerActivityPack(traveler.id, activity)
          );
        }
      });
    });

    if (activityObservables.length === 0) {
      return of({ successful: 0, failed: 0, details: [] });
    }

    return forkJoin(activityObservables).pipe(
      map((results: ActivityCreationResult[]) => {
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        return { successful, failed, details: results };
      }),
      catchError((error) => {
        console.error('💥 Booking - Error fatal en procesamiento:', error);
        throw error;
      })
    );
  }

  onBookingClick(): void {
    if (!this.selectedDeparture || !this.selectedDeparture.id) {
      alert('Por favor, selecciona una fecha de salida antes de continuar.');
      return;
    }

    if (!this.tourId) {
      alert('Error: No se pudo identificar el tour.');
      return;
    }

    this.isCreatingReservation = true;

    // Obtener el ID del usuario logueado
    this.authService.getCognitoId().subscribe({
      next: (cognitoId) => {
        if (cognitoId) {
          // Buscar el usuario por Cognito ID para obtener su ID en la base de datos
          this.usersNetService.getUsersByCognitoId(cognitoId).subscribe({
            next: (users) => {
              let userId: number | null = null; // Valor por defecto si no se encuentra el usuario

              if (users && users.length > 0) {
                userId = users[0].id;
              }

              this.createReservation(userId);
            },
            error: (error) => {
              console.error('Error buscando usuario por Cognito ID:', error);
              this.createReservation(null); // Usar null en caso de error
            },
          });
        } else {
          this.createReservation(null);
        }
      },
      error: (error) => {
        console.error('Error obteniendo Cognito ID:', error);
        this.createReservation(null); // Usar null en caso de error
      },
    });
  }

  private createReservation(userId: number | null): void {
    const reservationData: ReservationCreate = {
      id: 0,
      tkId: '',
      reservationStatusId: 1,
      retailerId: environment.retaileriddefault,
      tourId: this.tourId!,
      departureId: this.selectedDeparture.id,
      userId: userId, // Usar el ID del usuario logueado o null
      totalPassengers: this.totalPassengers || 1,
      totalAmount: this.totalPriceWithActivities || 0,
      budgetAt: '',
      cartAt: new Date().toISOString(),
      abandonedAt: '',
      reservedAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.subscriptions.add(
      this.reservationService
        .create(reservationData)
        .pipe(
          switchMap((createdReservation: IReservationResponse) => {
            const travelerObservables = [];
            let travelerNumber = 1;

            // Crear travelers para adultos
            for (let i = 0; i < this.passengersData.adults; i++) {
              const isLeadTraveler = travelerNumber === 1;

              if (!this.ageGroupCategories.adults.id) {
                console.error('❌ No se encontró age group para adultos');
                alert(
                  'Error: No se pudo determinar el grupo de edad para adultos.'
                );
                this.isCreatingReservation = false;
                throw new Error('Age group for adults not found');
              }

              const travelerData: ReservationTravelerCreate = {
                id: 0,
                reservationId: createdReservation.id,
                travelerNumber: travelerNumber,
                isLeadTraveler: isLeadTraveler,
                tkId: '',
                ageGroupId: this.ageGroupCategories.adults.id,
              };

              travelerObservables.push(
                this.reservationTravelerService.create(travelerData)
              );
              travelerNumber++;
            }

            // Crear travelers para niños
            for (let i = 0; i < this.passengersData.children; i++) {
              if (!this.ageGroupCategories.children.id) {
                console.error('❌ No se encontró age group para niños');
                alert(
                  'Error: No se pudo determinar el grupo de edad para niños.'
                );
                this.isCreatingReservation = false;
                throw new Error('Age group for children not found');
              }

              const travelerData: ReservationTravelerCreate = {
                id: 0,
                reservationId: createdReservation.id,
                travelerNumber: travelerNumber,
                isLeadTraveler: false,
                tkId: '',
                ageGroupId: this.ageGroupCategories.children.id,
              };

              travelerObservables.push(
                this.reservationTravelerService.create(travelerData)
              );
              travelerNumber++;
            }

            // Crear travelers para bebés
            for (let i = 0; i < this.passengersData.babies; i++) {
              if (!this.ageGroupCategories.babies.id) {
                console.error('❌ No se encontró age group para bebés');
                alert(
                  'Error: No se pudo determinar el grupo de edad para bebés.'
                );
                this.isCreatingReservation = false;
                throw new Error('Age group for babies not found');
              }

              const travelerData: ReservationTravelerCreate = {
                id: 0,
                reservationId: createdReservation.id,
                travelerNumber: travelerNumber,
                isLeadTraveler: false,
                tkId: '',
                ageGroupId: this.ageGroupCategories.babies.id,
              };

              travelerObservables.push(
                this.reservationTravelerService.create(travelerData)
              );
              travelerNumber++;
            }

            if (travelerObservables.length === 0) {
              throw new Error('No travelers to create');
            }

            return forkJoin(travelerObservables).pipe(
              map((createdTravelers) => {
                return {
                  reservation: createdReservation,
                  travelers: createdTravelers,
                };
              })
            );
          }),
          // ✅ USAR MÉTODO MODIFICADO para servicios separados
          switchMap(({ reservation, travelers }) => {
            return this.processActivitiesForTravelers(travelers).pipe(
              map((activityResults) => ({
                reservation,
                travelers,
                activityResults,
              }))
            );
          })
        )
        .subscribe({
          next: ({ reservation, travelers, activityResults }) => {
            // ✅ MOSTRAR mensaje según los resultados
            if (activityResults.failed > 0) {
              const message =
                `Reservación creada exitosamente.\n\n` +
                `✅ ${activityResults.successful} actividad(es)/paquete(s) asignados correctamente\n` +
                `❌ ${activityResults.failed} no pudieron ser asignados\n\n` +
                `Puedes agregarlos manualmente desde el checkout.`;
              alert(message);
            }

            this.router.navigate(['/checkout-v2', reservation.id]);
          },
          error: (error) => {
            console.error('💥 Booking - Error fatal en el proceso:', {
              error: error,
              errorMessage: error.message,
              errorStatus: error.status,
            });

            let errorMessage =
              'Error al crear la reservación. Por favor, inténtalo de nuevo.';

            // ✅ MENSAJES DE ERROR MÁS ESPECÍFICOS
            if (error.status === 500) {
              errorMessage =
                'Error interno del servidor. Por favor, contacta al soporte técnico.';
            } else if (error.status === 400) {
              errorMessage =
                'Datos inválidos. Por favor, verifica la información e inténtalo de nuevo.';
            } else if (error.status === 404) {
              errorMessage =
                'Recurso no encontrado. Por favor, verifica que el tour y la fecha seleccionada sean válidos.';
            } else if (error.status === 0 || !error.status) {
              errorMessage =
                'Sin conexión al servidor. Por favor, verifica tu conexión a internet.';
            }

            alert(errorMessage);
          },
          complete: () => {
            this.isCreatingReservation = false;
          },
        })
    );
  }
}
