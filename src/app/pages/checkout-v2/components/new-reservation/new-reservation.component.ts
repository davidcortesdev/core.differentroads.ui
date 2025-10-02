// new-reservation.component.ts
import { Component, OnInit } from '@angular/core';
import {
  IReservationResponse,
  ReservationService,
} from '../../../../core/services/reservation/reservation.service';
import { ActivatedRoute } from '@angular/router';
import {
  IPaymentResponse,
  IPaymentStatusResponse,
  PaymentsNetService,
  PaymentStatusFilter,
} from '../../services/paymentsNet.service';
import { PaymentStatusNetService } from '../../services/paymentStatusNet.service';
import { PaymentMethodNetService } from '../../services/paymentMethodNet.service';
import { NewScalapayService } from '../../services/newScalapay.service';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
// IMPORTACIONES PARA TRAVELERS (solo para obtener el nombre del lead traveler)
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerFieldService,
  IReservationTravelerFieldResponse,
} from '../../../../core/services/reservation/reservation-traveler-field.service';
import { FlightSearchService, IAmadeusFlightCreateOrderResponse } from '../../../../core/services/flight-search.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { AuthenticateService } from '../../../../core/services/auth-service.service';

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
  styleUrls: ['./new-reservation.component.scss', './amadeus-flight-section.scss'],
  providers: [MessageService],
})
export class NewReservationComponent implements OnInit {
  // Propiedades principales
  reservationId: number = 0;
  paymentId: number = 0;
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

