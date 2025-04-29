import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingListSectionComponent } from './booking-list-section.component';

describe('BookingListSectionComponent', () => {
  let component: BookingListSectionComponent;
  let fixture: ComponentFixture<BookingListSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingListSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingListSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
