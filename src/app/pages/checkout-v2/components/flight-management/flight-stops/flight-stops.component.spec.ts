import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlightStopsComponent } from './flight-stops.component';

describe('FlightStopsComponent', () => {
  let component: FlightStopsComponent;
  let fixture: ComponentFixture<FlightStopsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FlightStopsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlightStopsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
