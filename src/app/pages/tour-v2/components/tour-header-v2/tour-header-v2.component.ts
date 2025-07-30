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
  // NUEVO: Input para recibir las actividades seleccionadas
  @Input() selectedActivities: ActivityHighlight[] = [];
  // NUEVO: Input para saber si se debe mostrar el estado de actividades
  @Input() showActivitiesStatus: boolean = false;
  // ✅ NUEVOS INPUTS para age groups y datos de pasajeros con tipado fuerte
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

    // Console log cuando cambien las actividades seleccionadas
    /*  if (changes['selectedActivities']) {
      console.log(
        'TourHeader - Actividades recibidas:',
        this.selectedActivities
      );
      console.log('TourHeader - Actividades agregadas:', this.addedActivities);
      console.log(
        'TourHeader - Precio total con actividades:',
        this.totalPriceWithActivities
      );
    } */
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

  // NUEVO: Calcular precio total incluyendo actividades
  get totalPriceWithActivities(): number {
    const activitiesTotal = this.selectedActivities
      .filter((activity) => activity.added)
      .reduce((sum, activity) => sum + (activity.price || 0), 0);

    /* console.log('TourHeader - Cálculo precio total:', {
      basePrice: this.totalPrice,
      activitiesTotal: activitiesTotal,
      totalWithActivities: this.totalPrice + activitiesTotal,
    }); */

    return this.totalPrice + activitiesTotal;
  }

  // NUEVO: Obtener actividades agregadas
  get addedActivities(): ActivityHighlight[] {
    return this.selectedActivities.filter((activity) => activity.added);
  }

  // NUEVO: Verificar si hay actividades agregadas
  get hasAddedActivities(): boolean {
    return this.addedActivities.length > 0;
  }

  // NUEVO: Verificar si debe mostrar estado de actividades
  get shouldShowActivitiesStatus(): boolean {
    // Solo mostrar si el padre dice que debe mostrarse Y hay departure seleccionado
    return (
      this.showActivitiesStatus &&
      this.selectedDeparture &&
      this.selectedDeparture.departureDate
    );
  }

  // NUEVO: Verificar si ya se interactuó con actividades (no se usa más)
  get hasInteractedWithActivities(): boolean {
    return this.selectedActivities.length > 0;
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

  private getTripTypeInfoForConsole(
    group: string
  ): { title: string; description: string; class: string } | undefined {
    if (!group) return undefined;

    const type = group.toLowerCase();

    if (type.includes('single') || type.includes('singles')) {
      return {
        title: 'Single',
        description: 'Viaje individual',
        class: 'single',
      };
    }

    if (type.includes('group') || type.includes('grupo')) {
      return { title: 'Group', description: 'Viaje en grupo', class: 'group' };
    }

    if (type.includes('private') || type.includes('privado')) {
      return {
        title: 'Private',
        description: 'Viaje privado',
        class: 'private',
      };
    }

    return undefined;
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
              let userId = 1; // Valor por defecto si no se encuentra el usuario
              
              if (users && users.length > 0) {
                userId = users[0].id;
                console.log('Usuario logueado encontrado, ID:', userId);
              } else {
                console.log('Usuario no encontrado en la base de datos, usando ID por defecto:', userId);
              }

              this.createReservation(userId);
            },
            error: (error) => {
              console.error('Error buscando usuario por Cognito ID:', error);
              this.createReservation(1); // Usar ID por defecto en caso de error
            }
          });
        } else {
          console.log('Usuario no logueado, usando ID por defecto: 1');
          this.createReservation(1);
        }
      },
      error: (error) => {
        console.error('Error obteniendo Cognito ID:', error);
        this.createReservation(1); // Usar ID por defecto en caso de error
      }
    });
  }

  private createReservation(userId: number): void {
    console.log('🏗️ Creando reservación con userId:', userId);
    
    const reservationData: ReservationCreate = {
      id: 0,
      tkId: '',
      reservationStatusId: 1,
      retailerId: environment.retaileriddefault,
      tourId: this.tourId!,
      departureId: this.selectedDeparture.id,
      userId: userId, // Usar el ID del usuario logueado
      totalPassengers: this.totalPassengers || 1,
      totalAmount: this.totalPriceWithActivities || 0, // MODIFICADO: Usar precio con actividades
      budgetAt: '',
      cartAt: new Date().toISOString(),
      abandonedAt: '',
      reservedAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('📝 Datos de la reservación:', {
      tourId: reservationData.tourId,
      departureId: reservationData.departureId,
      userId: reservationData.userId,
      totalPassengers: reservationData.totalPassengers,
      totalAmount: reservationData.totalAmount
    });

    /* console.log('Booking - Iniciando proceso de reservación con datos:', {
      reservationData,
      selectedActivities: this.addedActivities,
      passengersData: this.passengersData,
    }); */

    this.subscriptions.add(
      this.reservationService
        .create(reservationData)
        .pipe(
          switchMap((createdReservation: IReservationResponse) => {
            /*             console.log('Booking - Reservación creada:', createdReservation);
             */
            // ✅ MODIFICADO: Crear travelers con age groups específicos usando tipado fuerte
            const travelerObservables = [];
            let travelerNumber = 1;

            // Crear travelers para adultos
            for (let i = 0; i < this.passengersData.adults; i++) {
              const isLeadTraveler = travelerNumber === 1; // Solo el primer traveler es lead

              // ✅ VALIDACIÓN: Solo crear si hay age group válido
              if (!this.ageGroupCategories.adults.id) {
                console.error('No se encontró age group para adultos');
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
                ageGroupId: this.ageGroupCategories.adults.id, // ✅ Ya validado que no es null
              };

              travelerObservables.push(
                this.reservationTravelerService.create(travelerData)
              );
              travelerNumber++;
            }

            // Crear travelers para niños
            for (let i = 0; i < this.passengersData.children; i++) {
              // ✅ VALIDACIÓN: Solo crear si hay age group válido
              if (!this.ageGroupCategories.children.id) {
                console.error('No se encontró age group para niños');
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
                ageGroupId: this.ageGroupCategories.children.id, // ✅ Ya validado que no es null
              };

              travelerObservables.push(
                this.reservationTravelerService.create(travelerData)
              );
              travelerNumber++;
            }

            // Crear travelers para bebés
            for (let i = 0; i < this.passengersData.babies; i++) {
              // ✅ VALIDACIÓN: Solo crear si hay age group válido
              if (!this.ageGroupCategories.babies.id) {
                console.error('No se encontró age group para bebés');
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
                ageGroupId: this.ageGroupCategories.babies.id, // ✅ Ya validado que no es null
              };

              travelerObservables.push(
                this.reservationTravelerService.create(travelerData)
              );
              travelerNumber++;
            }

            // ✅ VALIDACIÓN: Si no hay observables, crear al menos uno vacío
            if (travelerObservables.length === 0) {
              throw new Error('No travelers to create');
            }

            return forkJoin(travelerObservables).pipe(
              map((createdTravelers) => {
                /*                 console.log('Booking - Travelers creados:', createdTravelers);
                 */ return {
                  reservation: createdReservation,
                  travelers: createdTravelers,
                };
              })
            );
          }),
          switchMap(({ reservation, travelers }) => {
            // ✅ NUEVO: Crear actividades para cada traveler
            const addedActivities = this.addedActivities;

            if (addedActivities.length === 0) {
              /*               console.log('Booking - No hay actividades para asignar');
               */ return of({ reservation, travelers, activities: [] });
            }

            /* console.log('Booking - Asignando actividades a travelers:', {
              travelers: travelers.length,
              activities: addedActivities.length,
              activitiesData: addedActivities,
            }); */

            const activityObservables: Observable<any>[] = [];

            // Para cada traveler, asignar todas las actividades seleccionadas
            travelers.forEach((traveler: any) => {
              addedActivities.forEach((activity: ActivityHighlight) => {
                const travelerActivityData: ReservationTravelerActivityCreate =
                  {
                    id: 0,
                    reservationTravelerId: traveler.id,
                    activityId: parseInt(activity.id), // Convertir string a number
                  };

                /* console.log(
                  'Booking - Creando asignación actividad-traveler:',
                  {
                    travelerId: traveler.id,
                    travelerNumber: traveler.travelerNumber,
                    activityId: activity.id,
                    activityTitle: activity.title,
                    activityPrice: activity.price,
                  }
                ); */

                activityObservables.push(
                  this.reservationTravelerActivityService.create(
                    travelerActivityData
                  )
                );
              });
            });

            if (activityObservables.length === 0) {
              return of({ reservation, travelers, activities: [] });
            }

            return forkJoin(activityObservables).pipe(
              map((createdActivities) => {
                /* console.log(
                  'Booking - Actividades asignadas exitosamente:',
                  createdActivities
                ); */
                return {
                  reservation,
                  travelers,
                  activities: createdActivities,
                };
              })
            );
          })
        )
        .subscribe({
          next: ({ reservation, travelers, activities }) => {
            /* console.log('Booking - Proceso completado exitosamente:', {
              reservation,
              travelers,
              activities,
              totalActivitiesCreated: activities.length,
            }); */

            this.router.navigate(['/checkout-v2', reservation.id]);
          },
          error: (error) => {
            console.error('Booking - Error en el proceso:', error);
            alert(
              'Error al crear la reservación, travelers o actividades. Por favor, inténtalo de nuevo.'
            );
          },
          complete: () => {
            this.isCreatingReservation = false;
          },
        })
    );
  }
}
