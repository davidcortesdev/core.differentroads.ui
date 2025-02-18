import { Component, Input } from '@angular/core';

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
  };
  @Input() onTourCardClick!: (tour: any) => void;
  @Input() isLargeCard: boolean = false;
  @Input() showScalapayPrice: boolean = false;

  handleTourClick() {
    this.onTourCardClick(this.tourData);
  }
}
