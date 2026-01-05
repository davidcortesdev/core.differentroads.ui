import { Component, EventEmitter, Input, Output } from '@angular/core';

// Interface para la actividad (simplificada para el modal)
export interface ActivityForModal {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-activity-description-modal',
  standalone: false,
  templateUrl: './activity-description-modal.component.html',
  styleUrl: './activity-description-modal.component.scss',
})
export class ActivityDescriptionModalComponent {
  @Input() visible: boolean = false;
  @Input() activity: ActivityForModal | null = null;
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}

