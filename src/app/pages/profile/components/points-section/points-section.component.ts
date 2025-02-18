import { Component, OnInit } from '@angular/core';
import { PointsService } from '../../../../core/services/points.service';
import { GeneralConfigService } from '../../../../core/services/general-config.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  PointsSection,
  PointsCard,
} from '../../../../core/models/general/points-sections.model';

interface PointsRecord {
  booking: string;
  category: string;
  concept: string;
  tour: string;
  points: number;
}

interface MembershipCard {
  type: string;
  title: string;
  image: string;
  benefits: any;
  unlocked: boolean;
  requirement: string;
  minTrips: number;
  maxTrips?: number;
}

@Component({
  selector: 'app-points-section',
  standalone: false,
  templateUrl: './points-section.component.html',
  styleUrls: ['./points-section.component.scss'],
})
export class PointsSectionComponent implements OnInit {
  points: PointsRecord[] = [];
  showTable: boolean = false;
  totalPoints: number = 0;
  membershipCards: MembershipCard[] = [];
  currentTrips: number = 6;

  constructor(
    private pointsService: PointsService,
    private generalConfigService: GeneralConfigService,
    private sanitizer: DomSanitizer
  ) {
    // Inject PointsService
    this.points = [];
  }

  ngOnInit(): void {
    this.pointsService
      .getPointsByDni('12345678A', { page: 1, limit: 1000 })
      .subscribe((response: any) => {
        this.points = response.data.map((point: any) => ({
          booking: point.extraData.bookingID,
          category: point.type === 'income' ? 'Acumulación' : 'Redención',
          concept: point.extraData?.concept || point.subType,
          tour: point.extraData.tourName,
          points: point.points,
        }));
        this.totalPoints = response.totalpoints;
      });
    this.loadMembershipCards();
  }

  private loadMembershipCards(): void {
    this.generalConfigService
      .getPointsSection()
      .subscribe((response: PointsSection) => {
        this.membershipCards = response['points-cards']
          .map((card: PointsCard) => ({
            type: 'Viajero',
            title: card.name,
            image: card['point-image'][0].url,
            benefits: this.sanitizeHtml(card.content),
            unlocked: false,
            requirement: !card.maxTravels
              ? `${card.minTravels} viajes en adelante`
              : `${card.minTravels} - ${card.maxTravels} viajes`,
            minTrips: parseInt(card.minTravels, 10),
            maxTrips:
              card.maxTravels === 'N/A'
                ? undefined
                : parseInt(card.maxTravels as string, 10),
          }))
          .map((card) => ({
            ...card,
            unlocked: this.isCardUnlocked(card),
          }));
      });
  }

  private sanitizeHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  private isCardUnlocked(card: MembershipCard): boolean {
    return this.currentTrips >= card.minTrips;
  }

  toggleTable(): void {
    this.showTable = !this.showTable;
  }
}
