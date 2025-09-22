import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingFlightsV2Component } from './booking-flights.component';

describe('BookingFlightsV2Component', () => {
  let component: BookingFlightsV2Component;
  let fixture: ComponentFixture<BookingFlightsV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingFlightsV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingFlightsV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
