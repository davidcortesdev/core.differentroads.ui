import { Component, Input, OnInit } from '@angular/core';
import { IScalapayOrderResponse, NewScalapayService } from '../../services/newScalapay.service';

@Component({
  selector: 'app-payment-management',
  standalone: false,
  
  templateUrl: './payment-management.component.html',
  styleUrl: './payment-management.component.scss'
})
export class PaymentManagementComponent implements OnInit{
  isOpen:boolean = true;
  isInstallmentsOpen: boolean = true;
  isPaymentMethodsOpen: boolean = true;
  paymentType: string | null = null;
  depositAmount: number = 200; //Cambiar
  paymentDeadline: string = '30 días antes del tour'; //Cambiar
  @Input() totalPrice: number = 0;
  @Input() reservationId!: number;
  paymentMethod: 'creditCard' | 'transfer' | null = null;
  installmentOption: string | null = null;
  isLoading: boolean = false;
  router: any;

  constructor(private scalapayService: NewScalapayService) {}

  ngOnInit(): void {
    console.log('PaymentManagementComponent initialized');
    this.loadScalapayScript();
    //TODO: Load data from backend
  }

  loadScalapayScript() {
    if (!document.querySelector('script[src*="scalapay-widget-loader.js"]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://cdn.scalapay.com/widget/scalapay-widget-loader.js';
      document.head.appendChild(script);
    }
  }

  onInstallmentOptionChange() {
    this.reloadScalapayWidgets();
  }

  reloadScalapayWidgets() {
    setTimeout(() => {
      const priceContainerThree = document.getElementById('price-container-three');
      const priceContainerFour = document.getElementById('price-container-four');
      if (priceContainerThree) {
        priceContainerThree.textContent = `€ ${this.totalPrice?.toFixed ? this.totalPrice.toFixed(2) : this.totalPrice}`;
      }
      if (priceContainerFour) {
        priceContainerFour.textContent = `€ ${this.totalPrice?.toFixed ? this.totalPrice.toFixed(2) : this.totalPrice}`;
      }
      const event = new CustomEvent('scalapay-widget-reload');
      window.dispatchEvent(event);
    }, 200);
  }

  // Métodos stub para el HTML
  goBack(): void {}

  submitPayment(): void {
    this.isLoading = true;
    if(this.paymentType === 'installments') {
      const payments: number = this.installmentOption === 'three' ? 3 : this.installmentOption === 'four' ? 4 : 1;
      this.scalapayService.createOrder(this.reservationId, payments).subscribe((response: IScalapayOrderResponse) => {
        console.log(response);
        window.location.href = response.checkoutUrl;
    });
  }
}

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.isInstallmentsOpen = false;
      this.isPaymentMethodsOpen = false;
    }
  }

  onPaymentTypeChange() {
    this.isInstallmentsOpen = this.paymentType === 'installments';
    this.isPaymentMethodsOpen = this.paymentType === 'paymentMethods';
  }

  selectPaymentType(type: string) {
    this.paymentType = type;
  }

  togglePaymentMethodsDropdown() {
    this.isPaymentMethodsOpen = !this.isPaymentMethodsOpen;
  }

  selectPaymentMethod(method: 'creditCard' | 'transfer'): void {
    this.paymentMethod = method;
    this.onPaymentMethodChange();
  }

  onPaymentMethodChange() {
    this.updatePaymentOption();
  }

  updatePaymentOption() {
    console.log('updatePaymentOption');
  }

  toggleInstallmentsDropdown() {
    this.isInstallmentsOpen = !this.isInstallmentsOpen;
  }

  selectInstallmentOption(option: string): void {
    this.installmentOption = option;
    this.onInstallmentOptionChange();
  }

}
