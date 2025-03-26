import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingActivitiesComponent } from './booking-activities.component';

describe('BookingActivitiesComponent', () => {
  let component: BookingActivitiesComponent;
  let fixture: ComponentFixture<BookingActivitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingActivitiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingActivitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
