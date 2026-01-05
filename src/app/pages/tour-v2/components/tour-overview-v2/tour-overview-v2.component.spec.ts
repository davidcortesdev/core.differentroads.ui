import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TourOverviewV2Component } from './tour-overview-v2.component';
import { TourService } from '../../../../core/services/tour/tour.service';
import { CMSTourService } from '../../../../core/services/cms/cms-tour.service';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('TourOverviewV2Component', () => {
  let component: TourOverviewV2Component;
  let fixture: ComponentFixture<TourOverviewV2Component>;
  let tourNetService: jasmine.SpyObj<TourNetService>;
  let cmsTourServiceSpy: jasmine.SpyObj<CMSTourService>;

  const mockTour = {
    id: 1,
    code: 'TOUR-001',
    name: 'Test Tour',
    description: 'This is a test tour description.'
  };

  const mockCMSTour = {
    id: 1,
    tourId: '1',
    imageUrl: 'https://example.com/tour-image.jpg',
    imageAlt: 'Tour Image',
    creatorId: 123,
    creatorComments: 'This is a test creator comment.'
  };

  beforeEach(async () => {
    // Create spies
    tourNetService = jasmine.createSpyObj('TourNetService', ['getTourById']);
    cmsTourServiceSpy = jasmine.createSpyObj('CMSTourService', ['getAllTours']);
    
    // Setup return values
    tourNetService.getTourById.and.returnValue(of(mockTour));
    cmsTourServiceSpy.getAllTours.and.returnValue(of([mockCMSTour]));

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [TourOverviewV2Component],
      providers: [
        { provide: TourService, useValue: tourNetService },
        { provide: CMSTourService, useValue: cmsTourServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore child components for this test
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TourOverviewV2Component);
    component = fixture.componentInstance;
    component.tourId = 1;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tour and CMS data', () => {
    expect(tourNetService.getTourById).toHaveBeenCalledWith(1);
    expect(cmsTourServiceSpy.getAllTours).toHaveBeenCalledWith({ tourId: '1' });
    expect(component.tour.image[0].url).toBe('https://example.com/tour-image.jpg');
    expect(component.tour.expert.opinion).toBe('This is a test creator comment.');
    expect(component.tour.expert.creatorId).toBe(123);
  });

  it('should load tour data on init', () => {
    expect(tourNetService.getTourById).toHaveBeenCalledWith(1);
    expect(component.tour.id).toBe(1);
    expect(component.tour.name).toBe('Test Tour');
  });

  it('should load CMS tour data', () => {
    expect(cmsTourServiceSpy.getAllTours).toHaveBeenCalledWith({ tourId: '1' });
    expect(component.tour.image[0].url).toBe('https://example.com/tour-image.jpg');
    expect(component.tour.expert.opinion).toBe('This is a test creator comment.');
    expect(component.tour.expert.creatorId).toBe(123);
  });

  it('should return sanitized HTML', () => {
    const result = component.sanitizeHtml('<p>Test</p>');
    expect(result).toBeDefined();
  });

  it('should generate breadcrumb items', () => {
    component.tour = {
      ...component.tour,
      continent: 'Europe',
      country: 'Spain',
      name: 'Madrid Tour'
    };
    const breadcrumbs = component.breadcrumbItems;
    expect(breadcrumbs.length).toBe(3);
    expect(breadcrumbs[0].label).toBe('Europe');
    expect(breadcrumbs[1].label).toBe('Spain');
    expect(breadcrumbs[2].label).toBe('Madrid Tour');
  });
});
