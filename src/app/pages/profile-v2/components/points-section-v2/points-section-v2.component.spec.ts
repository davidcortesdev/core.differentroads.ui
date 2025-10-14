import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';

import { PointsSectionV2Component } from './points-section-v2.component';
import { PointsService } from '../../../../core/services/points.service';
import { GeneralConfigService } from '../../../../core/services/general-config.service';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { UsersService } from '../../../../core/services/users.service';

describe('PointsSectionV2Component', () => {
  let component: PointsSectionV2Component;
  let fixture: ComponentFixture<PointsSectionV2Component>;
  let mockPointsService: jasmine.SpyObj<PointsService>;
  let mockGeneralConfigService: jasmine.SpyObj<GeneralConfigService>;
  let mockAuthService: jasmine.SpyObj<AuthenticateService>;
  let mockUsersService: jasmine.SpyObj<UsersService>;

  beforeEach(async () => {
    const pointsServiceSpy = jasmine.createSpyObj('PointsService', ['getPointsByDni', 'getTotalPointsByDni']);
    const generalConfigServiceSpy = jasmine.createSpyObj('GeneralConfigService', ['getPointsSection']);
    const authServiceSpy = jasmine.createSpyObj('AuthenticateService', ['getUserEmail']);
    const usersServiceSpy = jasmine.createSpyObj('UsersService', ['getUser']);

    const mockPointsResponse = {
      data: [
        {
          extraData: { bookingID: 'BK001', tourName: 'Test Tour' },
          category: 'booking',
          concept: 'Tour booking',
          points: 100,
          type: 'income'
        }
      ],
      totalpoints: 100,
      count: 1
    };

    const mockPointsSection = {
      'points-cards': [
        {
          name: 'Bronze Member',
          minTravels: '1',
          maxTravels: '4',
          content: 'Bronze benefits',
          'point-image': [{ url: 'bronze.jpg' }]
        }
      ]
    };

    pointsServiceSpy.getPointsByDni.and.returnValue(of(mockPointsResponse));
    pointsServiceSpy.getTotalPointsByDni.and.returnValue(of(100));
    generalConfigServiceSpy.getPointsSection.and.returnValue(of(mockPointsSection));
    authServiceSpy.getUserEmail.and.returnValue(of('test@example.com'));

    await TestBed.configureTestingModule({
      declarations: [PointsSectionV2Component],
      providers: [
        { provide: PointsService, useValue: pointsServiceSpy },
        { provide: GeneralConfigService, useValue: generalConfigServiceSpy },
        { provide: AuthenticateService, useValue: authServiceSpy },
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: DomSanitizer, useValue: { bypassSecurityTrustHtml: (html: string) => html } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointsSectionV2Component);
    component = fixture.componentInstance;
    
    mockPointsService = TestBed.inject(PointsService) as jasmine.SpyObj<PointsService>;
    mockGeneralConfigService = TestBed.inject(GeneralConfigService) as jasmine.SpyObj<GeneralConfigService>;
    mockAuthService = TestBed.inject(AuthenticateService) as jasmine.SpyObj<AuthenticateService>;
    mockUsersService = TestBed.inject(UsersService) as jasmine.SpyObj<UsersService>;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.points).toEqual([]);
    expect(component.showTable).toBeFalse();
    expect(component.totalPoints).toBe(0);
    expect(component.membershipCards).toEqual([]);
    expect(component.currentTrips).toBe(0);
    expect(component.userId).toBe('');
    expect(component.isLoading).toBeTrue();
  });

  it('should load user email and points on init', () => {
    expect(mockAuthService.getUserEmail).toHaveBeenCalled();
    expect(mockGeneralConfigService.getPointsSection).toHaveBeenCalled();
  });

  it('should toggle table visibility', () => {
    expect(component.showTable).toBeFalse();
    
    component.toggleTable();
    expect(component.showTable).toBeTrue();
    
    component.toggleTable();
    expect(component.showTable).toBeFalse();
  });

  it('should format points correctly for income type', () => {
    const mockPoint = { 
      booking: 'BK001', 
      category: 'booking', 
      concept: 'Tour booking', 
      tour: 'Test Tour', 
      points: 100, 
      type: 'income' 
    };
    const formatted = component.getFormattedPoints(mockPoint);
    expect(formatted).toBe('+ 100');
  });

  it('should format points correctly for redemption type', () => {
    const mockPoint = { 
      booking: 'BK001', 
      category: 'booking', 
      concept: 'Tour booking', 
      tour: 'Test Tour', 
      points: 50, 
      type: 'redemption' 
    };
    const formatted = component.getFormattedPoints(mockPoint);
    expect(formatted).toBe('- 50');
  });

  it('should return correct CSS class for income points', () => {
    const cssClass = component.getPointsClass('income');
    expect(cssClass).toBe('income-points');
  });

  it('should return correct CSS class for redemption points', () => {
    const cssClass = component.getPointsClass('redemption');
    expect(cssClass).toBe('redemption-points');
  });

  it('should get correct card class for locked card', () => {
    const mockCard = { 
      type: 'Viajero', 
      title: 'Bronze', 
      image: 'bronze.jpg', 
      benefits: 'Bronze benefits', 
      unlocked: false, 
      isCurrent: false,
      requirement: '1 viaje',
      minTrips: 1,
      maxTrips: 4,
      remainingTrips: 1,
      statusText: 'Bloqueado'
    };
    const cssClass = component.getCardClass(mockCard);
    expect(cssClass).toBe('locked-card');
  });

  it('should get correct card class for current card', () => {
    const mockCard = { 
      type: 'Viajero', 
      title: 'Bronze', 
      image: 'bronze.jpg', 
      benefits: 'Bronze benefits', 
      unlocked: true, 
      isCurrent: true,
      requirement: '1 viaje',
      minTrips: 1,
      maxTrips: 4,
      remainingTrips: 1,
      statusText: 'Actual'
    };
    const cssClass = component.getCardClass(mockCard);
    expect(cssClass).toBe('current-card');
  });

  it('should get correct card class for unlocked card', () => {
    const mockCard = { 
      type: 'Viajero', 
      title: 'Bronze', 
      image: 'bronze.jpg', 
      benefits: 'Bronze benefits', 
      unlocked: true, 
      isCurrent: false,
      requirement: '1 viaje',
      minTrips: 1,
      maxTrips: 4,
      remainingTrips: 1,
      statusText: 'Desbloqueado'
    };
    const cssClass = component.getCardClass(mockCard);
    expect(cssClass).toBe('unlocked-card');
  });

  it('should get remaining trips text for unlocked card', () => {
    const mockCard = { 
      type: 'Viajero', 
      title: 'Bronze', 
      image: 'bronze.jpg', 
      benefits: 'Bronze benefits', 
      unlocked: true, 
      isCurrent: false,
      requirement: '1 viaje',
      minTrips: 5,
      maxTrips: 9,
      remainingTrips: 5,
      statusText: 'Desbloqueado'
    };
    component.currentTrips = 6;
    const text = component.getRemainingTripsText(mockCard);
    expect(text).toBe('Desbloqueado');
  });

  it('should get remaining trips text for locked card', () => {
    const mockCard = { 
      type: 'Viajero', 
      title: 'Bronze', 
      image: 'bronze.jpg', 
      benefits: 'Bronze benefits', 
      unlocked: false, 
      isCurrent: false,
      requirement: '1 viaje',
      minTrips: 5,
      maxTrips: 9,
      remainingTrips: 5,
      statusText: 'Bloqueado'
    };
    component.currentTrips = 3;
    const text = component.getRemainingTripsText(mockCard);
    expect(text).toBe('3 de 5 viajes completados');
  });
});