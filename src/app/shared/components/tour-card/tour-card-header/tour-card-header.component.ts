import { Component, Input, Output, EventEmitter } from '@angular/core';

interface TourHeaderData {
  imageUrl: string;
  title: string;
  rating: number;
  isByDr?: boolean;
  tag?: string;
  description: string;
  webSlug: string;
}

@Component({
  selector: 'app-tour-card-header',
  standalone: false,
  templateUrl: './tour-card-header.component.html',
  styleUrls: ['./tour-card-header.component.scss'],
})
export class TourCardHeaderComponent {
  @Input() tourData!: TourHeaderData;
  @Output() tourClick = new EventEmitter<void>();

  handleTourClick(): void {
    this.tourClick.emit();
  }
}
