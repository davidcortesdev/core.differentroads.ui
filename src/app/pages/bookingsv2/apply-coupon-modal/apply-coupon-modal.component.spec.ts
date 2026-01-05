import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplyCouponModalComponent } from './apply-coupon-modal.component';

describe('ApplyCouponModalComponent', () => {
  let component: ApplyCouponModalComponent;
  let fixture: ComponentFixture<ApplyCouponModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ApplyCouponModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplyCouponModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

