import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingHeaderSectionComponent } from './booking-header-section.component';

describe('BookingHeaderSectionComponent', () => {
  let component: BookingHeaderSectionComponent;
  let fixture: ComponentFixture<BookingHeaderSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingHeaderSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingHeaderSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
