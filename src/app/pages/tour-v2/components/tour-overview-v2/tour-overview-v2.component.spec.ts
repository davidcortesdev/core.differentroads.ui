import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TourOverviewV2Component } from './tour-overview-v2.component';
import { TourNetService } from '../../../../core/services/tourNet.service';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TourOverviewV2Component', () => {
  let component: TourOverviewV2Component;
  let fixture: ComponentFixture<TourOverviewV2Component>;
  let tourNetService: jasmine.SpyObj<TourNetService>;

  const mockTour = {
    id: 1,
    code: 'TOUR-001',
    name: 'Test Tour',
    description: 'This is a test tour description.'
  };

  beforeEach(async () => {
    tourNetService = jasmine.createSpyObj('TourNetService', ['getTourById']);
    tourNetService.getTourById.and.returnValue(of(mockTour));

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [TourOverviewV2Component],
      providers: [
        { provide: TourNetService, useValue: tourNetService }
      ]
    })
    .compileComponents();
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

  it('should load tour data on init', () => {
    expect(tourNetService.getTourById).toHaveBeenCalledWith(1);
    expect(component.tour.id).toBe(1);
    expect(component.tour.name).toBe('Test Tour');
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
