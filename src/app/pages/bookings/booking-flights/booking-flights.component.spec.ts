import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingFlightsComponent } from './booking-flights.component';

describe('BookingFlightsComponent', () => {
  let component: BookingFlightsComponent;
  let fixture: ComponentFixture<BookingFlightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingFlightsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingFlightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
