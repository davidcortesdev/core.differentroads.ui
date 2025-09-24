import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingCodeSectionV2Component } from './booking-code-section.component';

describe('BookingCodeSectionV2Component', () => {
  let component: BookingCodeSectionV2Component;
  let fixture: ComponentFixture<BookingCodeSectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingCodeSectionV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingCodeSectionV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
