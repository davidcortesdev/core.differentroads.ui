import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembershipBenefitsComponent } from './membership-benefits.component';

describe('MembershipBenefitsComponent', () => {
  let component: MembershipBenefitsComponent;
  let fixture: ComponentFixture<MembershipBenefitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MembershipBenefitsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembershipBenefitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
