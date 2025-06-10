import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourHighlightsV2Component } from './tour-highlights-v2.component';

describe('TourHighlightsV2Component', () => {
  let component: TourHighlightsV2Component;
  let fixture: ComponentFixture<TourHighlightsV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourHighlightsV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourHighlightsV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
