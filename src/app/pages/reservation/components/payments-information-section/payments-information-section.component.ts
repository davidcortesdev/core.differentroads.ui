import { Component, Input, OnInit } from '@angular/core';
import { BookingsService } from '../../../../core/services/bookings.service';
import { Payment } from '../../../../core/models/bookings/payment.model';
import { Booking } from '../../../../core/models/bookings/booking.model';

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
  @Input() bookingData!: Booking;
  @Input() currentPayment!: Payment;

  payments: Payment[] = [];
  paymentInfo: PaymentInfo = {
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    lastPaymentDate: '',
    lastPaymentDetails: '',
    nextPaymentDetails: '',
  };

  constructor(private bookingsService: BookingsService) {}

  ngOnInit() {
    this.paymentInfo.totalAmount = this.totalAmount;
    this.updateLastPaymentInfo();
    this.fetchPayments();
  }

  updateLastPaymentInfo() {
    if (this.currentPayment) {
      // Format the payment date
      const paymentDate = this.currentPayment.createdAt
        ? new Date(this.currentPayment.createdAt)
        : new Date();

      const formattedDate = `${paymentDate.getDate()}/${
        paymentDate.getMonth() + 1
      }/${paymentDate.getFullYear()}`;
      this.paymentInfo.lastPaymentDate = formattedDate;

      // Create payment details string
      const paymentMethod = this.currentPayment.method || 'web';
      this.paymentInfo.lastPaymentDetails = `Pago de ${
        this.currentPayment.amount
      }€ a través de ${
        paymentMethod === 'credit_card'
          ? 'tarjeta de crédito'
          : paymentMethod === 'transfer'
          ? 'transferencia bancaria'
          : 'la web'
      }`;
    }
  }

  fetchPayments() {
    this.bookingsService.getPayments(this.bookingID).subscribe((payments) => {
      const totalPaid = payments.reduce((sum, payment) => {
        return payment.status === 'COMPLETED' ? sum + payment.amount : sum;
      }, 0);
      this.paymentInfo.paidAmount = totalPaid;
      this.paymentInfo.remainingAmount = this.totalAmount - totalPaid;

      this.payments = payments.filter(
        (payment) => payment.status === 'COMPLETED'
      );

      // Calculate next payment date (30 days before departure)
      this.updateNextPaymentDetails();
    });
  }

  updateNextPaymentDetails() {
    if (this.bookingData && this.bookingData.periodData?.['dayOne']) {
      const departureDate = new Date(this.bookingData.periodData['dayOne']);
      const nextPaymentDate = new Date(departureDate);
      nextPaymentDate.setDate(departureDate.getDate() - 30);

      const formattedDate = `${nextPaymentDate.getDate()}/${
        nextPaymentDate.getMonth() + 1
      }/${nextPaymentDate.getFullYear()}`;
      this.paymentInfo.nextPaymentDetails = `Antes del ${formattedDate} de ${this.paymentInfo.remainingAmount}€`;
    } else {
      this.paymentInfo.nextPaymentDetails = `Antes del pago de ${this.paymentInfo.remainingAmount}€`;
    }
  }
}
