import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityReviewsV2Component } from './community-reviews-v2.component';

describe('CommunityReviewsV2Component', () => {
  let component: CommunityReviewsV2Component;
  let fixture: ComponentFixture<CommunityReviewsV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CommunityReviewsV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityReviewsV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
