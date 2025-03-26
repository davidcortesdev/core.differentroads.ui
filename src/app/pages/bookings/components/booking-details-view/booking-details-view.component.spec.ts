import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingDetailsViewComponent } from './booking-details-view.component';

describe('BookingDetailsViewComponent', () => {
  let component: BookingDetailsViewComponent;
  let fixture: ComponentFixture<BookingDetailsViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingDetailsViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingDetailsViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
