import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourReviewsComponent } from './tour-reviews.component';

describe('TourReviewsComponent', () => {
  let component: TourReviewsComponent;
  let fixture: ComponentFixture<TourReviewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourReviewsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourReviewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
