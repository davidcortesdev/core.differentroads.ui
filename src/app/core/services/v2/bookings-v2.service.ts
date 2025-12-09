import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, switchMap, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ReservationResponse } from '../../models/v2/profile-v2.model';
import { Payment, PaymentStatus, IPaymentVoucher, VoucherReviewStatus } from '../../models/bookings/payment.model';
import { PaymentsNetService, IPaymentResponse } from '../../../pages/checkout-v2/services/paymentsNet.service';
import { PaymentStatusNetService, IPaymentStatusResponse } from '../../../pages/checkout-v2/services/paymentStatusNet.service';
import { PaymentMethodNetService, IPaymentMethodResponse } from '../../../pages/checkout-v2/services/paymentMethodNet.service';
import { PaymentService, PaymentInfo } from '../payments/payment.service';


@Injectable({
  providedIn: 'root',
})
export class BookingsServiceV2 {
  private readonly API_URL = `${environment.reservationsApiUrl}/Reservation`;
  
  // Caché para estados y métodos de pago
  private paymentStatusMap: { [key: number]: string } = {};
  private paymentMethodMap: { [key: number]: string } = {};
  private statusAndMethodsLoaded = false;

  constructor(
    private http: HttpClient,
    private paymentsNetService: PaymentsNetService,
    private paymentStatusService: PaymentStatusNetService,
    private paymentMethodService: PaymentMethodNetService,
    private paymentService: PaymentService
  ) {
    // No cargar estados y métodos en el constructor
    // Se cargarán de forma lazy cuando realmente se necesiten (en getPaymentsByReservationId)
  }

  /**
   * Obtiene reservas por ID de usuario
   * @param userId - ID del usuario
   * @returns Observable de array de ReservationResponse
   */
  getReservationsByUser(userId: number): Observable<ReservationResponse[]> {
    const params = new HttpParams()
      .set('UserId', userId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene reservas activas (Booked, RQ y Prebooked)
   * @param userId - ID del usuario
   * @returns Observable de array de ReservationResponse
   */
  getActiveBookings(userId: number): Observable<ReservationResponse[]> {
    const params = new HttpParams()
      .set('UserId', userId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params }).pipe(
      map((reservations: ReservationResponse[]) => {
        // Activas: 4 (RQ), 5 (BOOKED), 6 (CONFIRMED), 11 (PREBOOKED)
        const filtered = reservations.filter(reservation => 
          reservation.reservationStatusId === 4 ||
          reservation.reservationStatusId === 5 || 
          reservation.reservationStatusId === 6 ||
          reservation.reservationStatusId === 11
        );
        
        return filtered;
      })
    );
  }

  /**
   * Obtiene reservas pendientes (estados 1: DRAFT y 2: CART)
   */
  getPendingBookings(userId: number): Observable<ReservationResponse[]> {
    const params = new HttpParams()
      .set('UserId', userId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params }).pipe(
      map((reservations: ReservationResponse[]) =>
        reservations.filter(reservation => 
          reservation.reservationStatusId === 1 || reservation.reservationStatusId === 2
        )
      )
    );
  }

