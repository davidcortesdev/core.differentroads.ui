import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourItineraryV2Component } from './tour-itinerary-v2.component';

describe('TourItineraryV2Component', () => {
  let component: TourItineraryV2Component;
  let fixture: ComponentFixture<TourItineraryV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourItineraryV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourItineraryV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
