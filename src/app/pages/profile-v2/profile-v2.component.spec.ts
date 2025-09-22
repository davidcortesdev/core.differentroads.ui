import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ProfileV2Component } from './profile-v2.component';

describe('ProfileV2Component', () => {
  let component: ProfileV2Component;
  let fixture: ComponentFixture<ProfileV2Component>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;

  beforeEach(async () => {
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('test-user-123')
        }
      }
    });

    await TestBed.configureTestingModule({
      declarations: [ProfileV2Component],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileV2Component);
    component = fixture.componentInstance;
    mockActivatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with userId from route params', () => {
    expect(component.userId).toBe('test-user-123');
  });

  it('should use mock userId when route param is null', () => {
    (mockActivatedRoute.snapshot.paramMap.get as jasmine.Spy).and.returnValue(null);
    component.ngOnInit();
    expect(component.userId).toBe('mockUserId-123');
  });

  it('should use mock userId when route param is empty', () => {
    (mockActivatedRoute.snapshot.paramMap.get as jasmine.Spy).and.returnValue('');
    component.ngOnInit();
    expect(component.userId).toBe('mockUserId-123');
  });
});