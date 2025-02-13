import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveBookingsSectionComponent } from './active-bookings-section.component';

describe('ActiveBookingsSectionComponent', () => {
  let component: ActiveBookingsSectionComponent;
  let fixture: ComponentFixture<ActiveBookingsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ActiveBookingsSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiveBookingsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
