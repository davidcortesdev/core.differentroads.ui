import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItineraryDayComponent } from './itinerary-day.component';

describe('ItineraryDayComponent', () => {
  let component: ItineraryDayComponent;
  let fixture: ComponentFixture<ItineraryDayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ItineraryDayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItineraryDayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
