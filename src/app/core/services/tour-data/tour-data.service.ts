import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Tour } from '../../models/tours/tour.model';
import { PeriodPricesService } from './period-prices.service';
import { OptionalActivityRef } from '../../models/orders/order.model';

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

@Injectable({
  providedIn: 'root',
})
export class TourDataService {
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

  // BehaviorSubject para almacenar y compartir el tour
  private tourSource = new BehaviorSubject<Tour | null>(null);
  tour$ = this.tourSource.asObservable();

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

  constructor(private periodPricesService: PeriodPricesService) {}

  // Método para actualizar la información

  updateSelectedDateInfo(
    periodID: number | string,
    flightID: string | number | undefined
  ): void {
    const periodsData = this.getTour()?.activePeriods;

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
      departureCity: selectedFlight?.name || '',
      basePrice: this.getTourBasePrice() + (selectedPeriod?.basePrice || 0),
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

  // Métodos relacionados con el tour
  updateTour(tour: Tour) {
    this.tourSource.next(tour);
  }

  getTour(): Tour | null {
    return this.tourSource.getValue();
  }

  getTourBasePrice(): number {
    return this.getTour()?.basePrice || 0;
  }

  getTourBasePriceP(periodID: string): number {
    let price = 0;
    this.periodPricesService
      .getPeriodPriceById(`${periodID}`, this.getTour()?.externalID || '')
      .subscribe((value) => (price = value || 0));
    return price;
  }

  getPeriodPrice(
    periodID: string | number,
    withTourPrice: boolean = false
  ): number {
    if (!periodID) {
      return 0;
    }

    console.log('Getting period price for:', periodID);

    if (withTourPrice) {
      let price = 0;
      this.periodPricesService
        .getPeriodPriceById(`${periodID}`, `${periodID}`, 'Adultos')
        .subscribe((value) => (price = value || 0));
      return this.getTourBasePriceP(`${periodID}`) + price;
    } else {
      let price = 0;
      this.periodPricesService
        .getPeriodPriceById(`${periodID}`, `${periodID}`, 'Adultos')
        .subscribe((value) => (price = value || 0));
      return price;
    }
  }

  getFlightPrice(
    periodID: string | number,
    flightID: string | number | undefined
  ): number {
    if (!flightID || !periodID) {
      return 0;
    }
    const periodsData = this.getTour()?.activePeriods;
    if (!periodsData) {
      return 0;
    }
    const selectedPeriod = periodsData?.find(
      (period) => `${period.externalID}` === `${periodID}`
    );
    const selectedFlight = selectedPeriod?.flights.find(
      (flight) => `${flight.activityID}` === `${flightID}`
    );
    return selectedFlight?.prices || 0;
  }

  updateSelectedTravelers(travelers: Travelers): void {
    console.log('Updating travelers:', travelers);

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

  // Nuevo método para alternar la actividad
  toggleActivity(activity: OptionalActivityRef): void {
    const currentActivities = this.selectedActivitiesSource.getValue();
    if (currentActivities.find((a) => a.id === activity.id)) {
      // Si la actividad existe, se elimina
      const updated = currentActivities.filter((a) => a.id !== activity.id);
      this.selectedActivitiesSource.next(updated);
    } else {
      // Si no existe, se añade
      this.selectedActivitiesSource.next([...currentActivities, activity]);
    }
  }

  // Nuevo método para obtener las actividades añadidas
  getSelectedActivities(): OptionalActivityRef[] {
    return this.selectedActivitiesSource.getValue();
  }
}
