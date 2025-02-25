import { Component, Input } from '@angular/core';

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
export class PaymentsInformationSectionComponent {
  @Input() paymentInfo!: PaymentInfo;
}
