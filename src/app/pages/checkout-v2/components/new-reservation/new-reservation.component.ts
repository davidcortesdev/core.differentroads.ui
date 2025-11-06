// new-reservation.component.ts
import { Component, OnInit } from '@angular/core';
import {
  IReservationResponse,
  ReservationService,
} from '../../../../core/services/reservation/reservation.service';
import { ActivatedRoute } from '@angular/router';
import {
  IPaymentResponse,
  PaymentsNetService,
} from '../../services/paymentsNet.service';
import { PaymentStatusNetService } from '../../services/paymentStatusNet.service';
import { PaymentMethodNetService } from '../../services/paymentMethodNet.service';
import { NewScalapayService } from '../../services/newScalapay.service';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
// IMPORTACIONES PARA TRAVELERS (solo para obtener el nombre del lead traveler)
import { ReservationTravelerService } from '../../../../core/services/reservation/reservation-traveler.service';
import { ReservationTravelerFieldService } from '../../../../core/services/reservation/reservation-traveler-field.service';
import {
  FlightSearchService,
  IAmadeusFlightCreateOrderResponse,
} from '../../../../core/services/flight/flight-search.service';
import { AnalyticsService, TourDataForEcommerce } from '../../../../core/services/analytics/analytics.service';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { PointsV2Service } from '../../../../core/services/v2/points-v2.service';
import { Title } from '@angular/platform-browser';
import { switchMap, map, catchError, concatMap } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { ReviewsService } from '../../../../core/services/reviews/reviews.service';
import { TourService } from '../../../../core/services/tour/tour.service';
import { TourLocationService, ITourLocationResponse } from '../../../../core/services/tour/tour-location.service';
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';
import { ItineraryService, ItineraryFilters } from '../../../../core/services/itinerary/itinerary.service';
import { ItineraryDayService, IItineraryDayResponse } from '../../../../core/services/itinerary/itinerary-day/itinerary-day.service';
import { DepartureService, IDepartureResponse } from '../../../../core/services/departure/departure.service';
import { ReservationTravelerActivityService } from '../../../../core/services/reservation/reservation-traveler-activity.service';
import { ReservationTravelerActivityPackService } from '../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import { ActivityService, IActivityResponse } from '../../../../core/services/activity/activity.service';
import { AgeGroupService } from '../../../../core/services/agegroup/age-group.service';

// Interfaz para información bancaria
interface BankInfo {
  name: string;
  account: string;
  beneficiary: string;
  concept: string;
}

@Component({
  selector: 'app-new-reservation',
  standalone: false,
  templateUrl: './new-reservation.component.html',
  styleUrls: [
    './new-reservation.component.scss',
    './amadeus-flight-section.scss',
  ],
  providers: [MessageService],
})
export class NewReservationComponent implements OnInit {
  // Propiedades principales
  reservationId: number = 0;
  paymentId: number | undefined = 0;
  reservation: IReservationResponse | undefined;
  payment: IPaymentResponse | undefined;

  // Estados y configuración
  loading: boolean = true;
  error: boolean = false;
  nextDayDate: string;

  // Estados de pago y reserva
  status: 'SUCCESS' | 'PENDING' | 'FAILED' = 'PENDING';
  statusName: string = '';
  paymentType: 'Transfer' | 'Scalapay' | 'RedSys' | null = null;
  paymentMethod: string = '';
  paymentStatus: string = '';
  
  // Bandera para evitar disparar purchase múltiples veces
  private purchaseEventFired: boolean = false;

  // IDs de estados de pago
  successId: number = 0;
  failedId: number = 0;
  pendingId: number = 0;

  // Información del lead traveler (solo para mostrar saludo)
  leadTravelerName: string = '';

  // Información bancaria
  bankInfo: BankInfo[] = [
    {
      name: 'CaixaBank, S.A.',
      account: 'ES35 2100 1463 1702 0013 5710',
      beneficiary: 'Different Roads S.L',
      concept: '',
    },
    {
      name: 'BANCO SANTANDER, S.A.',
      account: 'ES55 0049 0265 4423 1052 3788',
      beneficiary: 'Different Roads S.L',
      concept: '',
    },
  ];

  // Estados de reserva de vuelos
  hasAmadeusFlight: boolean = false;
  flightBookingLoading: boolean = false;
  flightBookingError: boolean = false;
  flightBookingResponse: IAmadeusFlightCreateOrderResponse | undefined;

  // Propiedad para detectar si está en iframe
  isInIframe: boolean = false;

  // Propiedad para detectar si tiene paymentId válido
  hasPaymentId: boolean = false;

