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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Define a proper interface for the highlight data
export interface ActivityHighlight {
  id: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  recommended?: boolean;
  optional?: boolean;
  added?: boolean;
  price?: number;
  type?: 'act' | 'pack';
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

  sanitizedDescription: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.updateSanitizedDescription();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['highlight'] && changes['highlight'].currentValue) {
      this.updateSanitizedDescription();
    }
  }

  private updateSanitizedDescription(): void {
    if (this.highlight?.description) {
      this.sanitizedDescription = this.sanitizer.bypassSecurityTrustHtml(
        this.highlight.description
      );
    } else {
      this.sanitizedDescription = '';
    }
  }

  onAddActivity(event: Event, highlight: ActivityHighlight): void {
    event.stopPropagation();
    this.addActivity.emit(highlight);
  }

  onViewDetails(event: Event, highlight: ActivityHighlight): void {
    event.stopPropagation();
    this.viewDetails.emit(highlight);
  }
}
