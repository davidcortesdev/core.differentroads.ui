import { Component, Input } from '@angular/core';

export interface PointsSummary {
  availablePoints: number;
  category: string;
  categoryDisplayName: string;
  maxDiscount: number;
  nextCategory?: {
    name: string;
    requiredPoints: number;
    currentProgress: number;
  };
}

@Component({
  selector: 'app-balance-info',
  standalone: false,
  templateUrl: './balance-info.component.html',
  styleUrl: './balance-info.component.scss'
})
export class BalanceInfoComponent {
  @Input() isLoading: boolean = false;
  @Input() pointsSummary: PointsSummary | null = null;

  getAvailablePoints(): number {
    return this.pointsSummary?.availablePoints || 0;
  }

  getCategoryIcon(): string {
    if (!this.pointsSummary) return 'pi pi-star';
    
    switch (this.pointsSummary.category) {
      case 'trotamundos':
        return 'pi pi-star';
      case 'viajero':
        return 'pi pi-star-fill';
      case 'nómada':
        return 'pi pi-crown';
      default:
        return 'pi pi-star';
    }
  }

  getCategoryDisplayName(): string {
    return this.pointsSummary?.categoryDisplayName || 'Trotamundos';
  }

  getMaxDiscountForCategory(): number {
    return this.pointsSummary?.maxDiscount || 0;
  }

  getProgressText(): string {
    if (!this.pointsSummary?.nextCategory) return '';
    
    const { currentProgress, requiredPoints } = this.pointsSummary.nextCategory;
    const remaining = requiredPoints - currentProgress;
    
    return `Te faltan ${remaining} viajes para ${this.pointsSummary.nextCategory.name}`;
  }

  getProgressPercentage(): number {
    if (!this.pointsSummary?.nextCategory) return 0;
    
    const { currentProgress, requiredPoints } = this.pointsSummary.nextCategory;
    return Math.min((currentProgress / requiredPoints) * 100, 100);
  }

  /**
   * Verifica si debe mostrar la barra de progreso
   */
  shouldShowProgress(): boolean {
    // No mostrar progreso si ya es NOMADA (categoría máxima)
    return this.pointsSummary?.category !== 'nómada' && !!this.pointsSummary?.nextCategory;
  }
}
