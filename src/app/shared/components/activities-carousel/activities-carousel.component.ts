import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
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
export class ActivitiesCarouselComponent implements OnInit, OnChanges {
  @Input() highlights: ActivityHighlight[] = [];
  @Output() addActivity = new EventEmitter<ActivityHighlight>();
  
  protected carouselConfig = CAROUSEL_CONFIG;
  
  responsiveOptions = [
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

  ngOnInit(): void {
    console.log('ActivitiesCarouselComponent - highlights data:', this.highlights);
    console.log('ActivitiesCarouselComponent - highlights count:', this.highlights?.length || 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['highlights']) {
      console.log('ActivitiesCarouselComponent - highlights changed:', this.highlights);
      console.log('ActivitiesCarouselComponent - highlights count after change:', this.highlights?.length || 0);
    }
  }

  onAddActivity(highlight: ActivityHighlight): void {
    console.log('ActivitiesCarouselComponent - activity added:', highlight);
    this.addActivity.emit(highlight);
  }

  trackByFn(index: number, item: ActivityHighlight): string | number {
    return item.id || index;
  }
}