import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlightItineraryComponent } from './flight-itinerary.component';

describe('FlightItineraryComponent', () => {
  let component: FlightItineraryComponent;
  let fixture: ComponentFixture<FlightItineraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FlightItineraryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlightItineraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
