import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewSectionV2Component } from './review-section-v2.component';

describe('ReviewSectionV2Component', () => {
  let component: ReviewSectionV2Component;
  let fixture: ComponentFixture<ReviewSectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReviewSectionV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewSectionV2Component);
    component = fixture.componentInstance;
    component.userId = 'test-user-123';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.userId).toBe('test-user-123');
    expect(component.reviewsCards).toEqual([]);
    expect(component.isExpanded).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('should generate mock data on init', () => {
    // Wait for async mock data generation
    setTimeout(() => {
      expect(component.reviewsCards.length).toBe(3);
      expect(component.reviewsCards[0].tour).toContain('Italia');
      expect(component.reviewsCards[0].score).toBe(5);
    }, 1100);
  });

  it('should toggle expanded state', () => {
    expect(component.isExpanded).toBeTrue();
    
    component.toggleContent();
    expect(component.isExpanded).toBeFalse();
    
    component.toggleContent();
    expect(component.isExpanded).toBeTrue();
  });

  it('should generate rating array correctly', () => {
    const ratingArray = component.getRatingArray(4);
    expect(ratingArray).toEqual([0, 0, 0, 0]);
  });

  it('should generate rating array for 5 stars', () => {
    const ratingArray = component.getRatingArray(5);
    expect(ratingArray).toEqual([0, 0, 0, 0, 0]);
  });

  it('should generate empty array for 0 rating', () => {
    const ratingArray = component.getRatingArray(0);
    expect(ratingArray).toEqual([]);
  });

  it('should generate mock reviews with correct structure', () => {
    const mockReviews = component['generateMockReviews']();
    
    expect(mockReviews.length).toBe(3);
    expect(mockReviews[0].id).toBeDefined();
    expect(mockReviews[0].review).toBeDefined();
    expect(mockReviews[0].score).toBeDefined();
    expect(mockReviews[0].traveler).toBeDefined();
    expect(mockReviews[0].tour).toBeDefined();
    expect(mockReviews[0].date).toBeDefined();
    expect(mockReviews[0].tourId).toBeDefined();
  });

  it('should include user suffix in review IDs', () => {
    component.userId = 'test-user-456';
    const mockReviews = component['generateMockReviews']();
    
    expect(mockReviews[0].id).toContain('456');
    expect(mockReviews[0].traveler).toContain('456');
  });

  it('should set loading state during mock data generation', () => {
    component['generateMockData']();
    expect(component.loading).toBeTrue();
  });
});