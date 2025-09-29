import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { PointsService } from '../../../../core/services/points.service';
import { PointsRedemptionComponent, TravelerData, TravelerPointsSummary } from './points-redemption.component';

describe('PointsRedemptionComponent', () => {
  let component: PointsRedemptionComponent;
  let fixture: ComponentFixture<PointsRedemptionComponent>;
  let mockPointsService: jasmine.SpyObj<PointsService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const mockTravelerData: TravelerData[] = [
    {
      id: 'traveler-1',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      hasEmail: true,
      maxPoints: 50,
      assignedPoints: 0
    },
    {
      id: 'traveler-2',
      name: 'María García',
      email: 'maria@example.com',
      hasEmail: true,
      maxPoints: 50,
      assignedPoints: 0
    },
    {
      id: 'traveler-3',
      name: 'Carlos López',
      email: '',
      hasEmail: false,
      maxPoints: 0,
      assignedPoints: 0
    }
  ];

  const mockPointsSummary: TravelerPointsSummary = {
    travelerId: 'user-123',
    currentCategory: 'VIAJERO',
    totalPoints: 1500,
    availablePoints: 1200,
    usedPoints: 300,
    categoryStartDate: new Date('2024-01-01'),
    nextCategory: 'NOMADA',
    pointsToNextCategory: 2
  };

  beforeEach(async () => {
    const pointsServiceSpy = jasmine.createSpyObj('PointsService', [
      'getUserBalance',
      'validatePointsRedemption',
      'processReservationPointsRedemption'
    ]);
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);

    await TestBed.configureTestingModule({
      declarations: [PointsRedemptionComponent],
      providers: [
        { provide: PointsService, useValue: pointsServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PointsRedemptionComponent);
    component = fixture.componentInstance;
    mockPointsService = TestBed.inject(PointsService) as jasmine.SpyObj<PointsService>;
    mockMessageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;

    // Configurar datos de entrada
    component.reservationId = 123;
    component.travelers = mockTravelerData;
    component.totalPrice = 1000;
    component.depositAmount = 200;
    component.paymentType = 'complete';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load user points and travelers data on init', () => {
      spyOn(component, 'loadUserPoints');
      spyOn(component, 'loadTravelersData');

      component.ngOnInit();

      expect(component.loadUserPoints).toHaveBeenCalled();
      expect(component.loadTravelersData).toHaveBeenCalled();
    });
  });

  describe('loadUserPoints', () => {
    it('should load user points successfully', () => {
      mockPointsService.getUserBalance.and.returnValue(of(mockPointsSummary));

      component.loadUserPoints();

      expect(mockPointsService.getUserBalance).toHaveBeenCalled();
      expect(component.pointsSummary).toEqual(mockPointsSummary);
      expect(component.isLoading).toBeFalse();
    });

    it('should handle error when loading user points', () => {
      const error = new Error('Failed to load points');
      mockPointsService.getUserBalance.and.returnValue(of(null).pipe(() => { throw error; }));

      component.loadUserPoints();

      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Error al cargar puntos'
        })
      );
    });
  });

  describe('getAvailablePoints', () => {
    it('should return available points from points summary', () => {
      component.pointsSummary = mockPointsSummary;

      const result = component.getAvailablePoints();

      expect(result).toBe(1200);
    });

    it('should return 0 when points summary is null', () => {
      component.pointsSummary = null;

      const result = component.getAvailablePoints();

      expect(result).toBe(0);
    });
  });

  describe('getMaxDiscountForCategory', () => {
    it('should return correct discount for TROTAMUNDOS category', () => {
      component.pointsSummary = { ...mockPointsSummary, currentCategory: 'TROTAMUNDOS' };

      const result = component.getMaxDiscountForCategory();

      expect(result).toBe(50);
    });

    it('should return correct discount for VIAJANTE category', () => {
      component.pointsSummary = { ...mockPointsSummary, currentCategory: 'VIAJANTE' };

      const result = component.getMaxDiscountForCategory();

      expect(result).toBe(75);
    });

    it('should return correct discount for NOMADA category', () => {
      component.pointsSummary = { ...mockPointsSummary, currentCategory: 'NOMADA' };

      const result = component.getMaxDiscountForCategory();

      expect(result).toBe(100);
    });

    it('should return default discount for unknown category', () => {
      component.pointsSummary = { ...mockPointsSummary, currentCategory: 'UNKNOWN' };

      const result = component.getMaxDiscountForCategory();

      expect(result).toBe(50);
    });
  });

  describe('onPointsRedemptionChange', () => {
    it('should enable points redemption and emit events', () => {
      spyOn(component, 'updatePointsToUse');
      spyOn(component, 'isPointsRedemptionValid').and.returnValue(true);

      component.onPointsRedemptionChange({ checked: true });

      expect(component.pointsRedemption.enabled).toBeTrue();
      expect(component.redemptionEnabledChange.emit).toHaveBeenCalledWith(true);
      expect(component.updatePointsToUse).toHaveBeenCalledWith(0);
    });

    it('should disable points redemption and reset values', () => {
      spyOn(component, 'resetPointsRedemption');

      component.onPointsRedemptionChange({ checked: false });

      expect(component.pointsRedemption.enabled).toBeFalse();
      expect(component.redemptionEnabledChange.emit).toHaveBeenCalledWith(false);
      expect(component.resetPointsRedemption).toHaveBeenCalled();
      expect(component.redemptionValidChange.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('assignPointsToTraveler', () => {
    it('should assign points to traveler successfully', () => {
      const travelerId = 'traveler-1';
      const points = 25;

      component.assignPointsToTraveler(travelerId, points);

      expect(component.travelers[0].assignedPoints).toBe(points);
      expect(component.pointsRedemption.pointsPerTraveler[travelerId]).toBe(points);
    });

    it('should not assign points to traveler without email', () => {
      const travelerId = 'traveler-3'; // Sin email
      const points = 25;

      component.assignPointsToTraveler(travelerId, points);

      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Error de asignación'
        })
      );
    });
  });

  describe('canAssignPointsToTraveler', () => {
    it('should return true for valid points assignment', () => {
      const travelerId = 'traveler-1';
      const points = 25;

      const result = component.canAssignPointsToTraveler(travelerId, points);

      expect(result).toBeTrue();
    });

    it('should return false for negative points', () => {
      const travelerId = 'traveler-1';
      const points = -10;

      const result = component.canAssignPointsToTraveler(travelerId, points);

      expect(result).toBeFalse();
    });

    it('should return false for traveler without email', () => {
      const travelerId = 'traveler-3';
      const points = 25;

      const result = component.canAssignPointsToTraveler(travelerId, points);

      expect(result).toBeFalse();
    });
  });

  describe('getTravelerAssignedPoints', () => {
    it('should return assigned points for traveler', () => {
      const travelerId = 'traveler-1';
      component.pointsRedemption.pointsPerTraveler[travelerId] = 30;

      const result = component.getTravelerAssignedPoints(travelerId);

      expect(result).toBe(30);
    });

    it('should return 0 for traveler with no assigned points', () => {
      const travelerId = 'traveler-1';

      const result = component.getTravelerAssignedPoints(travelerId);

      expect(result).toBe(0);
    });
  });

  describe('distributePointsEqually', () => {
    it('should distribute points equally among eligible travelers', () => {
      component.pointsRedemption.totalPointsToUse = 100;
      spyOn(component, 'distributePointsAmongTravelers');

      component.distributePointsEqually();

      expect(component.distributePointsAmongTravelers).toHaveBeenCalledWith(100);
    });
  });

  describe('getPointsDistributionSummary', () => {
    it('should return correct distribution summary', () => {
      component.pointsRedemption.totalPointsToUse = 100;
      component.pointsRedemption.totalDiscount = 100;
      component.pointsRedemption.pointsPerTraveler = {
        'traveler-1': 50,
        'traveler-2': 50
      };

      const result = component.getPointsDistributionSummary();

      expect(result.totalPoints).toBe(100);
      expect(result.totalDiscount).toBe(100);
      expect(result.travelersWithPoints).toBe(2);
    });
  });

  describe('isTotalExceeded', () => {
    it('should always return false (disabled validation)', () => {
      const result = component.isTotalExceeded();

      expect(result).toBeFalse();
    });
  });

  describe('toggleExpansion', () => {
    it('should toggle expansion state', () => {
      expect(component.isExpanded).toBeFalse();

      component.toggleExpansion();

      expect(component.isExpanded).toBeTrue();

      component.toggleExpansion();

      expect(component.isExpanded).toBeFalse();
    });
  });

  describe('getPointsSystemStatusMessage', () => {
    it('should return loading message when points summary is null', () => {
      component.pointsSummary = null;

      const result = component.getPointsSystemStatusMessage();

      expect(result).toBe('Cargando información de puntos...');
    });

    it('should return no points message when available points is 0', () => {
      component.pointsSummary = { ...mockPointsSummary, availablePoints: 0 };

      const result = component.getPointsSystemStatusMessage();

      expect(result).toBe('No tienes puntos disponibles para canjear');
    });

    it('should return available points message', () => {
      component.pointsSummary = mockPointsSummary;

      const result = component.getPointsSystemStatusMessage();

      expect(result).toBe('Tienes 1200 puntos disponibles');
    });
  });

  describe('resetPointsSystem', () => {
    it('should reset all points system data', () => {
      component.pointsRedemption.enabled = true;
      component.pointsRedemption.totalPointsToUse = 100;
      component.travelers[0].assignedPoints = 50;

      component.resetPointsSystem();

      expect(component.pointsRedemption.enabled).toBeFalse();
      expect(component.pointsRedemption.totalPointsToUse).toBe(0);
      expect(component.travelers[0].assignedPoints).toBe(0);
      expect(component.pointsDiscountChange.emit).toHaveBeenCalledWith(0);
      expect(component.redemptionEnabledChange.emit).toHaveBeenCalledWith(false);
      expect(component.redemptionValidChange.emit).toHaveBeenCalledWith(true);
    });
  });
});
