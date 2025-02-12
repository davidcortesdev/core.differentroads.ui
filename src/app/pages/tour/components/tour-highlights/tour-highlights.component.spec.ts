import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourHighlightsComponent } from './tour-highlights.component';

describe('TourHighlightsComponent', () => {
  let component: TourHighlightsComponent;
  let fixture: ComponentFixture<TourHighlightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourHighlightsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourHighlightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
