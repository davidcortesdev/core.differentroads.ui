import { TestBed } from '@angular/core/testing';

import { ProcessBookingService } from './process-booking.service';

describe('ProcessBookingService', () => {
  let service: ProcessBookingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProcessBookingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
