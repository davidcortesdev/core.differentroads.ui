import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingPersonalDataV2Component } from './booking-personal-data.component';

describe('BookingPersonalDataV2Component', () => {
  let component: BookingPersonalDataV2Component;
  let fixture: ComponentFixture<BookingPersonalDataV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingPersonalDataV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingPersonalDataV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
