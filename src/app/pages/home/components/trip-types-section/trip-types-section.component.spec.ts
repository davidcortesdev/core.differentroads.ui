import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripTypesSectionComponent } from './trip-types-section.component';

describe('TripTypesSectionComponent', () => {
  let component: TripTypesSectionComponent;
  let fixture: ComponentFixture<TripTypesSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TripTypesSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripTypesSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
