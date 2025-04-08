import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PointsCalculatorService {
  private readonly POINTS_MULTIPLIER = 0.03;

  calculateEarnedPoints(subtotal: number): number {
    return Math.floor(subtotal * this.POINTS_MULTIPLIER);
  }
}
