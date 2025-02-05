import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ToursService } from './tours.service';
import { TourList } from '../models/tours/tour-list.model';
import { Tour } from '../models/tours/tour.model';

describe('ToursService', () => {
  let service: ToursService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ToursService],
    });
    service = TestBed.inject(ToursService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch tours list', () => {
    const mockToursList: TourList[] = [
      // Add mock data here
    ];

    service.getToursList().subscribe((data) => {
      expect(data).toEqual(mockToursList);
    });

    const req = httpMock.expectOne(
      'https://api.differentroads.co/dev/v3/data/cms/collections/es/tours'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockToursList);
  });

  it('should fetch tour detail', () => {
    const mockTourDetail: Tour = {
      // Add mock data here
    } as Tour;

    service.getTourDetail('67479932fb9cf93c488fbc4d').subscribe((data) => {
      expect(data).toEqual(mockTourDetail);
    });

    const req = httpMock.expectOne(
      'https://api.differentroads.co/dev/v3/data/cms/collections/es/tours/67479932fb9cf93c488fbc4d'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockTourDetail);
  });
});
