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
  isCurrent: boolean;
  requirement: string;
  minTrips: number;
  maxTrips?: number;
  remainingTrips?: number;
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
  currentTrips: number = 4;

  constructor(
    private pointsService: PointsService,
    private generalConfigService: GeneralConfigService,
    private sanitizer: DomSanitizer
  ) {
    this.points = [];
  }

  ngOnInit(): void {
    this.loadPoints();
    this.loadMembershipCards();
  }

  private loadPoints(): void {
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
  }

  private loadMembershipCards(): void {
    const cardConfigs = [
      {
        title: 'Globetrotter',
        minTrips: 1,
        maxTrips: 3,
        type: 'Viajero',
      },
      {
        title: 'Voyager',
        minTrips: 3,
        maxTrips: 6,
        type: 'Viajero',
      },
      {
        title: 'Nomad',
        minTrips: 6,
        maxTrips: undefined,
        type: 'Viajero',
      },
    ];

    this.generalConfigService
      .getPointsSection()
      .subscribe((response: PointsSection) => {
        this.membershipCards = cardConfigs
          .map((config) => {
            const card = response['points-cards'].find(
              (c) => c.name === config.title
            );
            if (!card) return null;

            const unlocked = this.currentTrips >= config.minTrips;
            const isCurrent =
              unlocked &&
              (config.maxTrips ? this.currentTrips < config.maxTrips : true);

            return {
              type: config.type,
              title: config.title,
              image: card['point-image'][0].url,
              benefits: this.sanitizeHtml(card.content),
              unlocked: unlocked,
              isCurrent: isCurrent,
              requirement: !config.maxTrips
                ? `${config.minTrips} viajes en adelante`
                : `${config.minTrips} - ${config.maxTrips} viajes`,
              minTrips: config.minTrips,
              maxTrips: config.maxTrips,
              remainingTrips: unlocked
                ? 0
                : config.minTrips - this.currentTrips,
            };
          })
          .filter((card) => card !== null);
      });
  }

  private sanitizeHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  getCardClass(card: MembershipCard): string {
    if (!card.unlocked) return 'locked-card';
    return card.isCurrent ? 'current-card' : 'unlocked-card';
  }

  getRemainingTripsText(card: MembershipCard): string {
    if (card.unlocked) {
      return 'Desbloqueado';
    }
    const requiredTrips = card.minTrips;
    return `${this.currentTrips} de ${requiredTrips} viajes completados`;
  }

  toggleTable(): void {
    this.showTable = !this.showTable;
  }
}
