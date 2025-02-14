import { Component, OnInit } from '@angular/core';

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
  benefits: string[];
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
  totalPoints: number = 140;
  membershipCards: MembershipCard[] = [];
  currentTrips: number = 6;

  constructor() {
    this.points = [
      {
        booking: 'RES001',
        category: 'Premium',
        concept: 'Tour Básico',
        tour: 'City Tour',
        points: 50,
      },
      {
        booking: 'RES002',
        category: 'Gold',
        concept: 'Tour Premium',
        tour: 'Adventure Tour',
        points: 90,
      },
    ];

    this.initializeMembershipCards();
  }

  ngOnInit(): void {}

  private initializeMembershipCards(): void {
    const cards: MembershipCard[] = [
      {
        type: 'Viajero',
        title: 'Globetrotter',
        image: 'https://picsum.photos/400/200',
        benefits: [
          'Acceso previo a la publicación de los tours',
          'Newsletters exclusivas',
          'Personalización del perfil',
          'Más beneficios especificados',
        ],
        unlocked: false,
        requirement: '0-4 viajes',
        minTrips: 0,
        maxTrips: 4,
      },
      {
        type: 'Viajero',
        title: 'Voyager',
        image: 'https://picsum.photos/400/200?random=1',
        benefits: [
          'Acceso previo a la publicación de los tours',
          'Newsletters exclusivas',
          'Personalización del perfil',
          'Más beneficios especificados',
        ],
        unlocked: false,
        requirement: '5-9 viajes',
        minTrips: 5,
        maxTrips: 9,
      },
      {
        type: 'Viajero',
        title: 'Nomad',
        image: 'https://picsum.photos/400/200?random=2',
        benefits: [
          'Acceso previo a la publicación de los tours',
          'Newsletters exclusivas',
          'Personalización del perfil',
          'Más beneficios especificados',
        ],
        unlocked: false,
        requirement: '10 viajes o más',
        minTrips: 10,
      },
    ];

    this.membershipCards = cards.map((card) => ({
      ...card,
      unlocked: this.isCardUnlocked(card),
    }));
  }

  private isCardUnlocked(card: MembershipCard): boolean {
    if (card.maxTrips) {
      return (
        this.currentTrips >= card.minTrips && this.currentTrips <= card.maxTrips
      );
    }
    return this.currentTrips >= card.minTrips;
  }

  toggleTable(): void {
    this.showTable = !this.showTable;
  }
}
