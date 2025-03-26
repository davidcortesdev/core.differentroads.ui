import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-booking-document-actions',
  templateUrl: './booking-document-actions.component.html',
  styleUrls: ['./booking-document-actions.component.scss'],
  standalone: false,
})
export class BookingDocumentActionsComponent implements OnInit {
  @Input() isVisible: boolean = true;
  @Output() sendReminder = new EventEmitter<void>();
  @Output() reprintInfo = new EventEmitter<void>();
  @Output() reprintVoucher = new EventEmitter<void>();
  @Output() reprintPaymentReminder = new EventEmitter<void>();
  @Output() reprintETickets = new EventEmitter<void>();

  constructor() {}

  ngOnInit(): void {}

  onSendReminder(): void {
    this.sendReminder.emit();
  }

  onReprintInfo(): void {
    this.reprintInfo.emit();
  }

  onReprintVoucher(): void {
    this.reprintVoucher.emit();
  }

  onReprintPaymentReminder(): void {
    this.reprintPaymentReminder.emit();
  }

  onReprintETickets(): void {
    this.reprintETickets.emit();
  }
}
