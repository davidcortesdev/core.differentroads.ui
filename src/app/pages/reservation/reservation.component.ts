import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { MessageService } from 'primeng/api';
import {
  Subject,
  takeUntil,
  catchError,
  EMPTY,
  finalize,
  of,
  switchMap,
  Observable,
  tap,
} from 'rxjs';
import { BookingsService } from '../../core/services/bookings.service';
import {
  ReservationInfo,
  BankInfo,
  Flight,
  PriceDetail,
} from '../../core/models/reservation/reservation.model';
import { BookingMappingService } from '../../core/services/booking-mapping.service';
import {
  Payment,
  VoucherReviewStatus,
  PaymentStatus,
  // PaymentMethod, // Eliminar esta importación que no existe
} from '../../core/models/bookings/payment.model';
import { Booking } from '../../core/models/bookings/booking.model';
import { CloudinaryResponse } from '../../core/services/file-upload.service';
import { ScalapayService } from '../../core/services/checkout/payment/scalapay.service';
import { ScalapayGetOrdersDetailsResponse } from '../../core/models/scalapay/ScalapayGetOrdersDetailsResponse';
import { ScalapayCaptureOrderRespone } from '../../core/models/scalapay/ScalapayCaptureOrderRespone';

// Definir el tipo PaymentMethod localmente
type PaymentMethod = 'payin' | 'transfer' | 'card';

// Definición de tipos para el componente
type ReservationPaymentStatus =
  | 'confirm'
  | 'rq'
  | 'transfer'
  | 'scalapay'
  | undefined;
type ScalapayPaymentStatus = 'success' | 'error' | null;

// Interfaz para la respuesta de completar pago
interface CompletePaymentRequest {
  publicID: string;
  method: PaymentMethod;
  provider: string;
  providerResponse: string;
  externalId: string;
  status: PaymentStatus;
}

@Component({
  selector: 'app-reservation',
  standalone: false,
  templateUrl: './reservation.component.html',
  styleUrls: ['./reservation.component.scss'],
  providers: [MessageService, BookingMappingService],
})
export class ReservationComponent implements OnInit, OnDestroy {
  private destroy$: Subject<void> = new Subject<void>();
  loading: boolean = true;
  error: boolean = false;
  bookingId: string = '';
  nextDayDate: string;

