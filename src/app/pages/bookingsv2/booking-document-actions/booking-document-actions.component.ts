import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-booking-document-actions-v2',
  templateUrl: './booking-document-actions.component.html',
  styleUrls: ['./booking-document-actions.component.scss'],
  standalone: false,
})
export class BookingDocumentActionsV2Component implements OnInit {
  @Input() isVisible: boolean = true;
  @Input() bookingId: string = '';
  @Output() sendReminder = new EventEmitter<void>();
  @Output() reprintInfo = new EventEmitter<void>();
  @Output() reprintVoucher = new EventEmitter<void>();
  @Output() reprintPaymentReminder = new EventEmitter<void>();
  @Output() reprintETickets = new EventEmitter<void>();

  isReprintVoucherLoading: boolean = false;

  constructor(
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {}

  onSendReminder(): void {
    this.sendReminder.emit();
  }

  onReprintInfo(): void {
    this.reprintInfo.emit();
  }

  onReprintVoucher(): void {
    this.isReprintVoucherLoading = true;
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Generando documento...',
    });
    //TODO: Implementar leyendo los datos de mysql
  }

  onReprintPaymentReminder(): void {
    this.reprintPaymentReminder.emit();
  }

  onReprintETickets(): void {
    this.reprintETickets.emit();
  }
}