  constructor(
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
    private authService: AuthenticateService
  ) {
    // Calcular la fecha del día siguiente
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.nextDayDate = tomorrow.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  ngOnInit(): void {
    console.log('NewReservationComponent initialized');

    // Obtener parámetros de la ruta
    this.route.params.subscribe((params) => {
      this.reservationId = params['reservationId'];
      this.paymentId = params['paymentId'];
      console.log('Reservation ID obtenido:', this.reservationId);
      console.log('Payment ID obtenido:', this.paymentId);
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
        console.log('Datos de la reserva:', reservation);

        // Actualizar conceptos bancarios con ID de reserva
        this.updateBankConcepts();

        // CARGAR NOMBRE DEL LEAD TRAVELER PARA EL SALUDO
        this.loadLeadTravelerName();

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
    console.log('Cargando lead traveler para saludo...');

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          // Encontrar el lead traveler
          const leadTraveler = travelers.find(
            (traveler) => traveler.isLeadTraveler
          );
          if (leadTraveler) {
            console.log('Lead traveler encontrado:', leadTraveler);
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
          console.log('Campos del lead traveler:', fields);

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
          console.log(
            'Nombre completo del lead traveler:',
            this.leadTravelerName
          );

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
    console.log('Conceptos bancarios actualizados:', concept);
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
    console.log('Conceptos bancarios actualizados con nombre:', concept);
  }

  /**
   * Carga la información del pago
   */
  private loadPayment(): void {
    this.paymentService.getPaymentById(this.paymentId).subscribe({
      next: (payment: IPaymentResponse) => {
        this.payment = payment;
        console.log('Datos del pago:', payment);

        // Cargar método de pago
        this.loadPaymentMethod(payment.paymentMethodId);

        // Cargar estado de pago
        this.loadPaymentStatus(payment.paymentStatusId);

        // ✅ NUEVO: Verificar si el pago ya está completado al cargarlo
        if (payment.paymentStatusId === this.successId) {
          console.log('✅ Pago ya completado al cargar, verificando vuelos Amadeus...');
          // No es necesario esperar aquí, loadPaymentStatus ya manejará la verificación
        }

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
        console.log('Método de pago cargado:', method);

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
        console.log('Estado de pago cargado:', status);

        // Determinar el status
        if (status.code === 'PENDING') {
          this.status = 'PENDING';
        } else if (status.code === 'COMPLETED') {
          this.status = 'SUCCESS';
          
          // Disparar evento purchase
          this.trackPurchase();
          
          // ✅ NUEVO: Si el pago está completado, verificar y reservar vuelos Amadeus
          console.log('✅ Pago completado, verificando vuelos Amadeus...');
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
    // ✅ NUEVO: Validar que el pago no esté ya completado antes de intentar capturar
    if (this.payment?.paymentStatusId === this.successId) {
      console.log('✅ Pago ya completado, no es necesario capturar de nuevo');
      // Llamar al servicio de vuelos ya que el pago está completado
      this.checkAndBookAmadeusFlight();
      return;
    }

    if (this.payment?.transactionReference) {
      console.log('🔄 Pago pendiente, procediendo con captura...');
      this.captureOrder();
    } else {
      console.log('❌ No hay transaction reference disponible para captura');
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

    // ✅ NUEVO: Validar que el pago no esté ya completado antes de capturar
    if (this.payment.paymentStatusId === this.successId) {
      console.log('✅ Pago ya completado, no es necesario capturar de nuevo');
      // Llamar al servicio de vuelos ya que el pago está completado
      this.checkAndBookAmadeusFlight();
      return;
    }

    console.log('🚀 Iniciando captura de orden Scalapay...');

    this.scalapayService
      .captureOrder(this.payment.transactionReference)
      .subscribe({
        next: (response: any) => {
          console.log('Orden capturada exitosamente:', response);

          // Actualizar estado del pago
          if (this.payment) {
            this.payment.paymentStatusId = this.successId;
            this.updatePaymentStatus();

            this.status = 'SUCCESS';
            
            // Disparar evento purchase
            this.trackPurchase();
            
            this.showMessage(
              'success',
              'Pago completado',
              'El pago se ha procesado correctamente'
            );
            
            // ✅ NUEVO: Verificar y reservar vuelos Amadeus después del pago exitoso
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
   * Maneja la subida del justificante de transferencia
   */
  handleVoucherUpload(response: any): void {
    console.log('Voucher uploaded successfully:', response);

    if (this.payment && response.secure_url) {
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
          console.error('Error updating payment with voucher:', error);
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
    console.error('Error uploading voucher:', error);
    this.showMessage(
      'error',
      'Error de subida',
      'Ha ocurrido un error al subir el justificante. Por favor, inténtalo de nuevo.'
    );
  }

  /**
   * Visualiza el justificante subido
   */
  viewVoucher(): void {
    if (this.payment?.attachmentUrl) {
      window.open(this.payment.attachmentUrl, '_blank');
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
   * ✅ NUEVO: Verifica si hay vuelos Amadeus seleccionados y procede con la reserva
   */
  public checkAndBookAmadeusFlight(): void {
    if (!this.reservationId) {
      console.log('❌ No hay reservationId disponible para verificar vuelos');
      return;
    }

    console.log('🔍 Verificando si hay vuelos Amadeus seleccionados...');
    
    this.flightSearchService.getSelectionStatus(this.reservationId).subscribe({
      next: (hasSelection: boolean) => {
        this.hasAmadeusFlight = hasSelection;
        console.log('✅ Estado de selección de vuelos:', hasSelection);
        
        if (hasSelection) {
          console.log('✈️ Vuelo Amadeus detectado, procediendo con la reserva...');
          this.bookAmadeusFlight();
        } else {
          console.log('ℹ️ No hay vuelos Amadeus seleccionados');
        }
      },
      error: (error) => {
        console.error('❌ Error al verificar estado de vuelos:', error);
        this.flightBookingError = true;
      }
    });
  }

  /**
   * ✅ NUEVO: Realiza la reserva del vuelo Amadeus
   */
  private bookAmadeusFlight(): void {
    if (!this.reservationId) return;

    this.flightBookingLoading = true;
    this.flightBookingError = false;
    
    console.log('🚀 Iniciando reserva de vuelo Amadeus...');
    
    this.flightSearchService.bookFlight(this.reservationId).subscribe({
      next: (response: IAmadeusFlightCreateOrderResponse) => {
        console.log('✅ Reserva de vuelo exitosa:', response);
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
        console.error('❌ Error al reservar vuelo:', error);
        this.flightBookingError = true;
        this.flightBookingLoading = false;
        
        // Mostrar mensaje de error
        this.showMessage(
          'error',
          'Error en reserva de vuelo',
          'No se pudo completar la reserva del vuelo. Contacta con soporte.'
        );
      }
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
    if (!this.reservation) return;

    const reservationData = this.reservation as any; // Usar any para acceder a propiedades dinámicas
    const tourData = reservationData.tour || {};
    
    // Obtener información del pago
    const paymentType = this.paymentType || 'completo, transferencia';
    const transactionId = this.payment?.id?.toString() || `#${this.reservationId}`;
    const totalValue = this.reservation.totalAmount || 0;
    
    // Obtener actividades seleccionadas (si están disponibles)
    const activitiesText = reservationData.activities && reservationData.activities.length > 0
      ? reservationData.activities.map((a: any) => a.description || a.name).join(', ')
      : '';
    
    // Obtener seguro seleccionado
    const selectedInsurance = reservationData.insurance?.name || '';
    
    // Obtener información de vuelo (si está disponible)
    const flightCity = reservationData.flight?.originCity || 'Sin vuelo';
    
    this.analyticsService.purchase(
      {
        transaction_id: transactionId,
        value: totalValue,
        tax: 0.60, // IVA fijo según el documento
        shipping: 0.00, // Sin gastos de envío
        currency: 'EUR',
        coupon: reservationData.coupon?.code || '',
        payment_type: paymentType,
        items: [{
          item_id: tourData.tkId?.toString() || tourData.id?.toString() || '',
          item_name: reservationData.tourName || tourData.name || '',
          coupon: '',
          discount: 0,
          index: 0,
          item_brand: 'Different Roads',
          item_category: tourData.destination?.continent || '',
          item_category2: tourData.destination?.country || '',
          item_category3: tourData.marketingSection?.marketingSeasonTag || '',
          item_category4: tourData.monthTags?.join(', ') || '',
          item_category5: tourData.tourType || '',
          item_list_id: 'checkout',
          item_list_name: 'Carrito de compra',
          item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
          price: totalValue,
          quantity: 1,
          puntuacion: tourData.rating?.toString() || '',
          duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
          start_date: reservationData.departureDate || '',
          end_date: reservationData.returnDate || '',
          pasajeros_adultos: this.reservation.totalPassengers?.toString() || '0',
          pasajeros_niños: '0',
          actividades: activitiesText,
          seguros: selectedInsurance,
          vuelo: flightCity
        }]
      },
      this.getUserData()
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
}
