import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

// Define a proper interface for the highlight data
export interface ActivityHighlight {
  id: string;
  title: string;
  description: string;
  image?: string;
  recommended?: boolean;
  optional?: boolean;
  added?: boolean;
  price?: number;
}

@Component({
  selector: 'app-activity-card',
  standalone: false,
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Optimize change detection
})
export class ActivityCardComponent implements OnInit, OnChanges {
  @Input() highlight!: ActivityHighlight;
  @Output() addActivity = new EventEmitter<ActivityHighlight>();
  @Output() viewDetails = new EventEmitter<ActivityHighlight>();

  ngOnInit(): void {
    // Removed console.log for production
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Removed console.log for production
  }

  onAddActivity(highlight: ActivityHighlight): void {
    this.addActivity.emit(highlight);
  }
  
  onViewDetails(event: Event, highlight: ActivityHighlight): void {
    event.stopPropagation();
    this.viewDetails.emit(highlight);
  }
}
