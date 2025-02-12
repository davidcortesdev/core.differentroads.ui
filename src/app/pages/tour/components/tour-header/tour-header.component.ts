import { Component, Input } from '@angular/core';
import { Tour } from '../../../../core/models/tours/tour.model';

@Component({
  selector: 'app-tour-header',
  standalone: false,
  
  templateUrl: './tour-header.component.html',
  styleUrls: ['./tour-header.component.scss']
})
export class TourHeaderComponent {
  @Input() tour!: Tour;

  getDuration(days: number | undefined): string {
    if (!days) return '';
    return `${days} días, ${days - 1} noches`;
  }
}
