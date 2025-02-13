import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourItineraryComponent } from './tour-itinerary.component';

describe('TourItineraryComponent', () => {
  let component: TourItineraryComponent;
  let fixture: ComponentFixture<TourItineraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourItineraryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourItineraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
