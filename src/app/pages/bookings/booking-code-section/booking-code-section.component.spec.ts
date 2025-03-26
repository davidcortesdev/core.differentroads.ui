import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingCodeSectionComponent } from './booking-code-section.component';

describe('BookingCodeSectionComponent', () => {
  let component: BookingCodeSectionComponent;
  let fixture: ComponentFixture<BookingCodeSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingCodeSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingCodeSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
