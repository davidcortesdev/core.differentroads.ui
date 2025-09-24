import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { BookingListSectionV2Component } from './booking-list-section-v2.component';
import { BookingsServiceV2 } from '../../../checkout-v2/services/bookings-v2.service';
import { NotificationsServiceV2 } from '../../../checkout-v2/services/notifications.service';

describe('BookingListSectionV2Component', () => {
  let component: BookingListSectionV2Component;
  let fixture: ComponentFixture<BookingListSectionV2Component>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockBookingsService: jasmine.SpyObj<BookingsServiceV2>;
  let mockNotificationsService: jasmine.SpyObj<NotificationsServiceV2>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);
    const bookingsServiceSpy = jasmine.createSpyObj('BookingsServiceV2', ['getActiveBookings', 'getTravelHistory', 'getRecentBudgets', 'downloadBookingDocument']);
    const notificationsServiceSpy = jasmine.createSpyObj('NotificationsServiceV2', ['sendDocument']);

    const mockBookings = [
      {
        id: '1',
        title: 'Test Booking',
        number: 'BK001',
        creationDate: new Date(),
        status: 'active',
        departureDate: new Date(),
        image: 'test.jpg',
        passengers: 2,
        price: 100,
        imageLoading: false,
        imageLoaded: false
      }
    ];

    bookingsServiceSpy.getActiveBookings.and.returnValue(of(mockBookings));
    bookingsServiceSpy.getTravelHistory.and.returnValue(of(mockBookings));
    bookingsServiceSpy.getRecentBudgets.and.returnValue(of(mockBookings));
    bookingsServiceSpy.downloadBookingDocument.and.returnValue(of({ fileUrl: 'test-url' }));
    notificationsServiceSpy.sendDocument.and.returnValue(of({ message: 'Success' }));

    await TestBed.configureTestingModule({
      declarations: [BookingListSectionV2Component],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: BookingsServiceV2, useValue: bookingsServiceSpy },
        { provide: NotificationsServiceV2, useValue: notificationsServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingListSectionV2Component);
    component = fixture.componentInstance;
    component.userId = 'test-user-123';
    component.listType = 'active-bookings';
    
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockMessageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    mockBookingsService = TestBed.inject(BookingsServiceV2) as jasmine.SpyObj<BookingsServiceV2>;
    mockNotificationsService = TestBed.inject(NotificationsServiceV2) as jasmine.SpyObj<NotificationsServiceV2>;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.userId).toBe('test-user-123');
    expect(component.listType).toBe('active-bookings');
    expect(component.isExpanded).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('should load active bookings on init', () => {
    expect(mockBookingsService.getActiveBookings).toHaveBeenCalledWith('test-user-123');
    expect(component.bookingItems.length).toBe(1);
    expect(component.bookingItems[0].title).toBe('Test Booking');
  });

  it('should load travel history when listType is travel-history', () => {
    component.listType = 'travel-history';
    component.ngOnInit();
    
    expect(mockBookingsService.getTravelHistory).toHaveBeenCalledWith('test-user-123');
  });

  it('should load recent budgets when listType is recent-budgets', () => {
    component.listType = 'recent-budgets';
    component.ngOnInit();
    
    expect(mockBookingsService.getRecentBudgets).toHaveBeenCalledWith('test-user-123');
  });

  it('should toggle expanded state', () => {
    expect(component.isExpanded).toBeTrue();
    
    component.toggleContent();
    expect(component.isExpanded).toBeFalse();
    
    component.toggleContent();
    expect(component.isExpanded).toBeTrue();
  });

  it('should navigate to booking details', () => {
    const mockItem = {
      id: '1',
      title: 'Test Booking',
      number: 'BK001',
      creationDate: new Date(),
      status: 'active',
      departureDate: new Date(),
      image: 'test.jpg',
      passengers: 2,
      price: 100,
      imageLoading: false,
      imageLoaded: false
    };
    
    component.viewItem(mockItem);
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['bookings', '1']);
  });

  it('should navigate to checkout', () => {
    const mockItem = {
      id: '1',
      title: 'Test Booking',
      number: 'BK001',
      creationDate: new Date(),
      status: 'active',
      departureDate: new Date(),
      image: 'test.jpg',
      passengers: 2,
      price: 100,
      imageLoading: false,
      imageLoaded: false
    };
    
    component.reserveItem(mockItem);
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/checkout', '1']);
  });

  it('should handle image load error', () => {
    const mockItem = {
      id: '1',
      title: 'Test Booking',
      number: 'BK001',
      creationDate: new Date(),
      status: 'active',
      departureDate: new Date(),
      image: 'test.jpg',
      passengers: 2,
      price: 100,
      imageLoading: true,
      imageLoaded: false
    };
    
    component.imageLoadError(mockItem);
    
    expect(mockItem.imageLoading).toBeFalse();
    expect(mockItem.imageLoaded).toBeFalse();
  });

  it('should format short date correctly', () => {
    const testDate = new Date('2023-01-15');
    const formattedDate = component.formatShortDate(testDate);
    expect(formattedDate).toBe('15 Ene');
  });

  it('should calculate total from summary', () => {
    const summaryItems = [
      { value: 100, qty: 1 },
      { value: 50, qty: 2 },
      { value: 25, qty: 1 }
    ];
    
    const total = component.calculateTotalFromSummary(summaryItems);
    expect(total).toBe(225);
  });

  it('should get correct title for active bookings', () => {
    component.listType = 'active-bookings';
    const title = component.getTitle();
    expect(title).toBe('Reservas Activas');
  });

  it('should get correct title for travel history', () => {
    component.listType = 'travel-history';
    const title = component.getTitle();
    expect(title).toBe('Historial de Viajes');
  });

  it('should get correct title for recent budgets', () => {
    component.listType = 'recent-budgets';
    const title = component.getTitle();
    expect(title).toBe('Presupuestos Recientes');
  });

  it('should track by id correctly', () => {
    const mockItem = {
      id: '1',
      title: 'Test Booking',
      number: 'BK001',
      creationDate: new Date(),
      status: 'active',
      departureDate: new Date(),
      image: 'test.jpg',
      passengers: 2,
      price: 100,
      imageLoading: false,
      imageLoaded: false
    };
    
    const trackId = component.trackById(0, mockItem);
    expect(trackId).toBe('1');
  });
});