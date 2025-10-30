import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

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

  get showCancelButton(): boolean {
    return true; // Siempre mostrar el botón
  }
}