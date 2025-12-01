import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Payment,
  PaymentStatus,
  IPaymentVoucher,
} from '../../../core/models/bookings/payment.model';
import { PaymentData } from '../add-payment-modal/add-payment-modal.component';
import { BookingsServiceV2 } from '../../../core/services/v2/bookings-v2.service';
import { PaymentService, PaymentInfo } from '../../../core/services/payments/payment.service';
import { IPaymentStatusResponse } from '../../checkout-v2/services/paymentStatusNet.service';
import { PaymentsNetService, IProformaSummaryResponse } from '../../checkout-v2/services/paymentsNet.service';
import { PaymentMethodNetService, IPaymentMethodResponse } from '../../checkout-v2/services/paymentMethodNet.service';
import { AnalyticsService, TourDataForEcommerce } from '../../../core/services/analytics/analytics.service';
import { ReservationService, IReservationResponse } from '../../../core/services/reservation/reservation.service';
import { TourService } from '../../../core/services/tour/tour.service';
import { ItineraryService, ItineraryFilters } from '../../../core/services/itinerary/itinerary.service';
import { ItineraryDayService, IItineraryDayResponse } from '../../../core/services/itinerary/itinerary-day/itinerary-day.service';
import { TourLocationService, ITourLocationResponse } from '../../../core/services/tour/tour-location.service';
import { LocationNetService, Location } from '../../../core/services/locations/locationNet.service';
import { TourTagService } from '../../../core/services/tag/tour-tag.service';
import { TagService } from '../../../core/services/tag/tag.service';
import { DepartureService, IDepartureResponse } from '../../../core/services/departure/departure.service';
import { ReservationTravelerService, IReservationTravelerResponse } from '../../../core/services/reservation/reservation-traveler.service';
import { ReservationTravelerActivityService, IReservationTravelerActivityResponse } from '../../../core/services/reservation/reservation-traveler-activity.service';
import { ActivityService, IActivityResponse } from '../../../core/services/activity/activity.service';
import { switchMap, map, catchError, concatMap, takeUntil, finalize } from 'rxjs/operators';
import { forkJoin, of, Observable, Subject } from 'rxjs';
import { FileUploadService, CloudinaryResponse } from '../../../core/services/media/file-upload.service';
import { MessageService } from 'primeng/api';

// Interfaces existentes
interface TripItemData {
  quantity: number;
  unitPrice: number;
  description?: string;
}

// Actualizamos la interfaz para incluir identificadores de pago y voucher


@Component({
  selector: 'app-booking-payment-history-v2',
  templateUrl: './booking-payment-history.component.html',
  styleUrls: ['./booking-payment-history.component.scss'],
  standalone: false,
})
export class BookingPaymentHistoryV2Component implements OnInit, OnChanges, OnDestroy {
  @Input() bookingID: string = '';
  @Input() bookingTotal: number = 0;
  @Input() tripItems: TripItemData[] = [];
  @Input() isTO: boolean = false;
  @Input() refreshTrigger: any = null;
  @Input() reservationId: number = 0; // NUEVO: Para payment-management
  @Input() departureDate: string = ''; // NUEVO: Para payment-management
  @Input() isATC: boolean = false; // NUEVO: Para mostrar selector de estados
  @Input() tourId: number = 0; // NUEVO: Para analytics
  @Input() statusCode: string = '';

  @Output() registerPayment = new EventEmitter<number>();
  @Output() couponApplied = new EventEmitter<void>();

  paymentInfo: PaymentInfo = { totalPrice: 0, pendingAmount: 0, paidAmount: 0 };
  paymentHistory: Payment[] = [];
  paymentForm: FormGroup;
  displayPaymentModal: boolean = false;
  
  // NUEVO: Modal para añadir pago
  displayAddPaymentModal: boolean = false;

  // Modal para aplicar cupón
  displayCouponModal: boolean = false;
  userId: number = 0;

  displayReviewModal: boolean = false;
  selectedReviewVoucherUrl: string = '';
  selectedPayment: Payment | null = null;
  
  // NUEVO: Estados de pago disponibles
  paymentStatuses: IPaymentStatusResponse[] = [];
  loadingStatuses: boolean = false;

  // NUEVO: Métodos de pago disponibles
  paymentMethods: IPaymentMethodResponse[] = [];
  loadingMethods: boolean = false;

  // Estado local para selección y loading por pago
  selectedStatusByPaymentId: { [publicID: string]: number } = {};
  isChanging: { [publicID: string]: boolean } = {};

  // Estado para tracking de subida de vouchers por payment
  isUploadingVoucher: { [paymentId: string]: boolean } = {};

  // Estado para tracking de eliminación de vouchers
  isDeletingVoucher: { [voucherId: string]: boolean } = {};

  // Fecha de salida para mostrar en el historial
  displayDepartureDate: string = '';

  // Datos del retailer y lógica de agencia
  retailerId: number | null = null;
  isAgency: boolean = false; // retailerId !== 7 => agencia

  // Datos de proforma (bruto / neto)
  proformaData: IProformaSummaryResponse | null = null;
  loadingProforma: boolean = false;
  grossPaymentInfo: PaymentInfo | null = null;
  netPaymentInfo: PaymentInfo | null = null;

  // Subject para manejar la limpieza de suscripciones
  private destroy$ = new Subject<void>();

  deadlines: {
    date: string;
    amount: number;
    status: string;
  }[] = [
    {
      date: '01/01/2021',
      amount: 100,
      status: 'COMPLETED',
    },
  ];

  isApproveLoading: boolean = false;
  isRejectLoading: boolean = false;

  approveMessage: string | null = null;
  isApproveSuccess: boolean = false;

