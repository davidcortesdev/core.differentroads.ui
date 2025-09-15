import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnersSectionV2Component } from './partners-section-v2.component';

describe('PartnersSectionV2Component', () => {
  let component: PartnersSectionV2Component;
  let fixture: ComponentFixture<PartnersSectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PartnersSectionV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(PartnersSectionV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
