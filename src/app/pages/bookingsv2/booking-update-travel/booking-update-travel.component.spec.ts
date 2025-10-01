import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingUpdateTravelV2Component } from './booking-update-travel.component';

describe('BookingUpdateTravelV2Component', () => {
  let component: BookingUpdateTravelV2Component;
  let fixture: ComponentFixture<BookingUpdateTravelV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingUpdateTravelV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingUpdateTravelV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
