import { Component, Input, OnInit } from '@angular/core';
import { BookingsService } from '../../../../core/services/bookings.service';

interface PaymentInfo {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  lastPaymentDate: string;
  lastPaymentDetails: string;
  nextPaymentDetails: string;
}

@Component({
  selector: 'app-payments-information-section',
  standalone: false,
  templateUrl: './payments-information-section.component.html',
  styleUrls: ['./payments-information-section.component.scss'],
})
export class PaymentsInformationSectionComponent implements OnInit {
  @Input() totalAmount!: number;
  @Input() bookingID!: string;
  paymentInfo: PaymentInfo = {
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    lastPaymentDate: '16/12/2024',
    lastPaymentDetails: 'Pago de 200€ a través de la web',
    nextPaymentDetails: 'Antes del 6/01/2025 de 725€',
  };

  constructor(private bookingsService: BookingsService) {}

  ngOnInit() {
    this.paymentInfo.totalAmount = this.totalAmount;
    this.fetchPayments();
  }

  fetchPayments() {
    this.bookingsService.getPayments(this.bookingID).subscribe((payments) => {
      const totalPaid = payments.reduce((sum, payment) => {
        return payment.status === 'COMPLETED' ? sum + payment.amount : sum;
      }, 0);
      this.paymentInfo.paidAmount = totalPaid;
      this.paymentInfo.remainingAmount = this.totalAmount - totalPaid;
    });
  }
}
