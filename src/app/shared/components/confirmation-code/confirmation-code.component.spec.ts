import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationCodeComponent } from './confirmation-code.component';
import { AuthenticateService } from '../../../core/services/auth/auth-service.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

describe('ConfirmationCodeComponent', () => {
  let component: ConfirmationCodeComponent;
  let fixture: ComponentFixture<ConfirmationCodeComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthenticateService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('AuthenticateService', ['confirmSignUp']);
    
    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        ConfirmationCodeComponent
      ],
      providers: [
        { provide: AuthenticateService, useValue: spy }
      ]
    }).compileComponents();

    authServiceSpy = TestBed.inject(AuthenticateService) as jasmine.SpyObj<AuthenticateService>;
    fixture = TestBed.createComponent(ConfirmationCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with provided username', () => {
    component.username = 'test@example.com';
    component.ngOnInit();
    expect(component.confirmForm.get('username')?.value).toBe('test@example.com');
  });

  it('should validate confirmation code format', () => {
    const confirmationCodeControl = component.confirmForm.get('confirmationCode');
    confirmationCodeControl?.setValue('');
    expect(confirmationCodeControl?.valid).toBeFalsy();
    
    confirmationCodeControl?.setValue('abc');
    expect(confirmationCodeControl?.valid).toBeFalsy();
    
    confirmationCodeControl?.setValue('123456');
    expect(confirmationCodeControl?.valid).toBeTruthy();
  });

  it('should emit success event when confirmation is successful', async () => {
    // Setup
    authServiceSpy.confirmSignUp.and.returnValue(Promise.resolve());
    component.username = 'test@example.com';
    component.ngOnInit();
    component.confirmForm.get('confirmationCode')?.setValue('123456');
    
    // Spy on the output event
    spyOn(component.confirmSuccess, 'emit');
    
    // Act
    await component.onConfirm();
    
    // Assert
    expect(authServiceSpy.confirmSignUp).toHaveBeenCalledWith('test@example.com', '123456');
    expect(component.confirmSuccess.emit).toHaveBeenCalled();
  });

  it('should handle confirmation error', async () => {
    // Setup
    const errorMessage = 'Invalid code';
    authServiceSpy.confirmSignUp.and.returnValue(Promise.reject({message: errorMessage}));
    component.username = 'test@example.com';
    component.ngOnInit();
    component.confirmForm.get('confirmationCode')?.setValue('123456');
    
    // Spy on the output event
    spyOn(component.errorMessageChange, 'emit');
    
    // Act
    await component.onConfirm();
    
    // Assert
    expect(component.errorMessageChange.emit).toHaveBeenCalledWith(errorMessage);
  });
});