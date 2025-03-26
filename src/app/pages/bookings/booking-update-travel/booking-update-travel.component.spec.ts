import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingUpdateTravelComponent } from './booking-update-travel.component';

describe('BookingUpdateTravelComponent', () => {
  let component: BookingUpdateTravelComponent;
  let fixture: ComponentFixture<BookingUpdateTravelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingUpdateTravelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingUpdateTravelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