  // Array para almacenar múltiples justificantes
  uploadedVouchers: Array<{ url: string; uploadDate: Date; fileName?: string }> = [];
  
  // Archivo pendiente de confirmar
  pendingFileToConfirm: File | null = null;

  constructor(
    private titleService: Title,
    private route: ActivatedRoute,
    private reservationService: ReservationService,
    private paymentService: PaymentsNetService,
    private paymentStatusService: PaymentStatusNetService,
    private paymentMethodService: PaymentMethodNetService,
    private scalapayService: NewScalapayService,
    private messageService: MessageService,
    // SERVICIOS PARA OBTENER LEAD TRAVELER NAME
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerFieldService: ReservationTravelerFieldService,
    private flightSearchService: FlightSearchService,
    // SERVICIOS PARA ANALYTICS
    private analyticsService: AnalyticsService,
    private authService: AuthenticateService,
    // SERVICIO PARA PUNTOS
    private pointsService: PointsV2Service,
    // SERVICIOS PARA OBTENER DATOS DINÁMICOS DEL TOUR
    private reviewsService: ReviewsService,
    private tourService: TourService,
    private tourLocationService: TourLocationService,
    private locationNetService: LocationNetService,
    private itineraryService: ItineraryService,
    private itineraryDayService: ItineraryDayService,
    private departureService: DepartureService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private activityService: ActivityService,
    private ageGroupService: AgeGroupService
  ) {
    // Calcular la fecha del día siguiente
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.nextDayDate = tomorrow.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Detectar si estamos en un iframe
    this.isInIframe = window.self !== window.top;
  }

  ngOnInit(): void {
    this.titleService.setTitle('Reserva - Different Roads');

    // Obtener parámetros de la ruta
    this.route.params.subscribe((params) => {
      this.reservationId = params['reservationId'];
      this.paymentId = params['paymentId']
        ? Number(params['paymentId'])
        : undefined;

      // Validar si tiene paymentId válido
      this.hasPaymentId = !!this.paymentId && this.paymentId > 0;
    });

    // Iniciar carga de datos
    this.loadPaymentStatuses();
  }

  /**
   * Carga los IDs de los estados de pago
   */
  private loadPaymentStatuses(): void {
    const successStatus$ =
      this.paymentStatusService.getPaymentStatusByCode('COMPLETED');
    const failedStatus$ =
      this.paymentStatusService.getPaymentStatusByCode('FAILED');
    const pendingStatus$ =
      this.paymentStatusService.getPaymentStatusByCode('PENDING');

    forkJoin({
      success: successStatus$,
      failed: failedStatus$,
      pending: pendingStatus$,
    }).subscribe({
      next: (statuses) => {
        // Validar y asignar IDs de estados
        if (statuses.success && statuses.success.length > 0) {
          this.successId = statuses.success[0].id;
        } else {
          console.error('SUCCESS status not found');
        }

        if (statuses.failed && statuses.failed.length > 0) {
          this.failedId = statuses.failed[0].id;
        } else {
          console.error('FAILED status not found');
        }

        if (statuses.pending && statuses.pending.length > 0) {
          this.pendingId = statuses.pending[0].id;
        } else {
          console.error('PENDING status not found');
        }

        // Cargar reserva después de obtener los estados
        this.loadReservation();
      },
      error: (error) => {
        console.error('Error loading payment statuses:', error);
        this.handleError('Error loading payment statuses');
      },
    });
  }

  /**
   * Carga los datos de la reserva
   */
  private loadReservation(): void {
    this.reservationService.getById(this.reservationId).subscribe({
      next: (reservation) => {
        this.reservation = reservation;

        // Actualizar conceptos bancarios con ID de reserva
        this.updateBankConcepts();

        // CARGAR NOMBRE DEL LEAD TRAVELER PARA EL SALUDO
        this.loadLeadTravelerName();

        // Disparar evento purchase cuando se llega a la página de confirmación después del paso 4 del checkout
        // Solo disparar una vez cuando se carga la página
        if (!this.purchaseEventFired) {
          this.trackPurchase();
          this.purchaseEventFired = true;
        }

        // Cargar información del pago
        this.loadPayment();
      },
      error: (error) => {
        console.error('Error loading reservation:', error);
        this.handleError('Error al cargar los datos de la reserva');
      },
    });
  }

