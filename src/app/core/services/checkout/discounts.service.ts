import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Discount {
  type: string; // 'points', 'coupon', etc.
  amount: number; // Amount of the discount
  description: string; // Description of the discount
  source?: string; // Source of the discount (email, coupon code, etc.)
  points?: number; // If type is 'points', how many points were used
}

@Injectable({
  providedIn: 'root',
})
export class DiscountsService {
  // Se simplifica el estado a un único BehaviorSubject similar al de FlightsService.
  private selectedDiscountsSubject = new BehaviorSubject<Discount[]>([]);
  selectedDiscounts$ = this.selectedDiscountsSubject.asObservable();

  constructor() {

  }

  // Actualiza los descuentos seleccionados
  updateSelectedDiscounts(discounts: Discount[]): void {

    this.selectedDiscountsSubject.next(discounts);
  }

  // NEW: Getter method to retrieve current discounts
  getSelectedDiscounts(): Discount[] {
    return this.selectedDiscountsSubject.getValue();
  }
}
