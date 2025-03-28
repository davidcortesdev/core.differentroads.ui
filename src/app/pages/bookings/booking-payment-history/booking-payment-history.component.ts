import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// Interfaz compatible con la del componente padre
interface TripItemData {
  quantity: number;
  unitPrice: number;
  value?: number; // Añadido para compatibilidad con el componente padre
  description?: string;
}

interface PaymentInfo {
  totalPrice: number;
  pendingAmount: number;
  paidAmount: number;
}

interface UpcomingPayment {
  date: string;
  amount: number;
}

interface PaymentHistoryItem {
  date: string;
  amount: number;
  status: string;
}

@Component({
  selector: 'app-booking-payment-history',
  templateUrl: './booking-payment-history.component.html',
  styleUrls: ['./booking-payment-history.component.scss'],
  standalone: false,
})
export class BookingPaymentHistoryComponent implements OnInit {
  // Inputs dinámicos para los trip items
  @Input() tripItems: TripItemData[] = [];

  @Input() paymentInfo: PaymentInfo = {
    totalPrice: 0,
    pendingAmount: 0,
    paidAmount: 0,
  };
  @Input() upcomingPayments: UpcomingPayment[] = [];
  @Input() paymentHistory: PaymentHistoryItem[] = [];

  @Output() registerPayment = new EventEmitter<number>();
  @Output() fileUploaded = new EventEmitter<any>();

  paymentForm: FormGroup;
  displayPaymentModal: boolean = false;
  uploadedFiles: any[] = [];

  // Siempre usaremos los elementos dinámicos
  useDynamicItems: boolean = true;

  constructor(private fb: FormBuilder) {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    // No necesitamos hacer nada aquí, siempre usaremos los elementos dinámicos
  }

 // Métodos para cálculos
calculateTotal(item: TripItemData): number {
  // Multiplicar quantity * unitPrice para obtener el total
  return item.quantity * item.unitPrice;
}

formatQuantity(item: TripItemData): string {
  // Mostrar la cantidad y el precio unitario
  return `${item.quantity}x${this.formatPrice(item.unitPrice)}`;
}

  formatPrice(price: number): string {
    return `${price}€`;
  }

  formatCurrency(amount: number): string {
    return `${amount.toLocaleString('es-ES')} €`;
  }

  showPaymentModal(): void {
    this.displayPaymentModal = true;
  }

  hidePaymentModal(): void {
    this.displayPaymentModal = false;
    this.paymentForm.reset({ amount: 0 });
  }

  onSubmitPayment(): void {
    if (this.paymentForm.valid) {
      const amount = this.paymentForm.get('amount')?.value;
      this.registerPayment.emit(amount);
      this.hidePaymentModal();
    }
  }

  onFileUpload(event: any): void {
    for (let file of event.files) {
      this.uploadedFiles.push(file);
    }
    this.fileUploaded.emit(event.files);
  }

  formatDate(dateStr: string): string {
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }
}