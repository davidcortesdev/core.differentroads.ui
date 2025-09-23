import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingDetailsViewV2Component } from './booking-details-view.component';

describe('BookingDetailsViewV2Component', () => {
  let component: BookingDetailsViewV2Component;
  let fixture: ComponentFixture<BookingDetailsViewV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingDetailsViewV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingDetailsViewV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
