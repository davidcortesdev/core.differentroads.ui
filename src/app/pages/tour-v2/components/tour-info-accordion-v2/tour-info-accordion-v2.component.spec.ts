import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourInfoAccordionV2Component } from './tour-info-accordion-v2.component';

describe('TourInfoAccordionV2Component', () => {
  let component: TourInfoAccordionV2Component;
  let fixture: ComponentFixture<TourInfoAccordionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourInfoAccordionV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourInfoAccordionV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
