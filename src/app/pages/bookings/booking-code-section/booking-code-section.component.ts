import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-booking-code-section',
  templateUrl: './booking-code-section.component.html',
  styleUrls: ['./booking-code-section.component.scss'],
  standalone: false,
})
export class BookingCodeSectionComponent implements OnInit {
  @Input() bookingCode: string = '';
  @Input() bookingReference: string = '';
  @Input() status: string = '';
  @Output() cancelBooking = new EventEmitter<void>();

  constructor() {}

  ngOnInit(): void {}

  onCancelBooking(): void {
    this.cancelBooking.emit();
  }
}
