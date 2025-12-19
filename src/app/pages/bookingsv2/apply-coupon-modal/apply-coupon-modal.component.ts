import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReservationCouponService } from '../../../core/services/checkout/reservation-coupon.service';
import { AuthenticateService } from '../../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../../core/services/users/usersNet.service';
import { catchError, switchMap, take } from 'rxjs/operators';
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

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() couponApplied = new EventEmitter<void>();

  discountCode: string = '';
  discountMessage: string = '';
  discountMessageSeverity: 'success' | 'error' | 'info' | 'warn' = 'info';
  isApplying: boolean = false;

  constructor(
    private readonly reservationCouponService: ReservationCouponService,
    private readonly authService: AuthenticateService,
    private readonly usersNetService: UsersNetService
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

    if (!this.reservationId || this.reservationId <= 0) {
      this.discountMessage = 'Error: faltan datos de la reserva';
      this.discountMessageSeverity = 'error';
      return;
    }

    const trimmedCode = this.discountCode.trim();
    this.isApplying = true;
    this.discountMessage = '';

    // Obtener el userId del usuario logueado (NO de la reserva)
    this.authService
      .getUserAttributes()
      .pipe(
        take(1),
        catchError((error) => {
          this.discountMessage = 'Error: No se pudo obtener la información del usuario logueado';
          this.discountMessageSeverity = 'error';
          this.isApplying = false;
          return of(null);
        }),
        switchMap((attributes) => {
          if (!attributes) {
            this.discountMessage = 'Error: Debes estar logueado para aplicar un cupón';
            this.discountMessageSeverity = 'error';
            this.isApplying = false;
            return of(null);
          }

          const email = attributes?.email;
          if (!email) {
            this.discountMessage = 'Error: Debes estar logueado para aplicar un cupón';
            this.discountMessageSeverity = 'error';
            this.isApplying = false;
            return of(null);
          }

          // Obtener usuario por email directamente (mismo patrón que el header)
          return this.usersNetService.getUsersByEmail(email).pipe(
            take(1),
            catchError((error) => {
              this.discountMessage = 'Error: No se pudo buscar el usuario';
              this.discountMessageSeverity = 'error';
              this.isApplying = false;
              return of(null);
            })
          );
        }),
        switchMap((users) => {
          if (!users) {
            return of(null);
          }

          if (!users || users.length === 0) {
            this.discountMessage = 'Error: No se encontró el usuario logueado';
            this.discountMessageSeverity = 'error';
            this.isApplying = false;
            return of(null);
          }

          const userId = users[0]?.id;
          if (!userId) {
            this.discountMessage = 'Error: No se pudo obtener el ID del usuario';
            this.discountMessageSeverity = 'error';
            this.isApplying = false;
            return of(null);
          }

          // Aplicar el cupón con el userId del usuario logueado (NO de la reserva)
          return this.reservationCouponService.apply(trimmedCode, this.reservationId, userId).pipe(
            catchError((error) => {
              this.discountMessage = 'Error al aplicar el código de descuento';
              this.discountMessageSeverity = 'error';
              this.isApplying = false;
              return of(false);
            })
          );
        })
      )
      .subscribe((success: boolean | null) => {
        this.isApplying = false;
        
        if (success === null) {
          return;
        }

        if (success) {
          this.discountMessage = 'Código de descuento aplicado correctamente';
          this.discountMessageSeverity = 'success';
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

