import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { ActivityHighlight } from '../../../../shared/components/activity-card/activity-card.component';
import { Hotel } from '../../../../core/models/tours/tour.model';

@Component({
  selector: 'app-tour-itinerary-panel',
  standalone: false,
  templateUrl: './tour-itinerary-panel.component.html',
  styleUrls: ['./tour-itinerary-panel.component.scss']
})
export class TourItineraryPanelComponent {
  @Input() event!: {
    title: string;
    description: SafeHtml;
    image: string;
    hotel: Hotel | null;
    collapsed: boolean;
    color?: string;
    highlights: ActivityHighlight[]; // Remove the optional (?) to fix type error
    extraInfo?: {
      title?: string;
      content?: string;
    };
  };
  @Input() index!: number;
  
  @Output() addActivity = new EventEmitter<ActivityHighlight>();
  @Output() panelClick = new EventEmitter<number>();

  onAddActivity(highlight: ActivityHighlight): void {
    this.addActivity.emit(highlight);
  }

  handleClick(): void {
    this.panelClick.emit(this.index);
  }
}