  /**
   * Obtiene historial de viajes (Completed y Cancelled)
   * @param userId - ID del usuario
   * @returns Observable de array de ReservationResponse
   */
  getTravelHistory(userId: number): Observable<ReservationResponse[]> {
    const params = new HttpParams()
      .set('UserId', userId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params }).pipe(
      // Filtrar solo historial (status 7 = PAID, 8 = CANCELLED)
      map((reservations: ReservationResponse[]) => {

        
        const filtered = reservations.filter(reservation => 
          reservation.reservationStatusId === 7 || reservation.reservationStatusId === 8
        );
        
        return filtered;
      })
    );
  }

  /**
   * Obtiene presupuestos recientes (Budget)
   * @param userId - ID del usuario
   * @returns Observable de array de ReservationResponse
   */
  getRecentBudgets(userId: number): Observable<ReservationResponse[]> {
    const params = new HttpParams()
      .set('UserId', userId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params }).pipe(
      // Filtrar solo presupuestos (status 3 = BUDGET)
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 3
        )
      )
    );
  }

  /**
   * Obtiene detalles de una reserva específica
   * @param reservationId - ID de la reserva
   * @returns Observable de ReservationResponse
   */
  getReservationDetails(reservationId: number): Observable<ReservationResponse> {
    const params = new HttpParams()
      .set('Id', reservationId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params }).pipe(
      map((reservations: ReservationResponse[]) => {
        if (reservations && reservations.length > 0) {
          return reservations[0];
        }
        throw new Error('Reserva no encontrada');
      })
    );
  }

  /**
   * Obtiene reservas donde un email aparece como viajero
   * @param email - Email del viajero
   * @returns Observable de array de ReservationResponse
   */
  getReservationsByTravelerEmail(email: string): Observable<ReservationResponse[]> {
    // Obtener TODOS los campos de email (ReservationFieldId = 11)
    const fieldsUrl = `${environment.reservationsApiUrl}/ReservationTravelerField`;
    const fieldsParams = new HttpParams()
      .set('ReservationFieldId', '11') // 11 = email
      .set('useExactMatchForStrings', 'false');

    return this.http.get<any[]>(fieldsUrl, { params: fieldsParams }).pipe(
      switchMap((allFields: any[]) => {
        
        if (!allFields || allFields.length === 0) {
          return of([]);
        }

        // FILTRAR MANUALMENTE para asegurar coincidencia exacta con el email buscado
        const exactMatchFields = allFields.filter((f: any) => {
          const fieldEmail = f.value?.toLowerCase().trim();
          const searchEmail = email.toLowerCase().trim();
          return fieldEmail === searchEmail;
        });
        
        if (exactMatchFields.length === 0) {
          return of([]);
        }

        // Obtener los IDs de travelers únicos que tienen el email específico
        const travelerIds = [...new Set(exactMatchFields.map((f: any) => f.reservationTravelerId))];

        // Obtener TODOS los travelers y filtrar manualmente
        const travelersUrl = `${environment.reservationsApiUrl}/ReservationTraveler`;
        
        return this.http.get<any[]>(travelersUrl).pipe(
          switchMap((allTravelers: any[]) => {
            
            if (!allTravelers || allTravelers.length === 0) {
              return of([]);
            }
            
            // FILTRAR MANUALMENTE solo los travelers que están en nuestra lista de IDs
            const filteredTravelers = allTravelers.filter(traveler => 
              travelerIds.includes(traveler.id)
            );
            
            // Obtener IDs únicos de reservas SOLO de los travelers que tienen el email
            const reservationIds = [...new Set(filteredTravelers.map((t: any) => t.reservationId))].filter(id => id != null);
            
            if (reservationIds.length === 0) {
              return of([]);
            }

            // Obtener TODAS las reservas y filtrar manualmente por IDs
            return this.http.get<ReservationResponse[]>(this.API_URL).pipe(
              map((allReservations: ReservationResponse[]) => {
                
                if (!allReservations || allReservations.length === 0) {
                  return [];
                }
                
                // FILTRAR MANUALMENTE solo las reservas que están en nuestra lista de IDs
                const filteredReservations = allReservations.filter(reservation => 
                  reservationIds.includes(reservation.id)
                );
                
                return filteredReservations;
              })
            );
          })
        );
      })
    );
  }

  /**
   * Obtiene reservas activas donde un email aparece como viajero
   * @param email - Email del viajero
   * @returns Observable de array de ReservationResponse
   */
  getActiveBookingsByTravelerEmail(email: string): Observable<ReservationResponse[]> {
    return this.getReservationsByTravelerEmail(email).pipe(
      map((reservations: ReservationResponse[]) => {
        // Activas para viajero: 4 (RQ), 5 (BOOKED), 6 (CONFIRMED), 11 (PREBOOKED)
        const filtered = reservations.filter(reservation =>
          reservation.reservationStatusId === 4 ||
          reservation.reservationStatusId === 5 ||
          reservation.reservationStatusId === 6 ||
          reservation.reservationStatusId === 11
        );
        return filtered;
      })
    );
  }

  /**
   * Obtiene historial de viajes donde un email aparece como viajero
   * @param email - Email del viajero
   * @returns Observable de array de ReservationResponse
   */
  getTravelHistoryByTravelerEmail(email: string): Observable<ReservationResponse[]> {
    return this.getReservationsByTravelerEmail(email).pipe(
      map((reservations: ReservationResponse[]) => {
      
        const filtered = reservations.filter(reservation => 
          reservation.reservationStatusId === 7 || reservation.reservationStatusId === 8
        );
        
        return filtered;
      })
    );
  }

  /**
   * Obtiene presupuestos recientes donde un email aparece como viajero
   * @param email - Email del viajero
   * @returns Observable de array de ReservationResponse
   */
  getRecentBudgetsByTravelerEmail(email: string): Observable<ReservationResponse[]> {
    return this.getReservationsByTravelerEmail(email).pipe(
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 3
        )
      )
    );
  }

  /**
   * Carga los estados y métodos de pago una sola vez
   * Usa PaymentService que tiene caché compartido para evitar múltiples llamadas
   * Retorna un Observable para poder esperar a que termine la carga
   */
  private loadPaymentStatusAndMethods(): Observable<void> {
    if (this.statusAndMethodsLoaded) {
      return of(void 0);
    }

    return forkJoin({
      statuses: this.paymentService.getAllPaymentStatuses().pipe(
        catchError(() => of([]))
      ),
      methods: this.paymentService.getAllPaymentMethods().pipe(
        catchError(() => of([]))
      )
    }).pipe(
      map(({ statuses, methods }) => {
        statuses.forEach((status: IPaymentStatusResponse) => {
          this.paymentStatusMap[status.id] = status.name;
        });
        methods.forEach((method: IPaymentMethodResponse) => {
          this.paymentMethodMap[method.id] = method.name;
        });
        this.statusAndMethodsLoaded = true;
      })
    );
  }

  /**
   * Obtiene los pagos de una reserva desde la API
   */
  getPaymentsByReservationId(reservationId: number, bookingID: string): Observable<Payment[]> {
    if (!reservationId || reservationId <= 0) {
      return of([]);
    }

    // Cargar estados y métodos de forma lazy solo cuando realmente se necesiten
    // Esperar a que termine la carga antes de obtener los pagos
    const loadStatusAndMethods$ = this.statusAndMethodsLoaded 
      ? of(void 0)
      : this.loadPaymentStatusAndMethods();

    return loadStatusAndMethods$.pipe(
      switchMap(() => this.paymentsNetService.getAll({ reservationId })),
      map((payments: IPaymentResponse[]) => this.mapPaymentsToPaymentModel(payments, bookingID)),
      catchError((error) => {
        console.error('Error cargando pagos:', error);
        return of([]);
      })
    );
  }

  /**
   * Mapea los pagos de la API al modelo Payment del componente
   */
  private mapPaymentsToPaymentModel(payments: IPaymentResponse[], bookingID: string): Payment[] {
    const mappedPayments = payments.map((payment) => {
      const mappedPayment: Payment = {
        bookingID: bookingID,
        amount: payment.amount,
        publicID: payment.transactionReference || payment.id.toString(),
        externalID: payment.transactionReference,
        status: this.mapPaymentStatus(payment.paymentStatusId),
        method: this.paymentMethodMap[payment.paymentMethodId] || 'Desconocido',
        paymentMethodId: payment.paymentMethodId,
        paymentStatusId: payment.paymentStatusId, // NUEVO: Incluir el ID del estado
        notes: payment.notes,
        createdAt: new Date(payment.paymentDate).toISOString(),
        updatedAt: new Date(payment.paymentDate).toISOString(),
        id: payment.id, // NUEVO: Incluir el ID numérico para navegación
      };

      // Agregar vouchers si hay archivo adjunto
      // attachmentUrl puede contener múltiples URLs separadas por comas
      // Formato: "url|filename" o solo "url" (para compatibilidad con datos antiguos)
      if (payment.attachmentUrl) {
        const voucherEntries = payment.attachmentUrl.split(',').map(entry => entry.trim()).filter(entry => entry.length > 0);
        mappedPayment.vouchers = voucherEntries.map((entry, index) => {
          // Extraer URL y nombre del archivo del formato "url|filename"
          const parts = entry.split('|');
          const fileUrl = parts[0].trim();
          const fileName = parts.length > 1 ? parts[1].trim() : this.extractFileNameFromUrl(fileUrl);
          
          const voucher: IPaymentVoucher = {
            fileUrl: fileUrl,
            fileName: fileName,
            metadata: {},
            uploadDate: new Date(payment.paymentDate),
            reviewStatus: VoucherReviewStatus.PENDING,
            id: `${payment.id}-${index}`
          };
          return voucher;
        });
      }

      return mappedPayment;
    });

    // Ordenar por fecha (más recientes primero)
    return mappedPayments.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  /**
   * Extrae el nombre del archivo desde una URL de Cloudinary
   * @param url - URL del archivo en Cloudinary
   * @returns Nombre del archivo o "Justificante" si no se puede extraer
   */
  private extractFileNameFromUrl(url: string): string {
    if (!url) return 'Justificante';
    
    try {
      // Intentar extraer el nombre del archivo de la URL de Cloudinary
      // Formato típico: https://res.cloudinary.com/.../v1234567890/folder/filename.ext
      const urlParts = url.split('/');
      if (urlParts.length > 0) {
        const lastPart = urlParts[urlParts.length - 1];
        // Remover parámetros de query si existen
        const fileName = lastPart.split('?')[0];
        // Si tiene extensión, devolverlo, sino usar "Justificante"
        if (fileName && fileName.includes('.')) {
          return decodeURIComponent(fileName);
        }
      }
    } catch (error) {
      console.warn('Error extrayendo nombre de archivo de URL:', error);
    }
    
    return 'Justificante';
  }

  /**
   * Mapea el ID de estado de pago a PaymentStatus enum
   */
  private mapPaymentStatus(paymentStatusId: number): PaymentStatus {
    const statusName = this.paymentStatusMap[paymentStatusId];
    if (!statusName) return PaymentStatus.PENDING;

    // Mapear nombres de estado a PaymentStatus enum
    const statusMapping: { [key: string]: PaymentStatus } = {
      'Completado': PaymentStatus.COMPLETED,
      'Pendiente': PaymentStatus.PENDING,
      'Pendiente de revisión': PaymentStatus.PENDING_REVIEW,
      'Rechazado': PaymentStatus.CANCELLED,
      'Cancelado': PaymentStatus.CANCELLED,
      'Fallido': PaymentStatus.FAILED,
    };

    return statusMapping[statusName] || PaymentStatus.PENDING;
  }

  /**
   * Calcula la información de pagos (total, pendiente, pagado)
   * Delegado al PaymentService
   */
  calculatePaymentInfo(payments: Payment[], bookingTotal: number): PaymentInfo {
    return this.paymentService.calculatePaymentInfo(payments, bookingTotal);
  }

  /**
   * Obtiene el texto del estado de un pago (FALLBACK hardcodeado para compatibilidad)
   * NOTA: Para obtener el estado desde la API, usar PaymentService.getPaymentStatusName()
   */
  getPaymentStatusText(status: PaymentStatus | string): string {
    const paymentStatus = typeof status === 'string' ? status as PaymentStatus : status;
    
    // Mapeo hardcodeado solo como fallback para componentes legacy
    switch (paymentStatus) {
      case PaymentStatus.COMPLETED:
        return 'Completado';
      case PaymentStatus.PENDING:
        return 'Pendiente';
      case PaymentStatus.PENDING_REVIEW:
        return 'Pendiente de revisión';
      case PaymentStatus.CANCELLED:
        return 'Cancelado';
      case PaymentStatus.FAILED:
        return 'Fallido';
      default:
        return String(status);
    }
  }
}