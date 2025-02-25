import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentsInformationSectionComponent } from './payments-information-section.component';

describe('PaymentsInformationSectionComponent', () => {
  let component: PaymentsInformationSectionComponent;
  let fixture: ComponentFixture<PaymentsInformationSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PaymentsInformationSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentsInformationSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