  isLoadingPayments: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private bookingsService: BookingsServiceV2,
    private paymentService: PaymentService,
    private paymentsNetService: PaymentsNetService,
    private paymentMethodService: PaymentMethodNetService,
    private analyticsService: AnalyticsService,
    private reservationService: ReservationService,
    private tourService: TourService,
    private itineraryService: ItineraryService,
    private itineraryDayService: ItineraryDayService,
    private tourLocationService: TourLocationService,
    private locationService: LocationNetService,
    private tourTagService: TourTagService,
    private tagService: TagService,
    private departureService: DepartureService,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    private activityService: ActivityService,
    private fileUploadService: FileUploadService,
    private messageService: MessageService
  ) {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.calculatePaymentInfo();
    
    // Cargar estados de pago desde la API (siempre, para todos)
    this.loadPaymentStatuses();

    // Cargar métodos de pago desde la API
    this.loadPaymentMethods();

    // Cargar pagos (loadPayments tiene guard interno para reservationId)
    this.loadPayments();

    // Cargar proforma si aplica
    this.loadProformaSummary();

    // Inicializar datos si reservationId está disponible desde el inicio
    // (ngOnChanges manejará los cambios posteriores)
    if (this.reservationId && this.reservationId > 0) {
      this.loadReservationData();
    } else if (this.departureDate) {
      // Si ya tenemos departureDate como input, usarlo directamente
      this.displayDepartureDate = this.departureDate;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Actualizar paymentInfo si cambia bookingTotal
    if (changes['bookingTotal']) {
      this.calculatePaymentInfo();
    }
    
    // Cargar pagos si cambia reservationId (solo si no es el primer cambio, para evitar duplicados con ngOnInit)
    if (changes['reservationId'] && changes['reservationId'].currentValue) {
      // Solo cargar si no es el primer cambio (ngOnInit ya lo maneja)
      if (!changes['reservationId'].firstChange) {
        this.loadPayments();
        this.loadReservationData();
        this.loadProformaSummary();
      }
    }
    
    // Actualizar fecha de salida si cambia el input (incluso si cambia a cadena vacía)
    if (changes['departureDate']) {
      this.displayDepartureDate = this.departureDate || '';
      // Si departureDate se vuelve vacío y tenemos reservationId, intentar cargar desde la API
      // Solo si no es el primer cambio (ngOnInit ya maneja la inicialización)
      if (!changes['departureDate'].firstChange && !this.departureDate && this.reservationId && this.reservationId > 0) {
        this.loadReservationData();
      }
    }
    
    if (changes['refreshTrigger'] && changes['refreshTrigger'].currentValue) {
      this.refreshPayments();
    }

    // Cargar estados si aún no están cargados
    if (changes['isATC'] && !this.paymentStatuses.length) {
      this.loadPaymentStatuses();
    }

    // Cargar métodos si aún no están cargados
    if (!this.paymentMethods.length) {
      this.loadPaymentMethods();
    }
  }

  ngOnDestroy(): void {
    // Completar el Subject para cancelar todas las suscripciones activas
    this.destroy$.next();
    this.destroy$.complete();
  }

  private calculatePaymentInfo(): void {
    this.paymentInfo = this.bookingsService.calculatePaymentInfo(
      this.paymentHistory,
      this.bookingTotal
    );

    // Recalcular información bruta / neta si tenemos proforma
    if (this.proformaData && this.isAgency) {
      this.updateGrossAndNetPaymentInfo();
    }
  }

  /**
   * Carga el resumen de proforma para reservas de agencia
   */
  private loadProformaSummary(): void {
    if (!this.reservationId || this.reservationId <= 0) {
      return;
    }

    if (!this.isAgency) {
      // Limpiar datos de agencia si ya no aplica
      this.proformaData = null;
      this.grossPaymentInfo = null;
      this.netPaymentInfo = null;
      return;
    }

    this.loadingProforma = true;

    this.paymentsNetService
      .getProformaSummary(this.reservationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary: IProformaSummaryResponse) => {
          this.proformaData = summary;
          this.updateGrossAndNetPaymentInfo();
          this.loadingProforma = false;
        },
        error: (error) => {
          console.error('Error cargando proforma summary:', error);
          this.proformaData = null;
          this.grossPaymentInfo = null;
          this.netPaymentInfo = null;
          this.loadingProforma = false;
        },
      });
  }

  /**
   * Calcula los totales brutos y netos a partir de la proforma y el historial de pagos
   * - Total bruto: viene del summary normal (paymentInfo.totalPrice)
   * - Total neto: viene de proforma-summary (netAmount)
   */
  private updateGrossAndNetPaymentInfo(): void {
    if (!this.proformaData || !this.isAgency) {
      return;
    }

    // Total bruto: usar el del summary normal (paymentInfo.totalPrice)
    const grossTotal = this.paymentInfo?.totalPrice || 0;

    // Total neto: usar netAmount de la proforma
    let rawNetTotal: any = (this.proformaData as any).netAmount;
    
    // Si no viene netAmount, calcular como bruto - margen
    if (rawNetTotal === undefined || rawNetTotal === null) {
      const rawMargin: any = (this.proformaData as any).totalMargin;
      const margin = typeof rawMargin === 'string' ? parseFloat(rawMargin) : rawMargin || 0;
      rawNetTotal = grossTotal - margin;
    }

    const netTotal =
      typeof rawNetTotal === 'string'
        ? parseFloat(rawNetTotal)
        : rawNetTotal || 0;

    // Importe pagado bruto ya calculado del summary
    const grossPaid = this.paymentInfo?.paidAmount || 0;
    const grossPending = Math.max(grossTotal - grossPaid, 0);

    this.grossPaymentInfo = {
      totalPrice: grossTotal,
      paidAmount: grossPaid,
      pendingAmount: grossPending,
    };

    // Pagado neto: usar el mismo valor que el pagado bruto
    const netPaid = grossPaid;

    const netPending = Math.max(netTotal - netPaid, 0);

    this.netPaymentInfo = {
      totalPrice: netTotal,
      paidAmount: netPaid,
      pendingAmount: netPending,
    };
  }
  
  get isCancelled(): boolean {
    return ['CANCELLED','SUSPENDED','EXPIRED','DELETED'].includes(this.statusCode);
  }

  private loadPayments(): void {
    if (!this.reservationId || this.reservationId <= 0) {
      return;
    }

    this.isLoadingPayments = true;

    this.bookingsService.getPaymentsByReservationId(this.reservationId, this.bookingID)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (payments) => {
          this.paymentHistory = payments;
          // Inicializar selección por cada pago al estado actual
          this.paymentHistory.forEach(p => {
            if (p.publicID) {
              this.selectedStatusByPaymentId[p.publicID] = p.paymentStatusId || 0;
            }
          });
          this.calculatePaymentInfo();
          this.isLoadingPayments = false;
        },
        error: (error) => {
          console.error('Error cargando pagos:', error);
          this.paymentHistory = [];
          this.isLoadingPayments = false;
        }
      });
  }


  public refreshPayments(): void {
    if (this.reservationId) {
      this.loadPayments();
    } else {
      // Recalcular paymentInfo si no hay reservationId
      this.calculatePaymentInfo();
    }
  }

  calculateTotal(item: TripItemData): number {
    return item.quantity * item.unitPrice;
  }

  formatCurrency(amount: number): string {
    return `${amount.toLocaleString('es-ES')} €`;
  }

  showPaymentModal(): void {
    this.displayPaymentModal = true;
  }

  hidePaymentModal(): void {
    this.displayPaymentModal = false;
    this.paymentForm.reset({ amount: 0 });
  }

  onSubmitPayment(): void {
    if (this.paymentForm.valid) {
      const amount = this.paymentForm.get('amount')?.value;
      this.registerPayment.emit(amount);
      this.hidePaymentModal();
    }
  }

  showReviewModal(payment: Payment): void {
    this.selectedReviewVoucherUrl = payment.vouchers?.[0].fileUrl || '';
    this.selectedPayment = payment;

    this.displayReviewModal = true;
  }

  hideReviewModal(): void {
    this.displayReviewModal = false;
  }

  approvePaymentReview(): void {
    if (
      !this.selectedPayment ||
      !this.selectedPayment.publicID ||
      !this.selectedPayment.vouchers
    ) {
      return;
    }
    this.isApproveLoading = true;
    this.approveMessage = null;
    //TODO: Implementar leyendo los datos de mysql
  }

  rejectPaymentReview(): void {
    if (
      !this.selectedPayment ||
      !this.selectedPayment.publicID ||
      !this.selectedPayment.vouchers
    ) {
      return;
    }
    this.isRejectLoading = true;
    //TODO: Implementar leyendo los datos de mysql

  }

  viewPaymentReview(): void {
    // Abre el voucher URL en otra pestaña
    window.open(this.selectedReviewVoucherUrl, '_blank');
  }

  navigateToPayment(): void {
    // Abrir modal de añadir pago
    this.displayAddPaymentModal = true;
  }

  openCouponModal(): void {
    // Si no tenemos userId, intentar obtenerlo desde la reserva
    if (!this.userId || this.userId <= 0) {
      this.loadReservationData();
    }
    this.displayCouponModal = true;
  }

  onCouponApplied(): void {
    // Emitir evento al componente padre para que recargue los datos
    this.couponApplied.emit();
    
    // Refrescar los pagos por si el cupón afecta el total
    this.refreshPayments();
  }

  /**
   * Carga los datos de la reserva (userId y fecha de salida) en una sola llamada
   * Usa switchMap para evitar suscripciones anidadas y memory leaks
   */
  private loadReservationData(): void {
    if (!this.reservationId || this.reservationId <= 0) {
      return;
    }

    // Si ya tenemos departureDate como input, usarlo directamente
    if (this.departureDate) {
      this.displayDepartureDate = this.departureDate;
      // Aún necesitamos obtener el userId
      this.reservationService.getById(this.reservationId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (reservation: IReservationResponse) => {
            const reservationData = reservation as any;
            if (reservationData.userId) {
              this.userId = reservationData.userId;
            }
          },
          error: (error) => {
            console.error('Error obteniendo userId desde la reserva:', error);
          }
        });
      return;
    }

    // Obtener la reserva y luego el departure si es necesario usando switchMap
    this.reservationService.getById(this.reservationId)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((reservation: IReservationResponse) => {
          const reservationData = reservation as any;
          
          // Obtener userId
          if (reservationData.userId) {
            this.userId = reservationData.userId;
          }

          // Obtener retailerId y determinar si es agencia
          if (typeof reservation.retailerId === 'number') {
            this.retailerId = reservation.retailerId;
            // retailerId === 7 => cliente final; cualquier otro => agencia
            this.isAgency = this.retailerId !== 7;
            // Si es agencia y tenemos reservationId, intentar cargar proforma
            if (this.isAgency && this.reservationId && this.reservationId > 0) {
              this.loadProformaSummary();
            }
          }

          // Intentar obtener departureDate desde reservationData.departure si está disponible
          if (reservationData.departure?.departureDate) {
            this.displayDepartureDate = reservationData.departure.departureDate;
            return of(null); // Ya tenemos la fecha, no necesitamos obtener el departure
          }

          // Si no está disponible en la reserva, obtener desde el departure service
          if (reservation.departureId) {
            return this.departureService.getById(reservation.departureId).pipe(
              catchError((error) => {
                console.error('Error obteniendo fecha de salida desde departure:', error);
                return of(null);
              })
            );
          }

          return of(null);
        })
      )
      .subscribe({
        next: (departure: IDepartureResponse | null) => {
          if (departure?.departureDate) {
            this.displayDepartureDate = departure.departureDate;
          }
        },
        error: (error) => {
          console.error('Error obteniendo datos desde la reserva:', error);
        }
      });
  }

  /**
   * @deprecated Usar loadReservationData() en su lugar
   * Mantenido por compatibilidad
   */
  private loadUserId(): void {
    this.loadReservationData();
  }

  /**
   * Carga la fecha de salida desde la reserva y su departure asociado
   * @deprecated Usar loadReservationData() en su lugar
   * Mantenido por compatibilidad
   */
  private loadDepartureDate(): void {
    if (!this.reservationId || this.reservationId <= 0) {
      return;
    }

    // Si ya tenemos departureDate como input, usarlo directamente
    if (this.departureDate) {
      this.displayDepartureDate = this.departureDate;
      return;
    }

    this.loadReservationData();
  }

  onPaymentProcessed(paymentData: PaymentData): void {
    console.log('Pago procesado:', paymentData);
    
    // Emitir evento para que el padre actualice los datos
    this.registerPayment.emit(paymentData.amount);
    
    // Refrescar la información de pagos
    this.refreshPayments();
    
    // Disparar evento de analytics
    this.trackAddPaymentInfo(paymentData);
  }

  /**
   * Obtiene todos los datos completos del tour desde los servicios adicionales
   */
  private getCompleteTourData(tourId: number): Observable<{
    days: number;
    nights: number;
    continent: string;
    country: string;
    monthTags: string[];
    tourType: string;
  }> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      concatMap((itineraries) => {
        if (itineraries.length === 0) {
          return of({ days: 0, nights: 0, continent: '', country: '', monthTags: [], tourType: 'Grupos' });
        }

        // Obtener días de itinerario del primer itinerario disponible
        const itineraryDaysRequest = this.itineraryDayService
          .getAll({ itineraryId: itineraries[0].id })
          .pipe(catchError(() => of([] as IItineraryDayResponse[])));

        // Obtener continent y country
        const locationRequest = forkJoin({
          countryLocations: this.tourLocationService.getByTourAndType(tourId, 'COUNTRY').pipe(
            map((response) => Array.isArray(response) ? response : response ? [response] : []),
            catchError(() => of([] as ITourLocationResponse[]))
          ),
          continentLocations: this.tourLocationService.getByTourAndType(tourId, 'CONTINENT').pipe(
            map((response) => Array.isArray(response) ? response : response ? [response] : []),
            catchError(() => of([] as ITourLocationResponse[]))
          )
        }).pipe(
          switchMap(({ countryLocations, continentLocations }) => {
            const locationIds = [
              ...countryLocations.map(tl => tl.locationId),
              ...continentLocations.map(tl => tl.locationId)
            ].filter(id => id !== undefined && id !== null);
            
            if (locationIds.length === 0) {
              return of({ continent: '', country: '' });
            }
            
            return this.locationService.getLocationsByIds(locationIds).pipe(
              map((locations: Location[]) => {
                const countries = countryLocations
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map(tl => locations.find(l => l.id === tl.locationId)?.name)
                  .filter(name => name) as string[];
                
                const continents = continentLocations
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map(tl => locations.find(l => l.id === tl.locationId)?.name)
                  .filter(name => name) as string[];
                
                return {
                  continent: continents.join(', ') || '',
                  country: countries.join(', ') || ''
                };
              }),
              catchError(() => of({ continent: '', country: '' }))
            );
          })
        );

        // Obtener monthTags (tags de tipo MONTH)
        const monthTagsRequest = this.tourTagService.getByTourAndType(tourId, 'MONTH').pipe(
          switchMap((tourTags) => {
            if (tourTags.length === 0) {
              return of([]);
            }
            const tagIds = tourTags
              .map(tt => tt.tagId)
              .filter(id => id !== undefined && id !== null && id > 0);
            
            if (tagIds.length === 0) {
              return of([]);
            }
            
            const tagRequests = tagIds.map(tagId => 
              this.tagService.getById(tagId).pipe(
                map(tag => tag?.name || ''),
                catchError(() => of(''))
              )
            );
            
            return forkJoin(tagRequests).pipe(
              map(tagNames => tagNames.filter(name => name.trim().length > 0)),
              catchError(() => of([]))
            );
          }),
          catchError(() => of([]))
        );

        return forkJoin({
          itineraryDays: itineraryDaysRequest,
          locationData: locationRequest,
          monthTags: monthTagsRequest
        }).pipe(
          switchMap(({ itineraryDays, locationData, monthTags }) => {
            const days = itineraryDays.length;
            const nights = days > 0 ? days - 1 : 0;

            return this.tourService.getById(tourId, false).pipe(
              map((tour) => {
                const tourType = tour.tripTypeId === 1 ? 'FIT' : 'Grupos';
                return {
                  days,
                  nights,
                  continent: locationData.continent,
                  country: locationData.country,
                  monthTags: monthTags,
                  tourType
                };
              }),
              catchError(() => of({
                days,
                nights,
                continent: locationData.continent,
                country: locationData.country,
                monthTags: monthTags,
                tourType: 'Grupos'
              }))
            );
          })
        );
      }),
      catchError(() => of({ days: 0, nights: 0, continent: '', country: '', monthTags: [], tourType: 'Grupos' }))
    );
  }

  /**
   * Disparar evento add_payment_info cuando se añade un pago desde el detalle de reserva
   */
  private trackAddPaymentInfo(paymentData: PaymentData): void {
    if (!this.reservationId || this.reservationId <= 0) {
      return;
    }

    // Obtener datos de la reserva primero
    this.reservationService.getById(this.reservationId).pipe(
      switchMap((reservation: IReservationResponse) => {
        // Obtener datos del tour
        const tourIdToLoad = this.tourId || reservation.tourId;
        if (!tourIdToLoad || tourIdToLoad <= 0) {
          return of(null);
        }

        // Intentar obtener tour desde reservationData.tour (como en checkout)
        const reservationData = reservation as any;
        const tourFromReservation = reservationData.tour;
        const insuranceFromReservation = reservationData.insurance?.name || '';

        // Si el tour viene completo en la reserva, usarlo directamente
        if (tourFromReservation && tourFromReservation.days !== undefined) {
          const tourDataForEcommerce: TourDataForEcommerce = {
            id: tourFromReservation.id || tourIdToLoad,
            tkId: tourFromReservation.tkId,
            name: tourFromReservation.name,
            destination: {
              continent: tourFromReservation.destination?.continent,
              country: tourFromReservation.destination?.country
            },
            days: tourFromReservation.days,
            nights: tourFromReservation.nights,
            rating: tourFromReservation.rating,
            monthTags: tourFromReservation.monthTags,
            tourType: tourFromReservation.tourType,
            flightCity: 'Sin vuelo',
            activitiesText: undefined, // Se obtendrá desde travelers
            selectedInsurance: insuranceFromReservation || undefined,
            childrenCount: '0',
            totalPassengers: reservation.totalPassengers,
            departureDate: this.departureDate || '',
            returnDate: reservationData.departure?.arrivalDate || '',
            price: paymentData.amount
          };

          // Si no tiene actividades, intentar obtenerlas
          if (!tourDataForEcommerce.activitiesText) {
            return this.reservationTravelerService.getByReservation(this.reservationId).pipe(
              switchMap((travelers) => {
                if (travelers.length === 0) {
                  return of({ tourDataForEcommerce, reservation });
                }
                const activityRequests = travelers.map(traveler =>
                  this.reservationTravelerActivityService.getByReservationTraveler(traveler.id).pipe(
                    catchError(() => of([]))
                  )
                );
                return forkJoin(activityRequests).pipe(
                  switchMap((activityArrays: IReservationTravelerActivityResponse[][]) => {
                    const allActivityIds = activityArrays.flat().map(a => a.activityId).filter(id => id > 0);
                    const uniqueActivityIds = [...new Set(allActivityIds)];
                    if (uniqueActivityIds.length === 0) {
                      return of({ tourDataForEcommerce, reservation });
                    }
                    const activityDetailRequests = uniqueActivityIds.map(activityId =>
                      this.activityService.getById(activityId).pipe(catchError(() => of(null)))
                    );
                    return forkJoin(activityDetailRequests).pipe(
                      map((activities: (IActivityResponse | null)[]) => {
                        const validActivities = activities.filter(a => a !== null) as IActivityResponse[];
                        const activitiesText = validActivities.length > 0
                          ? validActivities.map(a => a.name || a.description || '').filter(t => t).join(', ')
                          : '';
                        tourDataForEcommerce.activitiesText = activitiesText || undefined;
                        return { tourDataForEcommerce, reservation };
                      }),
                      catchError(() => of({ tourDataForEcommerce, reservation }))
                    );
                  }),
                  catchError(() => of({ tourDataForEcommerce, reservation }))
                );
              }),
              catchError(() => of({ tourDataForEcommerce, reservation }))
            );
          }
          return of({ tourDataForEcommerce, reservation });
        }

        // Si no viene completo, obtener todos los datos desde los servicios
        const departureId = reservation.departureId;
        
        return forkJoin({
          tour: this.tourService.getById(tourIdToLoad, false),
          additionalData: this.getCompleteTourData(tourIdToLoad),
          departure: departureId ? this.departureService.getById(departureId).pipe(
            catchError(() => of(null))
          ) : of(null),
          travelers: this.reservationTravelerService.getByReservation(this.reservationId).pipe(
            catchError(() => of([]))
          )
        }).pipe(
          switchMap(({ tour, additionalData, departure, travelers }) => {
            if (!tour) return of(null);

            // Obtener returnDate desde departure
            const returnDate = departure?.arrivalDate || '';
            
            // Obtener monthTags del departure específico (extraer mes de departureDate)
            let monthTags: string[] = [];
            if (departure?.departureDate) {
              const date = new Date(departure.departureDate);
              const monthIndex = date.getMonth();
              const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
              if (monthIndex >= 0 && monthIndex < 12) {
                monthTags = [monthNames[monthIndex]];
              }
            }
            // Si no hay monthTags del departure, usar los del tour
            if (monthTags.length === 0 && additionalData.monthTags.length > 0) {
              monthTags = additionalData.monthTags;
            }

            // Obtener actividades desde travelers
            const activityRequests = travelers.map(traveler =>
              this.reservationTravelerActivityService.getByReservationTraveler(traveler.id).pipe(
                catchError(() => of([]))
              )
            );

            return (activityRequests.length > 0 ? forkJoin(activityRequests).pipe(
              switchMap((activityArrays: IReservationTravelerActivityResponse[][]) => {
                const allActivityIds = activityArrays.flat().map(a => a.activityId).filter(id => id > 0);
                const uniqueActivityIds = [...new Set(allActivityIds)];
                
                if (uniqueActivityIds.length === 0) {
                  return of({ activitiesText: '', insurance: '' });
                }
                
                // Obtener detalles de actividades desde ActivityService
                const activityDetailRequests = uniqueActivityIds.map(activityId =>
                  this.activityService.getById(activityId).pipe(
                    catchError(() => of(null))
                  )
                );
                
                return forkJoin(activityDetailRequests).pipe(
                  map((activities: (IActivityResponse | null)[]) => {
                    const validActivities = activities.filter(a => a !== null) as IActivityResponse[];
                    const activitiesText = validActivities.length > 0
                      ? validActivities.map(a => a.name || a.description || '').filter(t => t).join(', ')
                      : '';
                    
                    // Seguros: obtener desde reservationData (disponible en el scope)
                    const insuranceFromReservation = (reservation as any).insurance?.name || '';
                    
                    return { activitiesText, insurance: insuranceFromReservation };
                  })
                );
              }),
              catchError(() => of({ activitiesText: '', insurance: '' }))
            ) : of({ activitiesText: '', insurance: '' })).pipe(
              map(({ activitiesText, insurance }) => {

                const tourDataForEcommerce: TourDataForEcommerce = {
                  id: tour.id,
                  tkId: tour.tkId ?? undefined,
                  name: tour.name ?? undefined,
                  destination: {
                    continent: additionalData.continent || undefined,
                    country: additionalData.country || undefined
                  },
                  days: additionalData.days || undefined,
                  nights: additionalData.nights || undefined,
                  rating: undefined, // Rating se obtiene de reviews, por ahora undefined
                  monthTags: monthTags.length > 0 ? monthTags : undefined,
                  tourType: additionalData.tourType || undefined,
                  flightCity: 'Sin vuelo',
                  activitiesText: activitiesText || undefined,
                  selectedInsurance: insurance || undefined,
                  childrenCount: '0',
                  totalPassengers: reservation.totalPassengers,
                  departureDate: this.departureDate || departure?.departureDate || '',
                  returnDate: returnDate,
                  price: paymentData.amount
                };

                return { tourDataForEcommerce, reservation };
              })
            );
          }),
          catchError(() => of(null))
        );
      }),
      switchMap((data) => {
        if (!data) return of(null);

        // Determinar payment_type usando los métodos de pago cargados
        const methodCode = paymentData.method === 'card' ? 'REDSYS' : 
                          paymentData.method === 'transfer' ? 'TRANSFER' : 
                          paymentData.method === 'scalapay' ? 'SCALAPAY' : null;
        
        let method = 'scalapay'; // default
        if (methodCode && this.paymentMethods.length > 0) {
          const paymentMethod = this.getPaymentMethodByCode(methodCode);
          if (paymentMethod) {
            // Mapear el nombre del método a español para analytics
            if (paymentMethod.code === 'REDSYS') {
              method = 'tarjeta';
            } else if (paymentMethod.code === 'TRANSFER') {
              method = 'transferencia';
            } else if (paymentMethod.code === 'SCALAPAY') {
              method = 'scalapay';
            }
          }
        } else {
          // Fallback si no están cargados los métodos
          method = paymentData.method === 'card' ? 'tarjeta' : 
                   paymentData.method === 'transfer' ? 'transferencia' : 'scalapay';
        }
        
        const paymentType = `completo, ${method}`;

        // Construir item usando el servicio de analytics
        return this.analyticsService.buildEcommerceItemFromTourData(
          data.tourDataForEcommerce,
          'booking_detail',
          'Detalle de Reserva',
          data.reservation.id?.toString() || ''
        ).pipe(
          switchMap((item) => {
            return this.analyticsService.getCurrentUserData().pipe(
              map((userData) => ({ item, userData, paymentType }))
            );
          }),
          catchError((error) => {
            console.error('Error obteniendo datos para analytics:', error);
            return this.analyticsService.buildEcommerceItemFromTourData(
              data.tourDataForEcommerce,
              'booking_detail',
              'Detalle de Reserva',
              data.reservation.id?.toString() || ''
            ).pipe(
              map((item) => ({ 
                item, 
                userData: undefined,
                paymentType 
              }))
            );
          })
        );
      })
    ).subscribe((result) => {
      if (result && result.item) {
        this.analyticsService.addPaymentInfo(
          {
            currency: 'EUR',
            value: paymentData.amount,
            coupon: '',
            payment_type: result.paymentType,
            items: [result.item]
          },
          result.userData
        );
      }
    });
  }

  formatDateForDisplay(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return `${date.getDate().toString().padStart(2, '0')}/${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}/${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Carga todos los estados de pago disponibles desde la API
   */
  private loadPaymentStatuses(): void {
    this.loadingStatuses = true;
    this.paymentService.getAllPaymentStatuses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (statuses) => {
          this.paymentStatuses = statuses;
          this.loadingStatuses = false;
        },
        error: (error) => {
          console.error('Error cargando estados de pago:', error);
          this.loadingStatuses = false;
        }
      });
  }

  /**
   * Carga todos los métodos de pago disponibles desde la API
   */
  private loadPaymentMethods(): void {
    this.loadingMethods = true;
    this.paymentMethodService.getAllPaymentMethods()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (methods) => {
          this.paymentMethods = methods;
          this.loadingMethods = false;
        },
        error: (error) => {
          console.error('Error cargando métodos de pago:', error);
          this.loadingMethods = false;
        }
      });
  }

  /**
   * Obtiene el método de pago por ID
   */
  private getPaymentMethodById(methodId: number): IPaymentMethodResponse | null {
    return this.paymentMethods.find(m => m.id === methodId) || null;
  }

  /**
   * Obtiene el método de pago por código
   */
  private getPaymentMethodByCode(code: string): IPaymentMethodResponse | null {
    return this.paymentMethods.find(m => m.code === code) || null;
  }

  /**
   * Obtiene el nombre del estado para mostrar (directo desde la API)
   */
  getPaymentStatusDisplayName(payment: Payment): string {
    if (!payment.paymentStatusId || this.paymentStatuses.length === 0) {
      return ''; // No mostrar nada hasta que cargue la API
    }
    // Obtener el nombre directo desde la API
    return this.paymentService.getPaymentStatusName(payment.paymentStatusId, this.paymentStatuses);
  }

  /**
   * Cambia el estado del pago usando el valor seleccionado en el selector
   */
  onChangeStatusClick(payment: Payment): void {
    if (!payment.publicID) return;
    const selectedId = this.selectedStatusByPaymentId[payment.publicID];
    if (!selectedId || selectedId === payment.paymentStatusId) return;

    this.isChanging[payment.publicID] = true;
    this.paymentService.updatePaymentStatus(payment, selectedId, this.reservationId).subscribe({
      next: () => {
        // Recargar los pagos para que la label se actualice desde BBDD
        this.refreshPayments();
        this.isChanging[payment.publicID] = false;
      },
      error: (error) => {
        console.error('Error actualizando estado del pago:', error);
        this.isChanging[payment.publicID] = false;
      }
    });
  }

  isChangeDisabled(payment: Payment): boolean {
    if (!payment.publicID) return true;
    const selectedId = this.selectedStatusByPaymentId[payment.publicID];
    return (
      this.loadingStatuses ||
      this.isChanging[payment.publicID] === true ||
      !selectedId ||
      selectedId === payment.paymentStatusId
    );
  }

  /**
   * Obtiene todos los justificantes (vouchers) de todos los pagos
   */
  getPaymentVouchers(): IPaymentVoucher[] {
    const allVouchers: IPaymentVoucher[] = [];
    if (!this.paymentHistory || this.paymentHistory.length === 0) {
      return allVouchers;
    }

    this.paymentHistory.forEach((payment) => {
      if (payment.vouchers && payment.vouchers.length > 0) {
        allVouchers.push(...payment.vouchers);
      }
    });

    return allVouchers;
  }

  /**
   * Abre un justificante de pago en una nueva pestaña
   */
  viewVoucher(voucher: IPaymentVoucher): void {
    if (voucher.fileUrl) {
      window.open(voucher.fileUrl, '_blank');
    }
  }

  /**
   * Elimina un justificante de pago
   */
  deleteVoucher(voucher: IPaymentVoucher): void {
    if (!voucher.id || !voucher.fileUrl) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede eliminar el justificante: falta información.',
        life: 5000,
      });
      return;
    }

    // Confirmar eliminación
    if (!confirm('¿Está seguro de que desea eliminar este justificante?')) {
      return;
    }

    this.isDeletingVoucher[voucher.id] = true;

    // Encontrar el payment que contiene este voucher
    const payment = this.paymentHistory.find((p) => {
      if (!p.vouchers || p.vouchers.length === 0) return false;
      return p.vouchers.some((v) => v.id === voucher.id);
    });

    if (!payment || !payment.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo encontrar el pago asociado al justificante.',
        life: 5000,
      });
      this.isDeletingVoucher[voucher.id] = false;
      return;
    }

    // Obtener el pago completo desde la API
    this.paymentsNetService
      .getPaymentById(payment.id)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((apiPayment) => {
          if (!apiPayment.attachmentUrl) {
            throw new Error('El pago no tiene justificantes asociados');
          }

          // Remover la URL del voucher del attachmentUrl
          // Formato puede ser "url|filename" o solo "url"
          const voucherEntries = apiPayment.attachmentUrl.split(',').map((entry) => entry.trim());
          const updatedEntries = voucherEntries.filter((entry) => {
            // Extraer la URL del formato "url|filename" o usar la entrada completa
            const url = entry.split('|')[0].trim();
            return url !== voucher.fileUrl;
          });

          if (updatedEntries.length === voucherEntries.length) {
            throw new Error('No se encontró el justificante en el pago');
          }

          // Si no quedan vouchers, dejar attachmentUrl vacío, sino concatenar los restantes
          const newAttachmentUrl = updatedEntries.length > 0 ? updatedEntries.join(',') : '';

          // Actualizar el pago con el nuevo attachmentUrl
          const updateData: any = {
            id: apiPayment.id,
            amount: apiPayment.amount,
            paymentDate: apiPayment.paymentDate,
            paymentMethodId: apiPayment.paymentMethodId,
            paymentStatusId: apiPayment.paymentStatusId,
            transactionReference: apiPayment.transactionReference,
            notes: apiPayment.notes,
            currencyId: apiPayment.currencyId,
            reservationId: apiPayment.reservationId,
            attachmentUrl: newAttachmentUrl,
          };

          return this.paymentsNetService.update(updateData);
        }),
        catchError((error) => {
          console.error('Error eliminando justificante:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al eliminar el justificante. Por favor, intente nuevamente.',
            life: 5000,
          });
          return of(null);
        }),
        finalize(() => {
          this.isDeletingVoucher[voucher.id] = false;
        })
      )
      .subscribe({
        next: (updatedPayment) => {
          if (updatedPayment) {
            this.messageService.add({
              severity: 'success',
              summary: 'Justificante eliminado',
              detail: 'El justificante se ha eliminado correctamente.',
              life: 5000,
            });

            // Recargar los pagos para actualizar la lista
            this.loadPayments();
          }
        },
        error: (error) => {
          console.error('Error en el flujo de eliminación:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al procesar la eliminación. Por favor, intente nuevamente.',
            life: 5000,
          });
        },
      });
  }

  /**
   * Formatea la fecha de subida del justificante
   */
  formatVoucherDate(date: Date | string): string {
    if (!date) return 'Fecha no disponible';

    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Fecha no válida';
    }
  }

  /**
   * Verifica si un pago es transferencia comparando por ID
   */
  isTransfer(payment: Payment): boolean {
    if (!payment || !payment.paymentMethodId || this.paymentMethods.length === 0) {
      return false;
    }
    
    // Buscar el método de pago por ID y verificar si es TRANSFER
    const method = this.getPaymentMethodById(payment.paymentMethodId);
    return method?.code === 'TRANSFER';
  }

  /**
   * Obtiene el texto del botón según si ya hay vouchers subidos
   */
  getUploadVoucherButtonLabel(payment: Payment): string {
    const hasVouchers = payment.vouchers && payment.vouchers.length > 0;
    return hasVouchers ? 'Subir otro justificante' : 'Subir justificante';
  }

  /**
   * Navega a la página de subir justificante de pago
   * @deprecated Ahora se usa uploadVoucher directamente
   */
  navigateToUploadVoucher(payment: Payment): void {
    if (!this.reservationId || !payment.id) {
      console.error('No se puede navegar: falta reservationId o payment.id');
      return;
    }

    // Navegar a la página de justificantes con el paymentId específico
    this.router.navigate([`/reservation/${this.reservationId}/${payment.id}`]);
  }

  /**
   * Traduce mensajes técnicos de error a mensajes amigables para el usuario
   */
  getFriendlyErrorMessage(notes: string | undefined): string {
    if (!notes) {
      return '';
    }

    // Detectar si es un mensaje de error técnico (Redsys, failed, rejected, etc.)
    const isError = 
      /Redsys\s+response/i.test(notes) ||
      /failed|fallido|rejected|rechazado|error/i.test(notes.toLowerCase());

    if (isError) {
      return 'Pago rechazado';
    }

    // Si no es un error, devolver el mensaje original
    return notes;
  }

  /**
   * Dispara el click en el input file oculto
   */
  triggerFileInput(payment: Payment): void {
    const inputId = `file-input-${payment.id || payment.publicID}`;
    const fileInput = document.getElementById(inputId) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Maneja la selección de archivo para subir justificante
   */
  onVoucherFileSelect(event: any, payment: Payment): void {
    const fileInput = event.target as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) {
      return;
    }

    const file = fileInput.files[0];
    this.uploadVoucher(payment, file);
    
    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente si es necesario
    fileInput.value = '';
  }


  /**
   * Sube un justificante de pago directamente sin redirigir
   */
  uploadVoucher(payment: Payment, file: File): void {
    if (!payment.id || !this.reservationId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede subir el justificante: falta información del pago o reserva.',
        life: 5000,
      });
      return;
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Tipo de archivo no válido',
        detail: 'Solo se permiten archivos PDF o imágenes (JPG, PNG, WEBP).',
        life: 5000,
      });
      return;
    }

    // Validar tamaño (10MB máximo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'Archivo demasiado grande',
        detail: 'El archivo no puede ser mayor a 10MB.',
        life: 5000,
      });
      return;
    }

    const paymentKey = payment.id.toString();
    this.isUploadingVoucher[paymentKey] = true;

    // Subir archivo a Cloudinary
    this.fileUploadService
      .uploadFile(file, 'vouchers')
      .pipe(
        takeUntil(this.destroy$),
        switchMap((response: CloudinaryResponse) => {
          if (!response.secure_url) {
            throw new Error('No se recibió la URL del archivo subido');
          }

          // Obtener el pago completo desde la API para actualizarlo
          return this.paymentsNetService.getPaymentById(payment.id!).pipe(
            switchMap((apiPayment) => {
              // Guardar el nombre del archivo junto con la URL usando formato "url|filename"
              const urlWithFileName = `${response.secure_url}|${file.name}`;
              
              // Manejar múltiples vouchers: concatenar URLs separadas por comas
              let newAttachmentUrl = urlWithFileName;
              if (apiPayment.attachmentUrl) {
                // Si ya existe un voucher, agregar el nuevo separado por coma
                newAttachmentUrl = `${apiPayment.attachmentUrl},${urlWithFileName}`;
              }

              // Actualizar el pago con el nuevo attachmentUrl
              const updateData: any = {
                id: apiPayment.id,
                amount: apiPayment.amount,
                paymentDate: apiPayment.paymentDate,
                paymentMethodId: apiPayment.paymentMethodId,
                paymentStatusId: apiPayment.paymentStatusId,
                transactionReference: apiPayment.transactionReference,
                notes: apiPayment.notes,
                currencyId: apiPayment.currencyId,
                reservationId: apiPayment.reservationId,
                attachmentUrl: newAttachmentUrl,
              };

              return this.paymentsNetService.update(updateData);
            })
          );
        }),
        catchError((error) => {
          console.error('Error subiendo justificante:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al subir el justificante. Por favor, intente nuevamente.',
            life: 5000,
          });
          return of(null);
        }),
        finalize(() => {
          this.isUploadingVoucher[paymentKey] = false;
        })
      )
      .subscribe({
        next: (updatedPayment) => {
          if (updatedPayment) {
            this.messageService.add({
              severity: 'success',
              summary: 'Justificante subido',
              detail: 'El justificante se ha subido correctamente. Nuestro equipo lo revisará pronto.',
              life: 5000,
            });

            // Recargar los pagos para mostrar el nuevo justificante
            this.loadPayments();
          }
        },
        error: (error) => {
          console.error('Error en el flujo de subida:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al procesar el justificante. Por favor, intente nuevamente.',
            life: 5000,
          });
        },
      });
  }
}
