import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutV2Component } from './checkout-v2.component';

describe('CheckoutV2Component', () => {
  let component: CheckoutV2Component;
  let fixture: ComponentFixture<CheckoutV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CheckoutV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckoutV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
