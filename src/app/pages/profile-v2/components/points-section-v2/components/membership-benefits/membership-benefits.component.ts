import { Component, Input, OnInit } from '@angular/core';
import { TravelerCategory, TravelerPointsSummary } from '../../../../../../core/models/v2/profile-v2.model';
import { PointsV2Service } from '../../../../../../core/services/v2/points-v2.service';

@Component({
  selector: 'app-membership-benefits',
  standalone: false,
  templateUrl: './membership-benefits.component.html',
  styleUrls: ['./membership-benefits.component.scss']
})
export class MembershipBenefitsComponent implements OnInit {
  @Input() currentCategory: TravelerCategory = TravelerCategory.TROTAMUNDOS;
  @Input() pointsSummary: TravelerPointsSummary | null = null;
  @Input() currentTrips: number = 0;

  constructor(
    private pointsService: PointsV2Service
  ) {}

  ngOnInit(): void {}

  getCategoryDisplayName(category: TravelerCategory): string {
    return this.pointsService.getCategoryDisplayName(category);
  }

  getCategoryIcon(category: TravelerCategory): string {
    return this.pointsService.getCategoryIcon(category);
  }

  getMaxDiscountForCurrentCategory(): number {
    return this.pointsService.getMaxDiscountForCategory(this.currentCategory);
  }

  getNextCategoryFromSummary(): TravelerCategory | undefined {
    return this.pointsSummary?.nextCategory;
  }

  getProgressText(): string {
    const nextCategory = this.getNextCategory();
    if (!nextCategory) return 'Categoría máxima alcanzada';
    
    const tripsNeeded = this.pointsSummary?.pointsToNextCategory || 0;
    const nextCategoryName = this.getCategoryDisplayName(nextCategory);
    
    return `Faltan ${tripsNeeded} viajes para ${nextCategoryName}`;
  }

  getProgressPercentage(): number {
    if (!this.pointsSummary?.nextCategory) return 100;
    
    const currentTrips = this.currentTrips;
    const tripsNeeded = this.pointsSummary.pointsToNextCategory || 0;
    const totalTrips = currentTrips + tripsNeeded;
    
    return totalTrips > 0 ? (currentTrips / totalTrips) * 100 : 0;
  }

  private getNextCategory(): TravelerCategory | undefined {
    switch (this.currentCategory) {
      case TravelerCategory.TROTAMUNDOS:
        return TravelerCategory.VIAJERO;
      case TravelerCategory.VIAJERO:
        return TravelerCategory.NOMADA;
      default:
        return undefined;
    }
  }
}
