import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CouponsService } from '../../../../core/services/coupons.service';
import { finalize } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface DiscountCode {
  id: string;
  code: string;
  description: string;
  amount: number;
  isActive: boolean;
}

@Component({
  selector: 'app-discount-code',
  standalone: false,
  templateUrl: './discount-code.component.html',
  styleUrl: './discount-code.component.scss',
})
export class DiscountCodeComponent implements OnInit, OnChanges {
  @Input() orderTotal: number = 0;
  @Input() existingDiscount: {
    code: string;
    amount: number;
    discountValue: number;
  } | null = null;

  @Output() discountApplied = new EventEmitter<{
    code: string;
    amount: number;
    discountValue: number;
    type: string;
  }>();

  discountForm: FormGroup;
  appliedDiscount: DiscountCode | null = null;
  isLoading: boolean = false;

  // Add this flag to prevent infinite loops
  private isInitializing = false;
  private initializedCode: string | null = null;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private couponsService: CouponsService,
    private sanitizer: DomSanitizer
  ) {
    this.discountForm = this.fb.group({
      code: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Initialize discount from existing data if present
    this.initializeExistingDiscount();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only initialize if the discount code has changed and isn't being initialized
    if (
      changes['existingDiscount'] &&
      !this.isInitializing &&
      this.existingDiscount?.code !== this.initializedCode
    ) {
      this.initializeExistingDiscount();
    }
  }

  validateDiscountCode(): void {
    if (this.discountForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor ingrese un código de descuento',
      });
      return;
    }

    const enteredCode = this.discountForm.get('code')?.value;
    this.isLoading = true;

    // Use the CouponsService to validate the code
    this.couponsService
      .getCouponByCode(enteredCode)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (coupon) => {
          if (coupon && coupon.isActive) {
            this.appliedDiscount = {
              id: coupon.id,
              code: coupon.discountCode,
              description: coupon.description,
              amount: coupon.discountAmount,
              isActive: coupon.isActive,
            };

            // Calculate the value of the discount
            const discountValue = this.calculateDiscountValue(
              this.appliedDiscount
            );

            // Emit the event for parent component
            this.discountApplied.emit({
              code: this.appliedDiscount.code,
              amount: this.appliedDiscount.amount,
              discountValue: discountValue,
              type: 'coupon',
            });

            this.showSuccessMessage(this.appliedDiscount);
          } else {
            this.handleInactiveCoupon();
          }
        },
        error: (error) => {
          this.handleInvalidCode();
        },
      });
  }

  clearDiscount(): void {
    this.appliedDiscount = null;
    this.discountForm.reset();

    // Emit event to cancel the discount in the parent component
    this.discountApplied.emit({
      code: '',
      amount: 0,
      discountValue: 0,
      type: 'coupon',
    });
  }

  // Calculate the value of the discount - only fixed type is supported
  private calculateDiscountValue(discount: DiscountCode): number {
    // Since all discounts are fixed, we just return the amount directly
    return discount.amount;
  }

  private showSuccessMessage(discount: DiscountCode): void {
    const successMessage = `Código de descuento aplicado: ${discount.amount}€`;

    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: successMessage,
    });
  }

  private handleInactiveCoupon(): void {
    this.appliedDiscount = null;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Este código de descuento ha expirado',
    });
  }

  private handleInvalidCode(): void {
    this.appliedDiscount = null;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Código de descuento inválido',
    });
  }

  // Add method to sanitize HTML content
  getSanitizedDescription(description: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(description);
  }

  // New method to initialize discount from existing data
  private initializeExistingDiscount(): void {
    if (
      this.existingDiscount &&
      this.existingDiscount.code &&
      this.existingDiscount.code !== this.initializedCode
    ) {
      this.isInitializing = true;
      this.initializedCode = this.existingDiscount.code;

      // Set the code in the form first - this prevents another initialization
      this.discountForm.get('code')?.setValue(this.existingDiscount.code);

      this.couponsService
        .getCouponByCode(this.existingDiscount.code)
        .pipe(finalize(() => (this.isInitializing = false)))
        .subscribe({
          next: (coupon) => {
            if (coupon && coupon.isActive) {
              this.appliedDiscount = {
                id: coupon.id,
                code: coupon.discountCode,
                description: coupon.description,
                amount: coupon.discountAmount,
                isActive: coupon.isActive,
              };

              // Don't emit the event during initialization to prevent loops
              // Only set the local state
            }
          },
          error: () => {
            // If we can't find the coupon, ignore it
            console.warn(
              `Could not find coupon with code: ${this.existingDiscount!.code}`
            );
          },
        });
    }
  }
}
