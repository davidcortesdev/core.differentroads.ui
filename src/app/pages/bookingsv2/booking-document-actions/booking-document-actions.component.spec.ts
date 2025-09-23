import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingDocumentActionsV2Component } from './booking-document-actions.component';

describe('BookingDocumentActionsV2Component', () => {
  let component: BookingDocumentActionsV2Component;
  let fixture: ComponentFixture<BookingDocumentActionsV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingDocumentActionsV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingDocumentActionsV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
