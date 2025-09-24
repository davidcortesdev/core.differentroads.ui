import { Component, Input, OnInit } from '@angular/core';
import { MembershipCard } from '../../../../../../core/models/v2/profile-v2.model';
import { PointsV2Service } from '../../../../../../core/services/v2/points-v2.service';

@Component({
  selector: 'app-membership-cards',
  standalone: false,
  templateUrl: './membership-cards.component.html',
  styleUrls: ['./membership-cards.component.scss']
})
export class MembershipCardsComponent implements OnInit {
  @Input() membershipCards: MembershipCard[] = [];
  @Input() currentTrips: number = 0;

  constructor(
    private pointsService: PointsV2Service
  ) {}

  ngOnInit(): void {}

  getCardClass(card: MembershipCard): string {
    return this.pointsService.getCardClass(card);
  }

  getRemainingTripsText(card: MembershipCard): string {
    return this.pointsService.getRemainingTripsText(card, this.currentTrips);
  }
}
