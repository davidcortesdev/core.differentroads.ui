import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PriceData } from '../../models/commons/price-data.model';

@Injectable({
  providedIn: 'root',
})
export class PricesService {
  private pricesSource = new BehaviorSubject<{
    [key: string]: { priceData: PriceData[]; availability?: number };
  }>({});
  prices$ = this.pricesSource.asObservable();

  updatePrices(prices: {
    [key: string]: { priceData: PriceData[]; availability?: number };
  }) {
    this.pricesSource.next(prices);
  }

  getPriceById(id: string, ageGroupName?: string): number {
    const priceData = this.pricesSource.value[id]?.priceData;
    if (!priceData) return 0;

    if (ageGroupName) {
      return (
        priceData.find((price) => price.age_group_name === ageGroupName)
          ?.value || 0
      );
    }

    return priceData[0]?.value || 0;
  }

  getPriceDataById(id: string): PriceData[] {
    const priceData = this.pricesSource.value[id]?.priceData;
    if (!priceData) return [];

    return priceData;
  }
}
