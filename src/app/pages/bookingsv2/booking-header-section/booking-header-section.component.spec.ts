import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingHeaderSectionV2Component } from './booking-header-section.component';

describe('BookingHeaderSectionV2Component', () => {
  let component: BookingHeaderSectionV2Component;
  let fixture: ComponentFixture<BookingHeaderSectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingHeaderSectionV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingHeaderSectionV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
