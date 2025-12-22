import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { PaymentManagementComponent, PaymentType, PaymentMethod, InstallmentOption } from './payment-management.component';
import { NewScalapayService } from '../../services/newScalapay.service';

describe('PaymentManagementComponent', () => {
  let component: PaymentManagementComponent;
  let fixture: ComponentFixture<PaymentManagementComponent>;
  let mockScalapayService: jasmine.SpyObj<NewScalapayService>;

  beforeEach(async () => {
    const scalapayServiceSpy = jasmine.createSpyObj('NewScalapayService', ['createOrder']);

    await TestBed.configureTestingModule({
      declarations: [PaymentManagementComponent],
      imports: [FormsModule],
      providers: [
        { provide: NewScalapayService, useValue: scalapayServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentManagementComponent);
    component = fixture.componentInstance;
    mockScalapayService = TestBed.inject(NewScalapayService) as jasmine.SpyObj<NewScalapayService>;
    
    // Set required inputs
    component.totalPrice = 1000;
    component.reservationId = 123;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default state', () => {
      expect(component.dropdownStates.main).toBe(true);
      expect(component.dropdownStates.paymentMethods).toBe(true);
      expect(component.dropdownStates.installments).toBe(true);
      expect(component.paymentType).toBeNull();
      expect(component.paymentMethod).toBeNull();
      expect(component.installmentOption).toBeNull();
      expect(component.isLoading).toBe(false);
    });

    it('should load scalapay script on init', () => {
      spyOn(document, 'querySelector').and.returnValue(null);
      spyOn(document.head, 'appendChild');
      
      component.ngOnInit();
      
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('should not load scalapay script if already loaded', () => {
      spyOn(document, 'querySelector').and.returnValue(document.createElement('script'));
      spyOn(document.head, 'appendChild');
      
      component.ngOnInit();
      
      expect(document.head.appendChild).not.toHaveBeenCalled();
    });
  });

  describe('Payment Type Selection', () => {
    it('should select complete payment type', () => {
      component.selectPaymentType('complete');
      
      expect(component.paymentType).toBe('complete');
      expect(component.dropdownStates.paymentMethods).toBe(true);
      expect(component.dropdownStates.installments).toBe(false);
    });

    it('should select deposit payment type', () => {
      component.selectPaymentType('deposit');
      
      expect(component.paymentType).toBe('deposit');
      expect(component.dropdownStates.paymentMethods).toBe(true);
      expect(component.dropdownStates.installments).toBe(false);
    });

    it('should select installments payment type', () => {
      component.selectPaymentType('installments');
      
      expect(component.paymentType).toBe('installments');
      expect(component.dropdownStates.installments).toBe(true);
      expect(component.dropdownStates.paymentMethods).toBe(false);
    });

    it('should reset related selections when changing payment type', () => {
      // Set initial values
      component.selectPaymentMethod('creditCard');
      component.selectInstallmentOption('three');
      
      // Change to installments
      component.selectPaymentType('installments');
      expect(component.paymentMethod).toBeNull();
      
      // Change back to complete
      component.selectPaymentType('complete');
      expect(component.installmentOption).toBeNull();
    });
  });

  describe('Payment Method Selection', () => {
    it('should select credit card method', () => {
      component.selectPaymentMethod('creditCard');
      expect(component.paymentMethod).toBe('creditCard');
    });

    it('should select transfer method', () => {
      component.selectPaymentMethod('transfer');
      expect(component.paymentMethod).toBe('transfer');
    });
  });

  describe('Installment Option Selection', () => {
    it('should select three installments', () => {
      spyOn(component as any, 'reloadScalapayWidgets');
      
      component.selectInstallmentOption('three');
      
      expect(component.installmentOption).toBe('three');
      expect((component as any).reloadScalapayWidgets).toHaveBeenCalled();
    });

    it('should select four installments', () => {
      spyOn(component as any, 'reloadScalapayWidgets');
      
      component.selectInstallmentOption('four');
      
      expect(component.installmentOption).toBe('four');
      expect((component as any).reloadScalapayWidgets).toHaveBeenCalled();
    });
  });

  describe('Dropdown Management', () => {
    it('should toggle main dropdown', () => {
      const initialState = component.dropdownStates.main;
      component.toggleDropdown('main');
      expect(component.dropdownStates.main).toBe(!initialState);
    });

    it('should close other dropdowns when main is closed', () => {
      component.dropdownStates.main = true;
      component.dropdownStates.paymentMethods = true;
      component.dropdownStates.installments = true;
      
      component.toggleDropdown('main'); // This will close main
      
      expect(component.dropdownStates.main).toBe(false);
      expect(component.dropdownStates.paymentMethods).toBe(false);
      expect(component.dropdownStates.installments).toBe(false);
    });
  });

  describe('Payment Validation', () => {
    it('should be invalid when no payment type is selected', () => {
      expect(component.isPaymentValid).toBe(false);
    });

    it('should be invalid for complete payment without method', () => {
      component.selectPaymentType('complete');
      expect(component.isPaymentValid).toBe(false);
    });

    it('should be valid for complete payment with method', () => {
      component.selectPaymentType('complete');
      component.selectPaymentMethod('creditCard');
      expect(component.isPaymentValid).toBe(true);
    });

    it('should be invalid for installments without option', () => {
      component.selectPaymentType('installments');
      expect(component.isPaymentValid).toBe(false);
    });

    it('should be valid for installments with option', () => {
      component.selectPaymentType('installments');
      component.selectInstallmentOption('three');
      expect(component.isPaymentValid).toBe(true);
    });
  });

  describe('Button Label', () => {
    it('should show processing label when loading', () => {
      component['paymentState'].isLoading = true;
      expect(component.buttonLabel).toBe('Procesando...');
    });

    it('should show default label when not loading', () => {
      component['paymentState'].isLoading = false;
      expect(component.buttonLabel).toBe('Realizar pago');
    });
  });

  describe('Payment Submission', () => {
    it('should not process payment if invalid', async () => {
      spyOn(component.paymentCompleted, 'emit');
      
      await component.submitPayment();
      
      expect(component.paymentCompleted.emit).not.toHaveBeenCalled();
      expect(mockScalapayService.createOrder).not.toHaveBeenCalled();
    });

    it('should process regular payment for complete type', async () => {
      spyOn(component.paymentCompleted, 'emit');
      component.selectPaymentType('complete');
      component.selectPaymentMethod('creditCard');
      
      await component.submitPayment();
      
      expect(component.paymentCompleted.emit).toHaveBeenCalledWith({
        type: 'complete',
        method: 'creditCard'
      });
    });

    it('should process installment payment', async () => {
      const mockResponse = { 
        checkoutUrl: 'https://test-checkout.com',
        token: 'test-token',
        expiresAt: new Date(),
        order: {
          totalAmount: { amount: '1000.00', currency: 'EUR' },
          merchantReference: 'test-ref',
          status: 'active',
          createdAt: new Date()
        }
      };
      mockScalapayService.createOrder.and.returnValue(of(mockResponse));
      
      const originalLocation = window.location.href;
      delete (window as any).location;
      window.location = { href: '' } as any;
      
      component.selectPaymentType('installments');
      component.selectInstallmentOption('three');
      
      await component.submitPayment();
      
      expect(mockScalapayService.createOrder).toHaveBeenCalledWith(123, 3);
      expect(window.location.href).toBe('https://test-checkout.com');
      
      // Restore original location
      window.location.href = originalLocation;
    });

    it('should handle payment processing errors', async () => {
      mockScalapayService.createOrder.and.throwError('Test error');
      
      component.selectPaymentType('installments');
      component.selectInstallmentOption('three');
      
      await component.submitPayment();
      
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Back Navigation', () => {
    it('should emit back requested event', () => {
      spyOn(component.backRequested, 'emit');
      
      component.goBack();
      
      expect(component.backRequested.emit).toHaveBeenCalled();
    });
  });

  describe('Scalapay Widget Management', () => {
    it('should update price containers and dispatch reload event', () => {
      spyOn(window, 'dispatchEvent');
      const mockElement = { textContent: '' };
      spyOn(document, 'getElementById').and.returnValue(mockElement as any);
      
      component['reloadScalapayWidgets']();
      
      setTimeout(() => {
        expect(mockElement.textContent).toBe('€ 1000.00');
        expect(window.dispatchEvent).toHaveBeenCalledWith(
          jasmine.objectContaining({ type: 'scalapay-widget-reload' })
        );
      }, 250);
    });
  });
});
