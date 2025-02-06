import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ToursService } from './tours.service';

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
    const req = httpMock.expectOne(
      'https://api.differentroads.co/dev/v3/data/cms/collections/es/tours'
    );
    expect(req.request.method).toBe('GET');
  });
});
