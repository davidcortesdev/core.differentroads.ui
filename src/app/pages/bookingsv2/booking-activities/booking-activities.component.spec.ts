import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingActivitiesV2Component } from './booking-activities.component';

describe('BookingActivitiesV2Component', () => {
  let component: BookingActivitiesV2Component;
  let fixture: ComponentFixture<BookingActivitiesV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingActivitiesV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingActivitiesV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
