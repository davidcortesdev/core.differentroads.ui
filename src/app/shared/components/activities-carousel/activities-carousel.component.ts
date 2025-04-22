import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarouselModule } from 'primeng/carousel';
import { ActivityCardComponent, ActivityHighlight } from '../activity-card/activity-card.component';
import { CAROUSEL_CONFIG } from '../../../shared/constants/carousel.constants';

@Component({
  selector: 'app-activities-carousel',
  standalone: false,
  templateUrl: './activities-carousel.component.html',
  styleUrls: ['./activities-carousel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivitiesCarouselComponent {
  @Input() highlights: ActivityHighlight[] = [];
  @Output() addActivity = new EventEmitter<ActivityHighlight>();
  
  protected carouselConfig = CAROUSEL_CONFIG;
  
  responsiveOptions = [
    {
      breakpoint: '1920px',
      numVisible: 6,
      numScroll: 1,
    },
    {
      breakpoint: '1800px',
      numVisible: 5,
      numScroll: 1,
    },
    {
      breakpoint: '1680px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '1559px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '800px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1,
    },
  ];


  onAddActivity(highlight: ActivityHighlight): void {
    this.addActivity.emit(highlight);
  }

  trackByFn(index: number, item: ActivityHighlight): string | number {
    return item.id || index;
  }
}