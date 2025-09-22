import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RetailerService, Retailer, RetailerFilter, CreateRetailerRequest, UpdateRetailerRequest } from './retailer.service';
import { environment } from '../../../../environments/environment';

describe('RetailerService', () => {
  let service: RetailerService;
  let httpMock: HttpTestingController;
  const mockRetailer: Retailer = {
    id: 7,
    code: 'RET-1064',
    name: 'Different Roads',
    tkId: '1064',
    fiscalName: 'Different Roads, SL',
    address: 'Gran Via Marques del Turia 49',
    city: 'Valencia',
    provinceId: null,
    email: 'info@differentroads.es',
    documentationEmail: 'info@differentroads.es',
    billingEmail: 'admon@differentroads.es',
    retailerGroupId: 3,
    paymentTypeId: 4
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RetailerService]
    });
    service = TestBed.inject(RetailerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getRetailers', () => {
    it('should return retailers without filter', () => {
      const mockRetailers = [mockRetailer];

      service.getRetailers().subscribe(retailers => {
        expect(retailers).toEqual(mockRetailers);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Accept')).toBe('text/plain');
      req.flush(mockRetailers);
    });

    it('should return retailers with filter', () => {
      const filter: RetailerFilter = {
        id: 7,
        useExactMatchForStrings: false
      };
      const mockRetailers = [mockRetailer];

      service.getRetailers(filter).subscribe(retailers => {
        expect(retailers).toEqual(mockRetailers);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer?Id=7&UseExactMatchForStrings=false`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRetailers);
    });
  });

  describe('getRetailerById', () => {
    it('should return a specific retailer by ID', () => {
      const retailerId = 7;

      service.getRetailerById(retailerId).subscribe(retailer => {
        expect(retailer).toEqual(mockRetailer);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer/${retailerId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Accept')).toBe('text/plain');
      req.flush(mockRetailer);
    });
  });

  describe('createRetailer', () => {
    it('should create a new retailer', () => {
      const createRequest: CreateRetailerRequest = {
        code: 'RET-1064',
        name: 'Different Roads',
        tkId: '1064',
        fiscalName: 'Different Roads, SL',
        address: 'Gran Via Marques del Turia 49',
        city: 'Valencia',
        provinceId: 0,
        email: 'info@differentroads.es',
        documentationEmail: 'info@differentroads.es',
        billingEmail: 'admon@differentroads.es',
        retailerGroupId: 3,
        paymentTypeId: 4
      };

      service.createRetailer(createRequest).subscribe(retailer => {
        expect(retailer).toEqual(mockRetailer);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.headers.get('Accept')).toBe('text/plain');
      expect(req.request.body).toEqual(createRequest);
      req.flush(mockRetailer);
    });
  });

  describe('updateRetailer', () => {
    it('should update an existing retailer', () => {
      const retailerId = 7;
      const updateRequest: UpdateRetailerRequest = {
        code: 'RET-1064',
        name: 'Different Roads Updated',
        tkId: '1064',
        fiscalName: 'Different Roads, SL',
        address: 'Gran Via Marques del Turia 49',
        city: 'Valencia',
        provinceId: 0,
        email: 'info@differentroads.es',
        documentationEmail: 'info@differentroads.es',
        billingEmail: 'admon@differentroads.es',
        retailerGroupId: 3,
        paymentTypeId: 4
      };

      const updatedRetailer = { ...mockRetailer, name: 'Different Roads Updated' };

      service.updateRetailer(retailerId, updateRequest).subscribe(retailer => {
        expect(retailer).toEqual(updatedRetailer);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer/${retailerId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.headers.get('Accept')).toBe('text/plain');
      expect(req.request.body).toEqual(updateRequest);
      req.flush(updatedRetailer);
    });
  });

  describe('deleteRetailer', () => {
    it('should delete a retailer', () => {
      const retailerId = 7;

      service.deleteRetailer(retailerId).subscribe(result => {
        expect(result).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer/${retailerId}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Accept')).toBe('text/plain');
      req.flush(true);
    });
  });

  describe('getRetailerByCode', () => {
    it('should return retailer by code', () => {
      const code = 'RET-1064';

      service.getRetailerByCode(code).subscribe(retailer => {
        expect(retailer).toEqual(mockRetailer);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer?Code=RET-1064&UseExactMatchForStrings=true`);
      expect(req.request.method).toBe('GET');
      req.flush([mockRetailer]);
    });

    it('should return null when no retailer found', () => {
      const code = 'NON-EXISTENT';

      service.getRetailerByCode(code).subscribe(retailer => {
        expect(retailer).toBeNull();
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer?Code=NON-EXISTENT&UseExactMatchForStrings=true`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('getRetailerByTKId', () => {
    it('should return retailer by TK ID', () => {
      const tkId = '1064';

      service.getRetailerByTKId(tkId).subscribe(retailer => {
        expect(retailer).toEqual(mockRetailer);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer?TkId=1064&UseExactMatchForStrings=true`);
      expect(req.request.method).toBe('GET');
      req.flush([mockRetailer]);
    });
  });

  describe('getRetailersByCity', () => {
    it('should return retailers by city', () => {
      const city = 'Valencia';

      service.getRetailersByCity(city).subscribe(retailers => {
        expect(retailers).toEqual([mockRetailer]);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer?City=Valencia&UseExactMatchForStrings=false`);
      expect(req.request.method).toBe('GET');
      req.flush([mockRetailer]);
    });
  });

  describe('getRetailersByProvince', () => {
    it('should return retailers by province', () => {
      const provinceId = 1;

      service.getRetailersByProvince(provinceId).subscribe(retailers => {
        expect(retailers).toEqual([mockRetailer]);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer?ProvinceId=1`);
      expect(req.request.method).toBe('GET');
      req.flush([mockRetailer]);
    });
  });

  describe('getRetailersByPaymentType', () => {
    it('should return retailers by payment type', () => {
      const paymentTypeId = 4;

      service.getRetailersByPaymentType(paymentTypeId).subscribe(retailers => {
        expect(retailers).toEqual([mockRetailer]);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer?PaymentTypeId=4`);
      expect(req.request.method).toBe('GET');
      req.flush([mockRetailer]);
    });
  });

  describe('searchRetailersByName', () => {
    it('should search retailers by name', () => {
      const name = 'Different';

      service.searchRetailersByName(name).subscribe(retailers => {
        expect(retailers).toEqual([mockRetailer]);
      });

      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer?Name=Different&UseExactMatchForStrings=false`);
      expect(req.request.method).toBe('GET');
      req.flush([mockRetailer]);
    });
  });

  describe('getDefaultRetailer', () => {
    it('should return the default retailer', () => {
      service.getDefaultRetailer().subscribe(retailer => {
        expect(retailer).toEqual(mockRetailer);
      });

      const defaultId = environment.retaileriddefault || 7;
      const req = httpMock.expectOne(`${environment.toursApiUrl}/Retailer/${defaultId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRetailer);
    });
  });
});
