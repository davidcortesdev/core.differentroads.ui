import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Tour } from '../../models/tours/tour.model';
import { PeriodPricesService } from './period-prices.service';
import {
  OptionalActivityRef,
  Order,
  OrderTraveler,
} from '../../models/orders/order.model';
import { TourDataService } from './tour-data.service';
import { OrdersService } from '../orders.service';
import { TravelersService } from '../checkout/travelers.service';
import { map, switchMap } from 'rxjs/operators';

export interface DateInfo {
  date: string;
  tripType: string;
  departureCity?: string;
  basePrice?: number;
  periodID?: string;
  flightID?: string;
}

export interface Travelers {
  adults: number;
  children: number;
  babies: number;
}

export interface OrderProduct {
  name: string;
  units: number;
  singlePrice: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourOrderService {
  private basePrice$ = new BehaviorSubject<number>(0);
  private departureSelected$ = new BehaviorSubject<boolean>(false);
  public selectedFlight$ = new BehaviorSubject<any>(null);
  // BehaviorSubject para almacenar y compartir la información
  private selectedDateInfoSource = new BehaviorSubject<DateInfo>({
    date: '',
    tripType: '',
    departureCity: '',
    basePrice: 0,
    periodID: '',
    flightID: '',
  });

  // Observable al que los componentes pueden suscribirse
  selectedDateInfo$: Observable<DateInfo> =
    this.selectedDateInfoSource.asObservable();

  private selectedTravelersSource = new BehaviorSubject<Travelers>({
    adults: 1,
    children: 0,
    babies: 0,
  });

  selectedTravelers$: Observable<Travelers> =
    this.selectedTravelersSource.asObservable();

  // Nuevo BehaviorSubject para las actividades añadidas
  private selectedActivitiesSource = new BehaviorSubject<OptionalActivityRef[]>(
    []
  );
  selectedActivities$ = this.selectedActivitiesSource.asObservable();

  constructor(
    private tourDataService: TourDataService,
    private ordersService: OrdersService,
    private travelersService: TravelersService,
    private periodPricesService: PeriodPricesService
  ) {}

  // Método para actualizar la información

  updateSelectedDateInfo(
    periodID: number | string,
    flightID: string | number | undefined
  ): void {
    const periodsData = this.tourDataService.getTour()?.activePeriods;

    if (!periodID || !periodsData) {
      return;
    }

    const selectedPeriod = periodsData?.find(
      (period) => `${period.externalID}` === `${periodID}`
    );
    const selectedFlight = selectedPeriod?.flights.find(
      (flight) => `${flight.activityID}` === `${flightID}`
    );

    this.selectedDateInfoSource.next({
      date: selectedPeriod?.name || '',
      tripType: selectedPeriod?.tripType || 'Grupo',
      departureCity: selectedFlight?.name || 'Sin vuelos',
      basePrice:
        this.tourDataService.getTourBasePrice() +
        (selectedPeriod?.basePrice || 0),
      periodID: `${selectedPeriod?.externalID}`,
      flightID: `${selectedFlight?.activityID}`,
    });
  }

  // Actualizar solo la ciudad de salida
  updateDepartureCity(city: string): void {
    const currentInfo = this.selectedDateInfoSource.getValue();
    this.selectedDateInfoSource.next({
      ...currentInfo,
      departureCity: city,
    });
  }

  // Actualizar solo el precio base
  updateBasePrice(price: number): void {
    const currentInfo = this.selectedDateInfoSource.getValue();
    this.selectedDateInfoSource.next({
      ...currentInfo,
      basePrice: price,
    });
  }

  // Método para obtener el valor actual
  getCurrentDateInfo(): DateInfo {
    return this.selectedDateInfoSource.getValue();
  }

  // Método para verificar si hay información disponible
  hasDateInfo(): boolean {
    const currentInfo = this.selectedDateInfoSource.getValue();
    return !!(currentInfo.date && currentInfo.tripType);
  }

  updateSelectedTravelers(travelers: Travelers): void {
    this.selectedTravelersSource.next(travelers);
  }

  // Nuevo método para agregar actividad
  addActivity(activity: OptionalActivityRef): void {
    const currentActivities = this.selectedActivitiesSource.getValue();
    // Evitar duplicados (puede ajustarse según criterio)
    if (!currentActivities.find((a) => a.id === activity.id)) {
      this.selectedActivitiesSource.next([...currentActivities, activity]);
    }
  }

  // Método para alternar la actividad
  toggleActivity(activity: string, activityName: string): void {
    const currentActivities = this.selectedActivitiesSource.getValue();
    if (currentActivities.find((a) => a.id === activity)) {
      // Si la actividad existe, se elimina
      const updated = currentActivities.filter((a) => a.id !== activity);
      this.selectedActivitiesSource.next(updated);
    } else {
      // Obtener el ID del período actual
      const currentPeriod = this.getCurrentDateInfo();
      const periodId = currentPeriod.periodID;

      // Obtener los viajeros actuales
      const travelers = this.selectedTravelersSource.getValue();
      const travelersArray = this.buildTravelers(travelers);

      // Asignar viajeros según el precio correspondiente a su grupo de edad
      const travelersAssigned: string[] = [];

      if (periodId) {
        travelersArray.forEach((traveler) => {
          const ageGroup = traveler.travelerData?.ageGroup;
          const price = this.periodPricesService.getCachedPeriodActivityPrice(
            periodId,
            activity,
            ageGroup
          );

          if (price > 0 && traveler._id) {
            travelersAssigned.push(traveler._id);
          }
        });
      }

      const activityRef: OptionalActivityRef = {
        id: activity,
        name: activityName,
        travelersAssigned: travelersAssigned,
      };

      // Si no existe, se añade
      this.selectedActivitiesSource.next([...currentActivities, activityRef]);
    }
  }

  // Nuevo método para obtener las actividades añadidas
  getSelectedActivities(): OptionalActivityRef[] {
    return this.selectedActivitiesSource.getValue();
  }

  /**
   * Creates an order and returns the Observable for the created order
   */
  createOrder(options: {
    periodID: string;
    status: 'Budget' | 'AB';
    owner: string;
    traveler?: { name: string; email: string; phone: string };
    price?: number;
  }): Observable<Order> {
    const selectedPeriod = this.getCurrentDateInfo();
    if (!selectedPeriod.periodID) {
      throw new Error('No period selected');
    }

    const order: Partial<Order> = {
      periodID: selectedPeriod.periodID,
      retailerID: '1064',
      status: options.status,
      owner: options.owner,
      travelers: this.buildTravelers(
        this.selectedTravelersSource.getValue(),
        options.traveler
      ),
      price: options.price || 0,
      flights: [
        {
          id: selectedPeriod?.flightID || '',
          externalID: selectedPeriod?.flightID || '',
          name: selectedPeriod?.departureCity?.toLowerCase()?.includes('sin ')
            ? selectedPeriod?.departureCity
            : !selectedPeriod?.departureCity?.toLowerCase()?.includes('vuelo')
            ? 'Vuelo desde ' + selectedPeriod?.departureCity
            : selectedPeriod?.departureCity,
        },
      ],
      optionalActivitiesRef: this.getSelectedActivities(),
    };

    // Return the observable directly so components can subscribe to it
    return this.ordersService.createOrder(order);
  }

  /**
   * Builds traveler objects from traveler counts and lead traveler data
   */
  buildTravelers(
    travelers: Travelers,
    leadTraveler?: { name: string; email: string; phone: string }
  ): OrderTraveler[] {
    const travelersArray: OrderTraveler[] = [];

    const createTraveler = (type: string, i: number): OrderTraveler => ({
      lead: i === 0,
      _id: this.travelersService.generateHexID(),
      travelerData: {
        name: leadTraveler?.name || '',
        email: i === 0 && leadTraveler?.email ? leadTraveler.email : '',
        phone: i === 0 && leadTraveler?.phone ? leadTraveler.phone : '',
        ageGroup: type,
      },
    });

    for (let i = 0; i < travelers.adults; i++) {
      travelersArray.push(createTraveler('Adultos', i));
    }

    for (let i = 0; i < travelers.children; i++) {
      travelersArray.push(createTraveler('Niños', i + travelers.adults));
    }

    for (let i = 0; i < travelers.babies; i++) {
      travelersArray.push(
        createTraveler('Bebes', i + travelers.adults + travelers.children)
      );
    }

    return travelersArray;
  }

  /**
   * Builds an array of order products based on travelers and selected period
   */
  buildOrderProducts(
    travelers: Travelers,
    selectedPeriod: DateInfo | null
  ): Observable<OrderProduct[]> {
    if (!selectedPeriod || !selectedPeriod.periodID) {
      return of([]);
    }

    // First get period price data
    return this.periodPricesService
      .getPeriodPriceById(selectedPeriod.periodID, selectedPeriod.periodID)
      .pipe(
        map((periodPriceData) => {
          const products: OrderProduct[] = [];

          if (travelers.adults > 0) {
            products.push({
              name: 'Paquete básico Adultos',
              units: travelers.adults,
              singlePrice: this.tourDataService.getPeriodPrice(
                selectedPeriod.periodID!,
                true
              ),
            });
          }

          if (travelers.children > 0) {
            products.push({
              name: 'Paquete básico Niños',
              units: travelers.children,
              singlePrice: this.tourDataService.getPeriodPrice(
                selectedPeriod.periodID!,
                true
              ),
            });
          }

          if (
            selectedPeriod.flightID &&
            !selectedPeriod.departureCity?.toLowerCase()?.includes('sin ')
          ) {
            products.push({
              name: !selectedPeriod.departureCity
                ?.toLowerCase()
                ?.includes('vuelo')
                ? 'Vuelo desde ' + selectedPeriod.departureCity
                : selectedPeriod.departureCity!,
              units: travelers.adults + travelers.children,
              singlePrice: this.tourDataService.getFlightPrice(
                selectedPeriod.periodID!,
                selectedPeriod.flightID!
              ),
            });
          }

          // Add optional activities
          const activities = this.getSelectedActivities();
          if (activities.length > 0 && selectedPeriod.periodID) {
            // Get all tour activities to find their names
            const tour = this.tourDataService.getTour();
            const periodId = selectedPeriod.periodID;

            activities.forEach((activity) => {
              // Get the activity details

              // Check if there are adults assigned
              const adultPrice =
                this.periodPricesService.getCachedPeriodActivityPrice(
                  periodId,
                  activity.id,
                  'Adultos'
                );

              if (adultPrice > 0 && travelers.adults > 0) {
                products.push({
                  name: `${activity.name} (Adultos)`,
                  units: travelers.adults,
                  singlePrice: adultPrice,
                });
              }

              // Check if there are children assigned
              const childPrice =
                this.periodPricesService.getCachedPeriodActivityPrice(
                  periodId,
                  activity.id,
                  'Niños'
                );

              if (childPrice > 0 && travelers.children > 0) {
                products.push({
                  name: `${activity.name} (Niños)`,
                  units: travelers.children,
                  singlePrice: childPrice,
                });
              }
            });
          }

          return products;
        })
      );
  }

  getTotalPrice(): Observable<number> {
    const selectedPeriod = this.getCurrentDateInfo();
    const travelers = this.selectedTravelersSource.getValue();

    return this.buildOrderProducts(travelers, selectedPeriod).pipe(
      map((products) =>
        products.reduce(
          (total, product) => total + product.units * product.singlePrice,
          0
        )
      )
    );
  }

  /**
   * Creates a formatted text representation of travelers
   */
  getTravelersText(): string {
    const { adults, children, babies } =
      this.selectedTravelersSource.getValue();

    const adultsText =
      adults > 0 ? `${adults} Adulto${adults > 1 ? 's' : ''}` : '';
    const childrenText =
      children > 0 ? `${children} Niño${children > 1 ? 's' : ''}` : '';
    const babiesText =
      babies > 0 ? `${babies} Bebé${babies > 1 ? 's' : ''}` : '';

    return [adultsText, childrenText, babiesText]
      .filter((text) => text)
      .join(', ');
  }

  resetState(): void {
    this.selectedDateInfoSource.next({
      date: '',
      periodID: '',
      tripType: '',
      departureCity: '',
      flightID: undefined,
    });

    // Reset travelers to default values
    this.selectedTravelersSource.next({
      adults: 1,
      children: 0,
      babies: 0,
    });

    // Reset prices and activities
    this.basePrice$.next(0);
    this.selectedActivitiesSource.next([]);

    // Reset any other state variables you have in the service
    this.departureSelected$.next(false);
  }
}