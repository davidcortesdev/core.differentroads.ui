import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tour-card',
  standalone: false,
  templateUrl: './tour-card.component.html',
  styleUrls: ['./tour-card.component.scss'],
})
export class TourCardComponent {
  @Input() tourData!: {
    imageUrl: string;
    title: string;
    rating: number;
    isByDr?: boolean;
    tag?: string;
    description: string;
    price: number;
    availableMonths: string[];
    webSlug: string;
  };
  @Input() isLargeCard: boolean = false;
  @Input() showScalapayPrice: boolean = false;

  constructor(private router: Router) {}

  handleTourClick() {
    this.router.navigate(['/tour', this.tourData.webSlug]);
  }

  get monthlyPrice(): number {
    return this.tourData.price / 4;
  }
}
