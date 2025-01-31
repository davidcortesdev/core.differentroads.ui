import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityReviewsComponent } from './community-reviews.component';

describe('CommunityReviewsComponent', () => {
  let component: CommunityReviewsComponent;
  let fixture: ComponentFixture<CommunityReviewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CommunityReviewsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommunityReviewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
