import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingDocumentationV2Component } from './booking-documentation.component';

describe('BookingDocumentationV2Component', () => {
  let component: BookingDocumentationV2Component;
  let fixture: ComponentFixture<BookingDocumentationV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingDocumentationV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingDocumentationV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