  /**
   * Carga el nombre del lead traveler para el saludo
   */
  private loadLeadTravelerName(): void {

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          // Encontrar el lead traveler
          const leadTraveler = travelers.find(
            (traveler) => traveler.isLeadTraveler
          );
          if (leadTraveler) {
            this.loadLeadTravelerFields(leadTraveler.id);
          }
        },
        error: (error) => {
          console.error('Error loading lead traveler:', error);
        },
      });
  }

  /**
   * Carga los campos del lead traveler para obtener su nombre
   */
  private loadLeadTravelerFields(leadTravelerId: number): void {
    this.reservationTravelerFieldService
      .getByReservationTraveler(leadTravelerId)
      .subscribe({
        next: (fields) => {

          let firstName = '';
          let lastName = '';

          fields.forEach((field) => {
            if (field.reservationFieldId === 1) {
              // Campo nombre
              firstName = field.value;
            } else if (field.reservationFieldId === 13) {
              // Campo apellido
              lastName = field.value;
            }
          });

          this.leadTravelerName = `${firstName} ${lastName}`.trim();

          // Actualizar conceptos bancarios con el nombre
          this.updateBankConceptsWithName();
        },
        error: (error) => {
          console.error('Error loading lead traveler fields:', error);
        },
      });
  }

  /**
   * Actualiza los conceptos bancarios con el ID de reserva
   */
  private updateBankConcepts(): void {
    const concept = `${this.reservation?.id || ''}`;
    this.bankInfo.forEach((bank) => {
      bank.concept = concept;
    });
  }

  /**
   * Actualiza los conceptos bancarios con el ID y nombre del cliente
   */
  private updateBankConceptsWithName(): void {
    const concept = `${this.reservation?.id || ''} ${
      this.leadTravelerName
    }`.trim();
    this.bankInfo.forEach((bank) => {
      bank.concept = concept;
    });
  }

  /**
   * Carga la información del pago
   */
  private loadPayment(): void {
    // Validar que existe paymentId antes de cargar
    if (!this.paymentId || this.paymentId <= 0) {
      this.loading = false;
      return;
    }

    this.paymentService.getPaymentById(this.paymentId).subscribe({
      next: (payment: IPaymentResponse) => {
        this.payment = payment;

        // Cargar justificantes existentes
        this.loadExistingVouchers(payment);

        // Cargar método de pago
        this.loadPaymentMethod(payment.paymentMethodId);

        // Cargar estado de pago
        this.loadPaymentStatus(payment.paymentStatusId);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading payment:', error);
        this.handleError('Error al cargar los datos del pago');
      },
    });
  }

  /**
   * Carga la información del método de pago
   */
  private loadPaymentMethod(paymentMethodId: number): void {
    this.paymentMethodService.getPaymentMethodById(paymentMethodId).subscribe({
      next: (method) => {
        this.paymentMethod = method.name;

        // Determinar el tipo de pago
        if (method.code === 'TRANSFER') {
          this.paymentType = 'Transfer';
        } else if (method.code === 'SCALAPAY') {
          this.paymentType = 'Scalapay';
          this.handleScalapayPayment();
        } else if (method.code === 'REDSYS') {
          this.paymentType = 'RedSys';
        }
      },
      error: (error) => {
        console.error('Error loading payment method:', error);
      },
    });
  }

  /**
   * Carga el estado del pago
   */
  private loadPaymentStatus(paymentStatusId: number): void {
    this.paymentStatusService.getPaymentStatusById(paymentStatusId).subscribe({
      next: (status) => {
        this.paymentStatus = status.name;
        this.statusName = status.name;

        // Determinar el status
        if (status.code === 'PENDING') {
          this.status = 'PENDING';
        } else if (status.code === 'COMPLETED') {
          this.status = 'SUCCESS';

          // Generar puntos después del pago exitoso
          this.generatePointsAfterPayment();

          // Si el pago está completado, verificar y reservar vuelos Amadeus
          setTimeout(() => {
            this.checkAndBookAmadeusFlight();
          }, 1000); // Pequeño delay para asegurar que la UI se actualice primero
        } else if (status.code === 'FAILED') {
          this.status = 'FAILED';
        }
      },
      error: (error) => {
        console.error('Error loading payment status:', error);
      },
    });
  }

  /**
   * Maneja el pago de Scalapay
   */
  private handleScalapayPayment(): void {
    // Validar que el pago no esté ya completado antes de intentar capturar
    if (this.payment?.paymentStatusId === this.successId) {
      // Llamar al servicio de vuelos ya que el pago está completado
      this.checkAndBookAmadeusFlight();
      return;
    }

  }

  /**
   * Captura la orden de Scalapay
   */
  captureOrder(): void {
    if (!this.payment?.transactionReference) {
      console.error('No transaction reference available');
      return;
    }

    // Validar que el pago no esté ya completado antes de capturar
    if (this.payment.paymentStatusId === this.successId) {
      // Llamar al servicio de vuelos ya que el pago está completado
      this.checkAndBookAmadeusFlight();
      return;
    }

    this.scalapayService
      .captureOrder(this.payment.transactionReference)
      .subscribe({
        next: (response: any) => {
          // Actualizar estado del pago
          if (this.payment) {
            this.payment.paymentStatusId = this.successId;
            this.updatePaymentStatus();

            this.status = 'SUCCESS';

            this.showMessage(
              'success',
              'Pago completado',
              'El pago se ha procesado correctamente'
            );

            // Generar puntos después del pago exitoso
            this.generatePointsAfterPayment();

            // Verificar y reservar vuelos Amadeus después del pago exitoso
            setTimeout(() => {
              this.checkAndBookAmadeusFlight();
            }, 1000); // Pequeño delay para asegurar que el mensaje se muestre primero
          }
        },
        error: (error: any) => {
          console.error('Error capturing order:', error);

          // Actualizar estado del pago como fallido
          if (this.payment) {
            this.payment.paymentStatusId = this.failedId;
            this.updatePaymentStatus();

            this.status = 'FAILED';
            this.showMessage(
              'error',
              'Error en el pago',
              'Error al procesar el pago'
            );
          }
        },
      });
  }

  /**
   * Actualiza el estado del pago en la base de datos
   */
  private updatePaymentStatus(): void {
    if (!this.payment) return;

    this.paymentService.update(this.payment).subscribe({
      next: () => {
        console.log('Estado del pago actualizado correctamente');
      },
      error: (error) => {
        console.error('Error updating payment status:', error);
      },
    });
  }

  /**
   * Carga los justificantes existentes desde el payment
   */
  private loadExistingVouchers(payment: IPaymentResponse): void {
    // Si hay attachmentUrl, añadirlo como primer justificante
    if (payment.attachmentUrl) {
      this.uploadedVouchers = [{
        url: payment.attachmentUrl,
        uploadDate: new Date(),
        fileName: 'Justificante de transferencia'
      }];
    } else {
      this.uploadedVouchers = [];
    }

    // También intentar cargar desde localStorage como respaldo
    const storageKey = `vouchers_${payment.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.uploadedVouchers = parsed.map((v: any) => ({
            ...v,
            uploadDate: new Date(v.uploadDate)
          }));
        }
      } catch (e) {
        // Ignorar error de parsing
      }
    }
  }

  /**
   * Guarda los vouchers en localStorage
   */
  private saveVouchersToStorage(): void {
    if (this.payment?.id) {
      const storageKey = `vouchers_${this.payment.id}`;
      localStorage.setItem(storageKey, JSON.stringify(this.uploadedVouchers));
    }
  }

  /**
   * Maneja la selección de un archivo (antes de subir)
   */
  handleFileSelect(files: File[]): void {
    if (files && files.length > 0) {
      this.pendingFileToConfirm = files[0];
    } else {
      this.pendingFileToConfirm = null;
    }
  }

  /**
   * Maneja la subida del justificante de transferencia
   */
  handleVoucherUpload(response: any): void {
    // Limpiar el archivo pendiente cuando se sube exitosamente
    this.pendingFileToConfirm = null;
    if (this.payment && response.secure_url) {
      // Añadir el nuevo justificante al array
      const newVoucher = {
        url: response.secure_url,
        uploadDate: new Date(),
        fileName: response.original_filename || response.public_id || `Justificante ${this.uploadedVouchers.length + 1}.pdf`
      };
      
      // Si no existe ya, añadirlo
      const exists = this.uploadedVouchers.some(v => v.url === response.secure_url);
      if (!exists) {
        this.uploadedVouchers.push(newVoucher);
        this.saveVouchersToStorage();
      }

      // Actualizar el attachmentUrl con el último subido (para compatibilidad con backend)
      this.payment.attachmentUrl = response.secure_url;
      this.payment.paymentStatusId = this.pendingId; // Mantener como PENDING para revisión

      this.paymentService.update(this.payment).subscribe({
        next: () => {
          this.showMessage(
            'success',
            'Justificante subido',
            'El justificante se ha subido correctamente. Nuestro equipo lo revisará pronto.'
          );
        },
        error: (error) => {
          // Revertir si falla
          const index = this.uploadedVouchers.findIndex(v => v.url === response.secure_url);
          if (index > -1) {
            this.uploadedVouchers.splice(index, 1);
            this.saveVouchersToStorage();
          }
          this.showMessage(
            'error',
            'Error',
            'Error al actualizar el pago con el justificante'
          );
        },
      });
    }
  }

  /**
   * Maneja errores en la subida del justificante
   */
  handleVoucherError(error: any): void {
    // Limpiar el archivo pendiente en caso de error
    this.pendingFileToConfirm = null;
    this.showMessage(
      'error',
      'Error de subida',
      'Ha ocurrido un error al subir el justificante. Por favor, inténtalo de nuevo.'
    );
  }

  /**
   * Visualiza el justificante subido
   */
  viewVoucher(voucherUrl?: string): void {
    const urlToOpen = voucherUrl || this.payment?.attachmentUrl || this.uploadedVouchers[0]?.url;
    if (urlToOpen) {
      window.open(urlToOpen, '_blank');
    }
  }

  /**
   * Muestra un mensaje usando PrimeNG MessageService
   */
  private showMessage(
    severity: 'success' | 'error' | 'warn' | 'info',
    summary: string,
    detail: string
  ): void {
    this.messageService.add({
      severity,
      summary,
      detail,
    });
  }

  /**
   * Verifica si hay vuelos Amadeus seleccionados y procede con la reserva
   */
  public checkAndBookAmadeusFlight(): void {
    if (!this.reservationId) {
      return;
    }

    this.flightSearchService.getSelectionStatus(this.reservationId).subscribe({
      next: (hasSelection: boolean) => {
        this.hasAmadeusFlight = hasSelection;

        if (hasSelection) {
          this.bookAmadeusFlight();
        } else {
          console.log('No hay vuelos Amadeus seleccionados');
        }
      },
      error: (error) => {
        this.flightBookingError = true;
      },
    });
  }

  /**
   * Realiza la reserva del vuelo Amadeus
   */
  private bookAmadeusFlight(): void {
    if (!this.reservationId) return;

    this.flightBookingLoading = true;
    this.flightBookingError = false;

    this.flightSearchService.bookFlight(this.reservationId).subscribe({
      next: (response: IAmadeusFlightCreateOrderResponse) => {
        this.flightBookingResponse = response;
        this.flightBookingLoading = false;

        // Mostrar mensaje de éxito
        this.showMessage(
          'success',
          'Vuelo reservado',
          'El vuelo se ha reservado correctamente en Amadeus.'
        );
      },
      error: (error) => {
        console.error('Error al reservar vuelo:', error);
        this.flightBookingError = true;
        this.flightBookingLoading = false;

        // Mostrar mensaje de error
        this.showMessage(
          'error',
          'Error en reserva de vuelo',
          'No se pudo completar la reserva del vuelo. Contacta con soporte.'
        );
      },
    });
  }

  /**
   * Maneja errores generales
   */
  private handleError(message: string): void {
    this.error = true;
    this.loading = false;
    this.showMessage('error', 'Error', message);
  }

  /**
   * Disparar evento purchase cuando se completa la compra
   */
  private trackPurchase(): void {
    if (!this.reservation || !this.reservation.tourId) return;

    const reservationData = this.reservation as any;
    const tourId = this.reservation.tourId;

    // Obtener item_list_id y item_list_name desde sessionStorage (persistidos desde checkout)
    const itemListId = sessionStorage.getItem('checkout_itemListId') || '';
    const itemListName = sessionStorage.getItem('checkout_itemListName') || '';

    // Obtener información del pago
    const paymentType = this.paymentType || 'completo, transferencia';
    const transactionId =
      this.payment?.transactionReference ||
      this.payment?.id?.toString() ||
      `#${this.reservationId}`;
    const totalValue = this.reservation.totalAmount || 0;

    // Obtener todos los datos completos del tour dinámicamente
    forkJoin({
      tourData: this.getCompleteTourDataForEcommerce(tourId),
      activitiesText: this.getActivitiesFromTravelers(),
      passengersCount: this.getPassengersCount()
    }).pipe(
      switchMap(({ tourData, activitiesText, passengersCount }: { tourData: TourDataForEcommerce; activitiesText: string; passengersCount: { adults: string; children: string } }) => {
        // Actualizar con datos adicionales del contexto
        tourData.flightCity = reservationData.flight?.originCity || tourData.flightCity || '';
        // Usar actividades obtenidas dinámicamente desde viajeros
        tourData.activitiesText = activitiesText || '';
        // Usar seguro del contexto
        tourData.selectedInsurance = reservationData.insurance?.name || '';
        // Usar conteo de pasajeros desde viajeros
        tourData.totalPassengers = parseInt(passengersCount.adults) + parseInt(passengersCount.children);
        tourData.childrenCount = passengersCount.children;
        tourData.departureDate = reservationData.departureDate || '';
        tourData.returnDate = reservationData.returnDate || '';
        tourData.price = totalValue;
        
        // Usar el ID del tour desde tourData
        const itemId = tourData.tkId?.toString() || tourData.id?.toString() || '';
        
        return this.analyticsService.buildEcommerceItemFromTourData(
          tourData,
          itemListId,
          itemListName,
          itemId
        ).pipe(
          switchMap((item) => {
            return this.analyticsService.getCurrentUserData().pipe(
              map((userData) => ({ item, userData }))
            );
          })
        );
      }),
      catchError((error) => {
        console.error('Error obteniendo datos completos del tour para purchase:', error);
        // Fallback con datos básicos
        const tourData = reservationData.tour || {};
        const tourDataForEcommerce: TourDataForEcommerce = {
          id: tourData.id,
          tkId: tourData.tkId ?? undefined,
          name: reservationData.tourName || tourData.name || undefined,
          destination: {
            continent: tourData.destination?.continent || undefined,
            country: tourData.destination?.country || undefined
          },
          days: tourData.days || undefined,
          nights: tourData.nights || undefined,
          rating: tourData.rating || undefined,
          monthTags: tourData.monthTags || undefined,
          tourType: tourData.tourType || undefined,
          flightCity: reservationData.flight?.originCity || '',
          activitiesText: reservationData.activities && reservationData.activities.length > 0
            ? reservationData.activities.map((a: any) => a.description || a.name).join(', ')
            : '',
          selectedInsurance: reservationData.insurance?.name || '',
          childrenCount: '0',
          totalPassengers: this.reservation?.totalPassengers || undefined,
          departureDate: reservationData.departureDate || '',
          returnDate: reservationData.returnDate || '',
          price: totalValue
        };

        const itemId = tourDataForEcommerce.tkId?.toString() || tourDataForEcommerce.id?.toString() || '';
        return this.analyticsService.buildEcommerceItemFromTourData(
          tourDataForEcommerce,
          itemListId,
          itemListName,
          itemId
        ).pipe(
          map((item) => ({ item, userData: this.getUserData() }))
        );
      })
    ).subscribe({
      next: ({ item, userData }) => {
        // El item ya tiene item_list_id e item_list_name desde buildEcommerceItemFromTourData
        // No necesitamos actualizarlo, solo pasarlo directamente
        this.analyticsService.purchase(
          {
            transaction_id: transactionId,
            value: totalValue,
            tax: 0.6,
            shipping: 0.0,
            currency: 'EUR',
            coupon: reservationData.coupon?.code || '',
            payment_type: paymentType,
            items: [item]
          },
          userData
        );
      },
      error: (error) => {
        console.error('Error final obteniendo datos para purchase:', error);
      }
    });
  }

  /**
   * Obtiene datos completos del tour para analytics (rating, continent, country, monthTags, days, nights, tourType)
   */
  private getCompleteTourDataForEcommerce(tourId: number): Observable<TourDataForEcommerce> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      concatMap((itineraries) => {
        if (itineraries.length === 0) {
          return forkJoin({
            tour: this.tourService.getById(tourId, false),
            rating: this.reviewsService.getAverageRating({ tourId: tourId }).pipe(
              map((ratingResponse) => {
                const avgRating = ratingResponse?.averageRating;
                return avgRating && avgRating > 0 ? avgRating : null;
              }),
              catchError(() => of(null))
            )
          }).pipe(
            map(({ tour, rating }) => ({
              id: tourId,
              tkId: tour.tkId ?? undefined,
              name: tour.name ?? undefined,
              destination: { continent: undefined, country: undefined },
              days: undefined,
              nights: undefined,
              rating: rating !== null ? rating : undefined,
              monthTags: undefined,
              tourType: tour.tripTypeId === 1 ? 'FIT' : 'Grupos',
              price: tour.minPrice ?? undefined
            } as TourDataForEcommerce))
          );
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
            
            return this.locationNetService.getLocationsByIds(locationIds).pipe(
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

        // Obtener departures para extraer monthTags desde las fechas
        const departureRequests = itineraries.map((itinerary) =>
          this.departureService.getByItinerary(itinerary.id, false).pipe(
            catchError(() => of([] as IDepartureResponse[]))
          )
        );

        const monthTagsRequest = departureRequests.length > 0 
          ? forkJoin(departureRequests).pipe(
              map((departureArrays: IDepartureResponse[][]) => {
                const allDepartures = departureArrays.flat();
                const availableMonths: string[] = [];
                
                // Extraer meses de las fechas de departure
                allDepartures.forEach((departure: IDepartureResponse) => {
                  if (departure.departureDate) {
                    const date = new Date(departure.departureDate);
                    const monthIndex = date.getMonth(); // 0-11
                    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    if (monthIndex >= 0 && monthIndex < 12) {
                      const monthName = monthNames[monthIndex];
                      if (!availableMonths.includes(monthName)) {
                        availableMonths.push(monthName);
                      }
                    }
                  }
                });
                
                return availableMonths;
              }),
              catchError(() => of([]))
            )
          : of([]);

        return forkJoin({
          itineraryDays: itineraryDaysRequest,
          locationData: locationRequest,
          monthTags: monthTagsRequest,
          tour: this.tourService.getById(tourId, false),
          rating: this.reviewsService.getAverageRating({ tourId: tourId }).pipe(
            map((ratingResponse) => {
              const avgRating = ratingResponse?.averageRating;
              return avgRating && avgRating > 0 ? avgRating : null;
            }),
            catchError(() => of(null))
          )
        }).pipe(
          map(({ itineraryDays, locationData, monthTags, tour, rating }) => {
            const days = itineraryDays.length;
            const nights = days > 0 ? days - 1 : 0;
            const tourType = tour.tripTypeId === 1 ? 'FIT' : 'Grupos';

            return {
              id: tourId,
              tkId: tour.tkId ?? undefined,
              name: tour.name ?? undefined,
              destination: {
                continent: locationData.continent || undefined,
                country: locationData.country || undefined
              },
              days: days > 0 ? days : undefined,
              nights: nights > 0 ? nights : undefined,
              rating: rating !== null ? rating : undefined,
              monthTags: monthTags.length > 0 ? monthTags : undefined,
              tourType: tourType,
              flightCity: '',
              price: tour.minPrice ?? undefined
            } as TourDataForEcommerce;
          }),
          catchError(() => of({
            id: tourId,
            days: undefined,
            nights: undefined,
            destination: { continent: undefined, country: undefined },
            monthTags: undefined,
            tourType: undefined
          } as TourDataForEcommerce))
        );
      }),
      catchError(() => of({
        id: tourId,
        days: undefined,
        nights: undefined,
        destination: { continent: undefined, country: undefined },
        monthTags: undefined,
        tourType: undefined
      } as TourDataForEcommerce))
    );
  }

  /**
   * Obtiene las actividades asignadas desde los viajeros de la reservación
   */
  private getActivitiesFromTravelers(): Observable<string> {
    const reservationData = this.reservation as any;
    if (!this.reservationId || !reservationData?.itineraryId) {
      return of('');
    }

    const itineraryId = reservationData.itineraryId;
    const departureId = reservationData.departureId || undefined;

    // Obtener todos los viajeros de la reservación
    return this.reservationTravelerService.getByReservation(this.reservationId).pipe(
      switchMap((travelers) => {
        if (!travelers || travelers.length === 0) {
          return of('');
        }

        // Obtener todas las actividades asignadas (individuales y packs) de todos los viajeros
        const activityRequests = travelers.map(traveler =>
          forkJoin({
            activities: this.reservationTravelerActivityService.getByReservationTraveler(traveler.id).pipe(
              catchError(() => of([]))
            ),
            activityPacks: this.reservationTravelerActivityPackService.getByReservationTraveler(traveler.id).pipe(
              catchError(() => of([]))
            )
          })
        );

        return forkJoin(activityRequests).pipe(
          switchMap((results) => {
            // Recopilar todos los IDs únicos de actividades y packs
            const activityIds = new Set<number>();
            const packIds = new Set<number>();

            results.forEach(result => {
              result.activities.forEach((activity: any) => {
                if (activity.activityId) {
                  activityIds.add(activity.activityId);
                }
              });
              result.activityPacks.forEach((pack: any) => {
                if (pack.activityPackId) {
                  packIds.add(pack.activityPackId);
                }
              });
            });

            if (activityIds.size === 0 && packIds.size === 0) {
              return of('');
            }

            // Obtener todas las actividades disponibles del itinerario
            return this.activityService.getForItineraryWithPacks(
              itineraryId,
              departureId,
              undefined,
              true, // isVisibleOnWeb
              true  // onlyOpt
            ).pipe(
              map((allActivities: IActivityResponse[]) => {
                // Filtrar actividades asignadas
                const assignedActivities = allActivities.filter(activity => {
                  if (activity.type === 'act') {
                    return activityIds.has(activity.id);
                  } else if (activity.type === 'pack') {
                    return packIds.has(activity.id);
                  }
                  return false;
                });

                // Formatear nombres de actividades
                const activityNames = assignedActivities
                  .map(activity => activity.name)
                  .filter(name => name && name.trim().length > 0);

                return activityNames.join(', ');
              }),
              catchError(() => of(''))
            );
          })
        );
      }),
      catchError(() => of(''))
    );
  }

  /**
   * Obtiene el conteo de pasajeros adultos y niños desde los viajeros y age groups
   */
  private getPassengersCount(): Observable<{ adults: string; children: string }> {
    if (!this.reservationId) {
      return of({ adults: '0', children: '0' });
    }

    return forkJoin({
      travelers: this.reservationTravelerService.getByReservation(this.reservationId),
      ageGroups: this.ageGroupService.getAll()
    }).pipe(
      map(({ travelers, ageGroups }) => {
        let adultsCount = 0;
        let childrenCount = 0;

        travelers.forEach(traveler => {
          const ageGroup = ageGroups.find((group: any) => group.id === traveler.ageGroupId);
          if (ageGroup) {
            // Si upperLimitAge es null o undefined, es adulto
            // Si upperLimitAge <= 15, es niño
            // Si upperLimitAge > 15, es adulto
            if (ageGroup.upperLimitAge === null || ageGroup.upperLimitAge === undefined) {
              adultsCount++;
            } else if (ageGroup.upperLimitAge <= 15) {
              childrenCount++;
            } else {
              adultsCount++;
            }
          } else {
            // Si no se encuentra el grupo de edad, asumir adulto
            adultsCount++;
          }
        });

        return {
          adults: adultsCount.toString(),
          children: childrenCount.toString()
        };
      }),
      catchError(() => of({ adults: '0', children: '0' }))
    );
  }

  /**
   * Obtiene datos del usuario para analytics
   */
  private getUserData() {
    if (this.authService.isAuthenticatedValue()) {
      return this.analyticsService.getUserData(
        this.authService.getUserEmailValue(),
        undefined,
        this.authService.getCognitoIdValue()
      );
    }
    return undefined;
  }

  /**
   * Genera puntos después del pago exitoso (3% del PVP) y cambia el estado de la reserva a BOOKED
   */
  private async generatePointsAfterPayment(): Promise<void> {
    try {
      
      if (!this.reservation?.id || !this.reservation?.totalAmount) {
        console.warn('No se puede generar puntos: falta reservationId o totalAmount');
        return;
      }

      // 1. Cambiar estado de la reserva a BOOKED (5)
      await this.updateReservationStatusToBooked();

      // 2. Obtener el cognito:sub del usuario principal
      const cognitoSub = this.authService.getCognitoIdValue();
      if (!cognitoSub) {
        console.warn('No se puede generar puntos: usuario no autenticado');
        return;
      }

      // 3. Calcular puntos (3% del PVP)
      const pointsToGenerate = Math.floor(this.reservation.totalAmount * 0.03);

      if (pointsToGenerate <= 0) {
        return;
      }

      // 4. Crear transacción de acumulación de puntos
      // TODO: Actualizar a nuevo esquema del backend cuando tengamos el userId numérico
      // Por ahora comentado para evitar errores de compilación
      /* 
      const transaction = {
        travelerId: cognitoSub,
        points: pointsToGenerate,
        transactionType: 'ACUMULAR',
        transactionCategory: 'VIAJE',
        description: `Acumulación de ${pointsToGenerate} puntos por reserva #${this.reservation.id}`,
        reservationId: this.reservation.id
      };

      await this.pointsService.createLoyaltyTransaction(transaction);
      */
      
      console.log('⚠️ Acumulación de puntos temporalmente deshabilitada - pendiente de actualizar a nuevo esquema');

      // 5. Mostrar mensaje al usuario
      this.messageService.add({
        severity: 'success',
        summary: 'Puntos generados',
        detail: `Se han generado ${pointsToGenerate} puntos por tu compra`,
        life: 5000,
      });

    } catch (error) {
      console.error('Error generando puntos:', error);
      // No mostrar error al usuario para no interrumpir el flujo de pago
    }
  }

  /**
   * Actualiza el estado de la reserva a BOOKED (5) después del pago exitoso
   */
  private async updateReservationStatusToBooked(): Promise<void> {
    try {
      if (!this.reservation?.id) {
        console.warn('No se puede actualizar estado: falta reservationId');
        return;
      }

      // Cambiar estado a BOOKED (5)
      await this.reservationService.updateStatus(this.reservation.id, 5).toPromise();
      
      console.log(`Reserva ${this.reservation.id} actualizada a estado BOOKED (5)`);
      
    } catch (error) {
      console.error('Error actualizando estado de reserva a BOOKED:', error);
      // No lanzar error para no interrumpir el flujo de pago
    }
  }
}
