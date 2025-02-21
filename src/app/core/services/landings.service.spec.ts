import { TestBed } from '@angular/core/testing';

import { LandingsService } from './landings.service';

describe('LandingsService', () => {
  let service: LandingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LandingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
