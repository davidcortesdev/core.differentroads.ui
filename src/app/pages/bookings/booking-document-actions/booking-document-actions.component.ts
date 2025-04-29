import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NotificationsService } from '../../../core/services/notifications.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-booking-document-actions',
  templateUrl: './booking-document-actions.component.html',
  styleUrls: ['./booking-document-actions.component.scss'],
  standalone: false,
})
export class BookingDocumentActionsComponent implements OnInit {
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
    private notificationsService: NotificationsService
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

    this.notificationsService
      .getBookingDocument(this.bookingId, true)
      .subscribe({
        next: (response) => {
          this.isReprintVoucherLoading = false;
          console.log(
            'Document generated successfully:',
            response,
            response.fileUrl
          );

          if (response.fileUrl) {
            window.open(response.fileUrl, '_blank');
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se obtuvo el URL del documento',
            });
          }
        },
        error: (error) => {
          this.isReprintVoucherLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al generar el documento',
          });
          console.error('Error generating document:', error);
        },
      });
  }

  onReprintPaymentReminder(): void {
    this.reprintPaymentReminder.emit();
  }

  onReprintETickets(): void {
    this.reprintETickets.emit();
  }
}
