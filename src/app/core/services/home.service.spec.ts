import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HomeService } from './home.service';
import { HomeSchema } from '../models/home.model';

describe('HomeService', () => {
  let service: HomeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HomeService]
    });
    service = TestBed.inject(HomeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch home data', () => {
    const mockHomeData: HomeSchema = {
      // Add mock data here
    } as HomeSchema;

    service.getHomeData().subscribe(data => {
      expect(data).toEqual(mockHomeData);
    });

    const req = httpMock.expectOne('https://api.differentroads.co/dev/v3/data/cms/globals/es/home-page');
    expect(req.request.method).toBe('GET');
    req.flush(mockHomeData);
  });
});