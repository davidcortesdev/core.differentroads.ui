import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingPaymentHistoryComponent } from './booking-payment-history.component';

describe('BookingPaymentHistoryComponent', () => {
  let component: BookingPaymentHistoryComponent;
  let fixture: ComponentFixture<BookingPaymentHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingPaymentHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingPaymentHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
