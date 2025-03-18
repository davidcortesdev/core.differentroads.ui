import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

interface DiscountCode {
  id: string;
  code: string;
  description: string;
  amount: number;
  isActive: boolean;
  type: 'percentage' | 'fixed' | 'shipping';
}

@Component({
  selector: 'app-discount-code',
  standalone: false,
  templateUrl: './discount-code.component.html',
  styleUrl: './discount-code.component.scss'
})
export class DiscountCodeComponent implements OnInit {
  @Output() discountApplied = new EventEmitter<{
    code: string;
    amount: number;
    type: string;
  }>();
  
  discountForm: FormGroup;
  appliedDiscount: DiscountCode | null = null;
  
  // Datos mockeados de códigos de descuento
  availableDiscounts: DiscountCode[] = [
    {
      id: 'DESC001',
      code: 'WELCOME20',
      description: '20% de descuento en su primera compra',
      amount: 20,
      isActive: true,
      type: 'percentage'
    },
    {
      id: 'DESC002',
      code: 'SUMMER2025',
      description: '15€ de descuento en compras de verano',
      amount: 15,
      isActive: true,
      type: 'fixed'
    },
    {
      id: 'DESC003',
      code: 'FREESHIP',
      description: 'Envío gratuito en su pedido',
      amount: 5,
      isActive: true,
      type: 'shipping'
    },
    {
      id: 'DESC004',
      code: 'EXPIRED10',
      description: '10% de descuento en productos seleccionados',
      amount: 10,
      isActive: false,
      type: 'percentage'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.discountForm = this.fb.group({
      code: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // No es necesario inicializar nada más, ya que los datos están mockeados
  }

  validateDiscountCode(): void {
    if (this.discountForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor ingrese un código de descuento'
      });
      return;
    }

    const enteredCode = this.discountForm.get('code')?.value;
    
    // Buscar el código entre los descuentos disponibles
    const foundDiscount = this.availableDiscounts.find(
      discount => discount.code === enteredCode
    );
    
    if (foundDiscount && foundDiscount.isActive) {
      this.appliedDiscount = foundDiscount;
      
      // Emitir el evento para que el componente padre actualice el total
      this.discountApplied.emit({
        code: foundDiscount.code,
        amount: foundDiscount.amount,
        type: foundDiscount.type
      });
      
      let successMessage = '';
      if (foundDiscount.type === 'percentage') {
        successMessage = `Código de descuento aplicado: ${foundDiscount.amount}%`;
      } else if (foundDiscount.type === 'fixed') {
        successMessage = `Código de descuento aplicado: ${foundDiscount.amount}€`;
      } else {
        successMessage = 'Código de envío gratuito aplicado';
      }
      
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: successMessage
      });
    } else if (foundDiscount && !foundDiscount.isActive) {
      this.appliedDiscount = null;
      
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Este código de descuento ha expirado'
      });
    } else {
      this.appliedDiscount = null;
      
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Código de descuento inválido'
      });
    }
  }

  clearDiscount(): void {
    this.appliedDiscount = null;
    this.discountForm.reset();
    
    // Emitir evento para cancelar el descuento en el componente padre
    this.discountApplied.emit({
      code: '',
      amount: 0,
      type: ''
    });
  }
}