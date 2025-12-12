import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-booking-code-section-v2',
  templateUrl: './booking-code-section.component.html',
  styleUrls: ['./booking-code-section.component.scss'],
  standalone: false,
})
export class BookingCodeSectionV2Component implements OnInit {
  @Input() bookingCode: string = '';
  @Input() bookingReference: string = '';
  @Input() status: string = '';
  @Input() statusId: number = 0;
  @Input() isATC: boolean = false;
  @Input() isStandaloneMode: boolean = false;
  @Input() isTO: boolean = false;
  
  // Add the new event emitter for back button
  @Output() backEvent = new EventEmitter<void>();
  @Output() cancelBooking = new EventEmitter<void>();

  constructor() {}

  ngOnInit(): void {}

  // Add the goBack method
  goBack(): void {
    this.backEvent.emit();
  }

  onCancelBooking(): void {
    this.cancelBooking.emit();
  }

  get isCancelled(): boolean {
    return this.statusId === 8;
  }

  get cancelButtonLabel(): string {
    return this.isCancelled ? 'Cancelada' : 'Cancelar reserva';
  }

  get cancelButtonDisabled(): boolean {
    return this.isCancelled || this.isTO;
  }

  get cancelButtonTooltip(): string {
    if (this.isTO) {
      return 'Contacte con atención al cliente para cancelar la reserva';
    }
    if (this.isCancelled) {
      return 'La reserva ya está cancelada';
    }
    return '';
  }

  get showCancelButton(): boolean {
    return true; // Siempre mostrar el botón
  }

  get hasTkId(): boolean {
    return !!(this.bookingReference && this.bookingReference !== '000000' && this.bookingReference !== '');
  }

  generateTkLink(): string {
    if (!this.hasTkId) {
      return '#';
    }
    return `${environment.tkwebUrl}admin/reservation/view/${this.bookingReference}`;
  }

  get isTkLinkEnabled(): boolean {
    return this.isATC && this.hasTkId;
  }
}