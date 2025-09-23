import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingPaymentHistoryV2Component } from './booking-payment-history.component';

describe('BookingPaymentHistoryV2Component', () => {
  let component: BookingPaymentHistoryV2Component;
  let fixture: ComponentFixture<BookingPaymentHistoryV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingPaymentHistoryV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingPaymentHistoryV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
