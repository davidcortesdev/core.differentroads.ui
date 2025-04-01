import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingPersonalDataComponent } from './booking-personal-data.component';

describe('BookingPersonalDataComponent', () => {
  let component: BookingPersonalDataComponent;
  let fixture: ComponentFixture<BookingPersonalDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingPersonalDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingPersonalDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
