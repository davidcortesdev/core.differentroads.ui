import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReservationCouponService } from '../../../core/services/checkout/reservation-coupon.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-apply-coupon-modal',
  templateUrl: './apply-coupon-modal.component.html',
  styleUrls: ['./apply-coupon-modal.component.scss'],
  standalone: false,
})
export class ApplyCouponModalComponent {
  @Input() visible: boolean = false;
  @Input() reservationId: number = 0;
  @Input() userId: number = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() couponApplied = new EventEmitter<void>();

  discountCode: string = '';
  discountMessage: string = '';
  discountMessageSeverity: 'success' | 'error' | 'info' | 'warn' = 'info';
  isApplying: boolean = false;

  constructor(
    private readonly reservationCouponService: ReservationCouponService
  ) {}

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  resetForm(): void {
    this.discountCode = '';
    this.discountMessage = '';
    this.discountMessageSeverity = 'info';
    this.isApplying = false;
  }

  validateDiscountCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Solo permitir letras (mayúsculas y minúsculas), números y guiones
    const filteredValue = value.replace(/[^a-zA-Z0-9-]/g, '');
    // Limitar a 20 caracteres
    const limitedValue = filteredValue.substring(0, 20);
    
    if (value !== limitedValue) {
      this.discountCode = limitedValue;
      input.value = limitedValue;
    }
  }

  applyCoupon(): void {
    if (!this.discountCode || this.discountCode.trim() === '') {
      this.discountMessage = 'Por favor, ingresa un código de descuento';
      this.discountMessageSeverity = 'warn';
      return;
    }

    if (!this.userId || this.userId <= 0) {
      this.discountMessage = 'Error: faltan datos necesarios para aplicar el descuento';
      this.discountMessageSeverity = 'error';
      return;
    }

    if (!this.reservationId || this.reservationId <= 0) {
      this.discountMessage = 'Error: faltan datos de la reserva';
      this.discountMessageSeverity = 'error';
      return;
    }

    const trimmedCode = this.discountCode.trim();
    this.isApplying = true;
    this.discountMessage = '';

    this.reservationCouponService
      .apply(trimmedCode, this.reservationId, this.userId)
      .pipe(
        catchError((error) => {
          console.error('Error al aplicar código de descuento:', error);
          this.discountMessage = 'Error al aplicar el código de descuento';
          this.discountMessageSeverity = 'error';
          this.isApplying = false;
          return of(false);
        })
      )
      .subscribe((success: boolean) => {
        this.isApplying = false;
        if (success) {
          this.discountMessage = 'Código de descuento aplicado correctamente';
          this.discountMessageSeverity = 'success';
          // Emitir evento después de un breve delay para que el usuario vea el mensaje
          setTimeout(() => {
            this.couponApplied.emit();
            this.closeModal();
          }, 1500);
        } else {
          this.discountMessage = 'No se pudo aplicar el código de descuento';
          this.discountMessageSeverity = 'error';
        }
      });
  }
}

