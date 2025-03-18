import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PeriodsService } from '../periods.service';
import { PriceData } from '../../models/commons/price-data.model';

@Injectable({
  providedIn: 'root',
})
export class PeriodPricesService {
  private periodPricesSource = new BehaviorSubject<{
    [periodId: string]: {
      [activityId: string]: { priceData: PriceData[]; availability?: number };
    };
  }>({});
  periodPrices$ = this.periodPricesSource.asObservable();

  constructor(private periodsService: PeriodsService) {}

  updatePeriodPrices(
    periodId: string,
    prices: {
      [activityId: string]: { priceData: PriceData[]; availability?: number };
    }
  ) {
    const currentPrices = this.periodPricesSource.value;
    currentPrices[periodId] = prices;
    this.periodPricesSource.next(currentPrices);
  }

  getPeriodPriceById(
    periodId: string,
    activityId: string,
    ageGroupName: string = 'Adultos'
  ): Observable<number> {
    return this.getPeriodPrices(periodId).pipe(
      map((periodPrices) => {
        const priceData = periodPrices[activityId]?.priceData;
        if (priceData) {
          return (
            priceData.find((price) => price.age_group_name === ageGroupName)
              ?.value || 0
          );
        }
        return 0;
      })
    );
  }

  getCachedPeriodActivityPrice(
    periodId: string,
    activityId: string,
    ageGroupName: string = 'Adultos'
  ): number {
    const priceData = this.getPeriodPriceDataById(periodId, activityId);
    if (priceData) {
      return (
        priceData.find((price) => price.age_group_name === ageGroupName)
          ?.value || 0
      );
    }
    return 0;
  }
  getPeriodPriceDataById(periodId: string, activityId: string): PriceData[] {
    const priceData =
      this.periodPricesSource.value[periodId]?.[activityId]?.priceData;
    if (!priceData) return [];

    return priceData;
  }

  getPeriodPrices(periodId: string): Observable<{
    [activityId: string]: { priceData: PriceData[]; availability?: number };
  }> {
    const cachedPrices = this.periodPricesSource.value[periodId];
    if (cachedPrices) {
      return this.periodPrices$.pipe(map((prices) => prices[periodId] || {}));
    }

    return this.periodsService.getPeriodPrices(periodId).pipe(
      map((prices) => {
        this.updatePeriodPrices(periodId, prices);
        return prices;
      })
    );
  }
}