  reservationInfo: ReservationInfo | undefined;
  bankInfo: BankInfo[] = [
    {
      name: 'CaixaBank, S.A.',
      account: 'ES35 2100 1463 1702 0013 5710',
      beneficiary: 'Different Roads S.L',
      concept: '784932 Laura Segarra',
    },
    {
      name: 'BANCO SANTANDER, S.A.',
      account: 'ES55 0049 0265 4423 1052 3788',
      beneficiary: 'Different Roads S.L',
      concept: '784932 Laura Segarra',
    },
  ];
  flights: Flight[] = [];
  priceDetails: PriceDetail[] = [];
  paymentInfo: Payment | undefined;
  paymentID: string = '';
  bookingData: Booking | undefined;
  uploadedVoucher: CloudinaryResponse | null = null;
  paymentStatus: ReservationPaymentStatus;
  orderToken: string | null = null;
  scalapayPaymentStatus: ScalapayPaymentStatus = null;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private bookingsService: BookingsService,
    private bookingMapper: BookingMappingService,
    private scalapayService: ScalapayService
  ) {
    // Calcular la fecha del día siguiente en formato dd/mm/yyyy
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.nextDayDate = tomorrow.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  ngOnInit(): void {
    // Obtener el token de la orden de los query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params: Params) => {
        if (params['orderToken']) {
          this.orderToken = params['orderToken'];
        }
        if (params['status']) {
          // Almacenar el valor original, la comparación se hará con toLowerCase()
          this.scalapayPaymentStatus = params['status'] as ScalapayPaymentStatus;
          console.log('[Scalapay Debug] Estado de pago recibido:', this.scalapayPaymentStatus);
        }
      });

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe((params: Params) => {
        this.bookingId = params['id'];
        this.paymentID = params['paymentID'];
        
        // Iniciar el flujo secuencial
        this.initializeDataFlow();
      });
  }

  /**
   * Inicializa el flujo de datos de manera secuencial
   */
  private initializeDataFlow(): void {
    this.loading = true;
    
    if (!this.bookingId) {
      this.error = true;
      this.loading = false;
      this.showErrorMessage('No se pudo encontrar el ID de reserva en la URL.');
      return;
    }
    
    // Primero obtenemos los datos de la reserva
    this.bookingsService.getBookingById(this.bookingId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error = true;
          this.showErrorMessage('Error al cargar los datos de la reserva.');
          console.error('Error fetching booking:', err);
          return EMPTY;
        }),
        // Si tenemos un paymentID, obtenemos los datos del pago después de la reserva
        switchMap((booking: Booking) => {
          // Procesamos los datos de la reserva
          this.processBookingData(booking);
          
          // Si tenemos un paymentID, obtenemos los datos del pago
          if (this.paymentID) {
            return this.bookingsService.getPaymentsByPublicID(this.paymentID);
          }
          
          // Si no hay paymentID, terminamos el flujo
          this.loading = false;
          return EMPTY;
        }),
        catchError((err) => {
          this.error = true;
          this.showErrorMessage('Error al cargar los datos del pago.');
          console.error('Error fetching payment:', err);
          return EMPTY;
        }),
        // Después de obtener los datos del pago, procesamos el pago de Scalapay si es necesario
        switchMap((payment: Payment) => {
          // Procesamos los datos del pago
          this.processPaymentData(payment);
          
          // Si tenemos los datos necesarios para procesar el pago de Scalapay, lo hacemos
          if (
            this.orderToken && 
            this.scalapayPaymentStatus && 
            this.paymentInfo?.provider?.toLowerCase() === 'scalapay' &&
            this.paymentInfo.status === 'PENDING'
          ) {
            return this.processScalapayPaymentFlow();
          }
          
          // Si no hay que procesar el pago de Scalapay, terminamos el flujo
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(
        (result) => {
          if (result) {
            this.showPaymentResultMessage();
            // Refrescar los datos después de procesar el pago
            this.refreshData();
          }
        }
      );
  }

  /**
   * Procesa los datos de la reserva
   * @param booking Datos de la reserva
   */
  private processBookingData(booking: Booking): void {
    // Mapear la reserva utilizando booking y, de estar disponible, paymentInfo.
    this.reservationInfo = this.bookingMapper.mapToReservationInfo(
      booking,
      this.paymentInfo
    );

    this.flights = this.bookingMapper.mapToFlights(booking);
    this.priceDetails = this.bookingMapper.mapToPriceDetails(booking);

    // Actualizar bankInfo con datos específicos del booking.
    if (booking.code) {
      this.bankInfo.forEach((bank) => {
        bank.concept = `${booking.code} ${
          this.reservationInfo?.customerName || ''
        }`;
      });
    }

    this.bookingData = booking;
    console.log('Booking data:', booking);
  }

  /**
   * Procesa los datos del pago
   * @param payment Datos del pago
   */
  private processPaymentData(payment: Payment): void {
    console.log('Payment data:', payment);
    this.paymentInfo = payment;
    if (payment.vouchers && payment.vouchers.length > 0) {
      this.uploadedVoucher = {
        secure_url: payment.vouchers[0].fileUrl,
        public_id: payment.vouchers[0].id,
      } as CloudinaryResponse;
    }

    this.updatePaymentStatus(payment);

    // Si ya se cargó el booking, actualiza la información de la reserva.
    if (this.bookingData) {
      this.reservationInfo = this.bookingMapper.mapToReservationInfo(
        this.bookingData,
        this.paymentInfo
      );
    }
  }

  /**
   * Procesa el flujo de pago de Scalapay
   * @returns Observable con el resultado del procesamiento
   */
  private processScalapayPaymentFlow(): Observable<any> {
    console.log('[Scalapay Debug] Iniciando procesamiento de pago Scalapay', {
      paymentID: this.paymentID,
      orderToken: this.orderToken,
      paymentStatus: this.scalapayPaymentStatus,
    });

    // Obtener detalles de la orden de Scalapay
    const externalId = this.paymentInfo?.externalID || this.orderToken;
    console.log('[Scalapay Debug] ID externo a utilizar:', externalId);
    
    if (!externalId) {
      console.error('[Scalapay Debug] No se encontró ID externo para la orden');
      return of(null);
    }

    return this.scalapayService.getOrderDetails(externalId).pipe(
      switchMap((orderDetails: ScalapayGetOrdersDetailsResponse) => {
        console.log('[Scalapay Debug] Detalles de la orden obtenidos:', orderDetails);
        const providerResponse = JSON.stringify(orderDetails);

        // Si la orden está autorizada, capturarla
        if (
          orderDetails.status === 'authorized' &&
          this.scalapayPaymentStatus?.toLowerCase() === 'success'
        ) {
          console.log('[Scalapay Debug] Orden autorizada, procediendo a capturar');
          return this.scalapayService.captureOrder({ token: externalId }).pipe(
            switchMap((captureResponse: ScalapayCaptureOrderRespone) => {
              console.log('[Scalapay Debug] Respuesta de captura:', captureResponse);
              // Actualizar el estado del pago en nuestra base de datos
              return this.completeScalapayPayment(externalId, JSON.stringify(captureResponse));
            }),
            catchError((error) => {
              console.error('[Scalapay Debug] Error al capturar la orden:', error);
              // Si hay un error en la captura, registramos el pago como fallido
              return this.completeScalapayPayment(
                externalId,
                JSON.stringify({
                  error: error.message || 'Error en la captura del pago',
                  timestamp: new Date().toISOString(),
                  orderDetails
                })
              );
            })
          );
        } else if (this.scalapayPaymentStatus?.toLowerCase() === 'error') {
          console.log('[Scalapay Debug] Pago fallido, registrando error');
          // Registrar explícitamente el error del pago
          return this.completeScalapayPayment(
            externalId,
            JSON.stringify({
              error: 'Pago rechazado por Scalapay',
              status: orderDetails.status,
              timestamp: new Date().toISOString(),
              orderDetails
            })
          );
        } else {
          console.log('[Scalapay Debug] Orden no autorizada o pago fallido, actualizando estado');
          // Actualizar el estado del pago sin capturar
          return this.completeScalapayPayment(externalId, providerResponse);
        }
      }),
      catchError((error) => {
        console.error('[Scalapay Debug] Error al obtener detalles de la orden:', error);
        return of(null);
      })
    );
  }

  /**
   * Refresca los datos de la reserva y del pago
   */
  private refreshData(): void {
    // Refrescar los datos de la reserva
    this.bookingsService.getBookingById(this.bookingId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error('Error refreshing booking data:', err);
          return EMPTY;
        })
      )
      .subscribe((booking: Booking) => {
        this.processBookingData(booking);
        
        // Refrescar los datos del pago
        if (this.paymentID) {
          this.bookingsService.getPaymentsByPublicID(this.paymentID)
            .pipe(
              takeUntil(this.destroy$),
              catchError((err) => {
                console.error('Error refreshing payment data:', err);
                return EMPTY;
              })
            )
            .subscribe((payment: Payment) => {
              this.processPaymentData(payment);
            });
        }
      });
  }

  // Eliminar los métodos getBookingData() y getPaymentData() ya que ahora usamos initializeDataFlow()

  /**
   * Completa el pago de Scalapay
   * @param externalId ID externo del pago
   * @param providerResponse Respuesta del proveedor
   * @returns Observable con la respuesta de completar el pago
   */
  private completeScalapayPayment(
    externalId: string,
    providerResponse: string
  ): Observable<any> {
    console.log(
      '[Scalapay Debug] Completando pago con externalId:',
      externalId
    );

    const paymentRequest: CompletePaymentRequest = {
      publicID: this.paymentID,
      method: 'payin',
      provider: 'Scalapay',
      providerResponse,
      externalId,
      status:
        this.scalapayPaymentStatus?.toLowerCase() === 'success'
          ? PaymentStatus.COMPLETED
          : PaymentStatus.CANCELLED,
    };

    console.log(
      '[Scalapay Debug] Datos de la solicitud de completar pago:',
      paymentRequest
    );

    // Corregir la llamada para incluir el tercer argumento (data)
    return this.bookingsService
      .completePayment(
        this.bookingId,
        this.paymentID,
        paymentRequest as unknown as Payment
      )
      .pipe(
        tap((response) => {
          console.log(
            '[Scalapay Debug] Respuesta de completar pago:',
            response
          );
        }),
        catchError((error) => {
          console.error('[Scalapay Debug] Error al completar el pago:', error);
          throw error;
        })
      );
  }

  /**
   * Muestra un mensaje con el resultado del pago
   */
  private showPaymentResultMessage(): void {
    if (this.scalapayPaymentStatus?.toLowerCase() === 'success') {
      this.messageService.add({
        severity: 'success',
        summary: 'Pago completado',
        detail: 'El pago con Scalapay se ha procesado correctamente.',
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Pago fallido',
        detail: 'El pago con Scalapay no se ha podido completar.',
      });
    }
  }

  /**
   * Muestra un mensaje de error
   * @param message Mensaje de error
   */
  private showErrorMessage(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
  }

  /**
   * Maneja la subida de un justificante
   * @param response Respuesta de Cloudinary
   */
  handleVoucherUpload(response: CloudinaryResponse): void {
    this.uploadedVoucher = response;

    if (this.bookingId && response) {
      this.bookingsService
        .uploadVoucher(this.bookingId, this.paymentID, {
          fileUrl: response.secure_url,
          uploadDate: new Date(),
          reviewStatus: VoucherReviewStatus.PENDING,
          id: response.public_id,
          metadata: response,
        })
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.handleVoucherError(error);
            return EMPTY;
          })
        )
        .subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Justificante subido',
            detail: 'El justificante se ha subido correctamente.',
          });
          // Refrescar el estado de la reserva después de subir el justificante
          this.refreshData();
        });
    }
  }

  /**
   * Maneja errores en la subida de justificantes
   * @param error Error producido
   */
  handleVoucherError(error: any): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al subir el justificante.',
    });
  }

  /**
   * Visualiza el justificante subido
   */
  viewVoucher(): void {
    if (this.uploadedVoucher && this.uploadedVoucher.secure_url) {
      window.open(this.uploadedVoucher.secure_url, '_blank');
    }
  }

  /**
   * Calcula el precio total de la reserva
   */
  get totalPrice(): number {
    return this.priceDetails.reduce((sum, item) => sum + item.total, 0);
  }

  /**
   * Formatea una fecha para mostrarla en español
   * @param date Fecha a formatear
   * @returns Fecha formateada
   */
  parseBookingCreatedAt(date: string): string {
    if (!date) return '';

    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();

    // Obtener el nombre del mes en español
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const month = months[dateObj.getMonth()];

    return `${day} de ${month}, ${year}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * Actualiza el estado del pago basado en la información recibida
   * @param payment Información del pago
   */
  private updatePaymentStatus(payment: Payment): void {
    if (payment.status === 'PENDING' && payment.method === 'transfer') {
      this.paymentStatus = 'transfer';
    } else if (
      payment.status === 'PENDING' &&
      payment.provider?.toLowerCase() === 'scalapay'
    ) {
      this.paymentStatus = 'scalapay';
    } else {
      this.paymentStatus = undefined;
    }
  }
}
