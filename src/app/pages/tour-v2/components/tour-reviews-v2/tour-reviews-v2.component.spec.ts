import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourReviewsV2Component } from './tour-reviews-v2.component';

describe('TourReviewsV2Component', () => {
  let component: TourReviewsV2Component;
  let fixture: ComponentFixture<TourReviewsV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourReviewsV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourReviewsV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
