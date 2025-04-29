import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingDocumentationComponent } from './booking-documentation.component';

describe('BookingDocumentationComponent', () => {
  let component: BookingDocumentationComponent;
  let fixture: ComponentFixture<BookingDocumentationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingDocumentationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingDocumentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
