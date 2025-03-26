import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingDocumentActionsComponent } from './booking-document-actions.component';

describe('BookingDocumentActionsComponent', () => {
  let component: BookingDocumentActionsComponent;
  let fixture: ComponentFixture<BookingDocumentActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingDocumentActionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingDocumentActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
