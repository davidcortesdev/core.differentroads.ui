import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ReservationService } from '../../../core/services/reservation/reservation.service';
import { IReservationResponse } from '../../../core/services/reservation/reservation.service';
import { UsersNetService } from '../../../core/services/users/usersNet.service';
import {
  NotificationServicev2,
  NotificationRequest,
} from '../../../core/services/v2/notification.service';
import {
  DocumentServicev2,
  DocumentDownloadResult,
} from '../../../core/services/v2/document.service';
import { of, timer, Subject } from 'rxjs';
import { switchMap, catchError, takeUntil, finalize, takeWhile } from 'rxjs/operators';
import {
  IReservationStatusResponse,
  ReservationStatusService,
} from '../../../core/services/reservation/reservation-status.service';
import { ReservationsSyncsService, EnqueueSyncResponse, SyncJobStatusResponse } from '../../../core/services/reservation/reservations-syncs.service';

interface DocumentActionConfig {
  id: string;
  test: string;
  icon: string;
  emailCode?: string;
  documentCode?: string;
  visible: boolean;
}

@Component({
  selector: 'app-booking-document-actions-v2',
  templateUrl: './booking-document-actions.component.html',
  styleUrls: ['./booking-document-actions.component.scss'],
  standalone: false,
})
export class BookingDocumentActionsV2Component implements OnInit, OnDestroy {
  @Input() isVisible: boolean = true;
  @Input() bookingId: string = '';

  // Modal properties
  showEmailModal: boolean = false;
  userEmail: string = '';
  currentAction: DocumentActionConfig | null = null;
  isLoadingEmail: boolean = false;
  isProcessing: boolean = false;

  // Lista de acciones de documentos
  documentList: DocumentActionConfig[] = [
    {
      id: 'PAYMENT_REMINDER',
      test: 'Enviar recordatorio de pago',
      icon: 'pi pi-calendar',
      emailCode: 'PAYMENT_REMINDER',
      visible: true,
    },
    {
      id: 'RESERVATION_VOUCHER',
      test: 'Enviar bono reserva',
      icon: 'pi pi-ticket',
      emailCode: 'RESERVATION_VOUCHER',
      documentCode: 'RESERVATION_VOUCHER',
      visible: true,
    },
    {
      id: 'PROFORMA',
      test: 'Enviar proforma',
      icon: 'pi pi-file-pdf',
      emailCode: 'PROFORMA',
      visible: true,
    },
    {
      id: 'PRACTICAL_INFO',
      test: 'Enviar información práctica',
      icon: 'pi pi-print',
      emailCode: 'PRACTICAL_INFO',
      documentCode: 'PRACTICAL_INFO',
      visible: true,
    },
    {
      id: 'COMBINED_CONTRACT',
      test: 'Enviar contrato combinado',
      icon: 'pi pi-file',
      emailCode: 'COMBINED_CONTRACT',
      documentCode: 'COMBINED_CONTRACT',
      visible: false,
    },

    {
      id: 'ETICKETS',
      test: 'Enviar e-tickets',
      icon: 'pi pi-ticket',
      documentCode: 'ETICKETS',
      emailCode: 'ETICKETS',
      visible: false,
    },
  ];

  constructor(
    private messageService: MessageService,
    private reservationService: ReservationService,
    private usersNetService: UsersNetService,
    private notificationServicev2: NotificationServicev2,
    private documentServicev2: DocumentServicev2,
    private reservationStatusService: ReservationStatusService,
    private reservationsSyncsService: ReservationsSyncsService
  ) {}

  ngOnInit(): void {
    this.loadUserEmail();
  }

  ngOnDestroy(): void {
    this.enqueueSyncDestroy$.next();
    this.enqueueSyncDestroy$.complete();
  }

  /**
   * Carga el email del usuario asociado a la reserva
   */
  loadUserEmail(): void {
    if (!this.bookingId) {
      return;
    }

    const reservationId = parseInt(this.bookingId, 10);
    if (isNaN(reservationId)) {
      return;
    }

    this.isLoadingEmail = true;

    // Obtener la reserva para obtener el userId y datos para el botón de sincronización
    this.reservationService
      .getById(reservationId)
      .pipe(
        switchMap((reservation: IReservationResponse) => {
          this.currentReservation = reservation;
          if (!reservation || !reservation.userId) {
            return of('');
          }

          // Obtener el usuario por su ID
          return this.usersNetService.getUserById(reservation.userId).pipe(
            switchMap((user) => {
              return of(user?.email || '');
            }),
            catchError(() => of(''))
          );
        }),
        catchError(() => of(''))
      )
      .subscribe({
        next: (email: string) => {
          this.userEmail = email;
          this.isLoadingEmail = false;
          this.loadPrebookedStatusId();
        },
        error: () => {
          this.isLoadingEmail = false;
        },
      });
  }

  // Estado de la reserva actual y soporte para botón de sincronización
  private currentReservation: IReservationResponse | null = null;
  private prebookedStatusId: number | null = null;
  isProcessingSyncFromTk: boolean = false;
  isProcessingEnqueueSync: boolean = false;
  private enqueueSyncDestroy$ = new Subject<void>();
  private previousRetryCount: number = 0;
  private jobNotFoundRetryCount: number = 0;
  private readonly MAX_JOB_NOT_FOUND_RETRIES = 2; // Máximo 2 reintentos automáticos

  /**
   * Carga el ID del estado PREBOOKED para comparaciones.
   */
  private loadPrebookedStatusId(): void {
    this.reservationStatusService.getByCode('PREBOOKED').subscribe({
      next: (statuses: IReservationStatusResponse[]) => {
        this.prebookedStatusId = statuses && statuses.length > 0 ? statuses[0].id : null;
      },
      error: () => {
        this.prebookedStatusId = null;
      },
    });
  }

  /**
   * Indica si se puede habilitar el botón de sincronización:
   * - Reserva en estado PREBOOKED
   * - Reserva sin tkId
   */
  get canEnqueueSync(): boolean {
    if (!this.currentReservation || this.prebookedStatusId == null) {
      return false;
    }
    const isPrebooked = this.currentReservation.reservationStatusId === this.prebookedStatusId;
    const hasNoTkId = !this.currentReservation.tkId;
    return isPrebooked && hasNoTkId && !this.isProcessingEnqueueSync;
  }

  /**
   * Obtiene el mensaje del tooltip para el botón de sincronización
   * según las condiciones que impiden su uso
   */
  getEnqueueSyncTooltip(): string {
    if (this.isProcessingEnqueueSync) {
      return 'El envío a TourKnife se está procesando...';
    }
    if (!this.currentReservation) {
      return 'Cargando información de la reserva...';
    }
    if (this.prebookedStatusId == null) {
      return 'Cargando estados de reserva...';
    }
    const isPrebooked = this.currentReservation.reservationStatusId === this.prebookedStatusId;
    const hasTkId = !!this.currentReservation.tkId;
    
    if (!isPrebooked) {
      return 'La reserva debe estar en estado PREBOOK para enviar a TourKnife';
    }
    if (hasTkId) {
      return 'Esta reserva ya tiene un tkId asignado';
    }
    return '';
  }

  /**
   * Ejecuta la llamada para encolar la sincronización con TK y luego hace polling del estado.
   */
  onEnqueueSync(): void {
    const reservationId = parseInt(this.bookingId, 10);
    if (isNaN(reservationId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de reserva inválido',
        life: 3000,
      });
      return;
    }
    
    if (!this.canEnqueueSync) {
      return;
    }

    this.isProcessingEnqueueSync = true;
    this.reservationsSyncsService.enqueueByReservationId(reservationId).subscribe({
      next: (response: EnqueueSyncResponse) => {
        const jobId = response.jobId;
        
        if (!jobId || jobId.trim() === '') {
          this.isProcessingEnqueueSync = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error al iniciar sincronización',
            detail: 'No se pudo crear el proceso de sincronización. Por favor, verifica que la reserva esté completa y vuelve a intentarlo. Si el problema persiste, contacta con soporte técnico.',
            life: 6000,
          });
          console.error('[EnqueueSync] JobId inválido o vacío:', { response, reservationId });
          return;
        }

        // Resetear los contadores de reintentos
        this.previousRetryCount = 0;
        this.jobNotFoundRetryCount = 0;

        // Mostrar notificación informativa de que se está procesando
        this.messageService.add({
          severity: 'info',
          summary: 'Procesando',
          detail: 'Sincronizando con TourKnife. Esto puede tardar unos momentos...',
          life: 5000,
        });

        // Iniciar el polling del job
        this.startJobPolling(jobId, reservationId);
      },
      error: (error) => {
        this.isProcessingEnqueueSync = false;
        this.previousRetryCount = 0;
        
        console.error('[EnqueueSync] Error al encolar sincronización:', { 
          reservationId, 
          error: error.error,
          status: error.status 
        });
        
        const errorInfo = this.getEnqueueSyncInitialErrorMessage(error, reservationId);
        
        this.messageService.add({
          severity: 'error',
          summary: errorInfo.summary,
          detail: errorInfo.detail,
          life: errorInfo.life,
        });
      },
    });
  }

  /**
   * Maneja el error de job no encontrado intentando soluciones automáticas
   */
  private handleJobNotFoundError(
    reservationId: number,
    jobId: string,
    pollingAttempt: number
  ): void {
    // Si es el primer intento de polling, verificar si la reserva ya tiene tkId
    if (pollingAttempt === 1) {
      this.reservationService.getById(reservationId).subscribe({
        next: (reservation) => {
          if (reservation.tkId) {
            // El proceso fue exitoso, solo fue muy rápido
            this.isProcessingEnqueueSync = false;
            this.jobNotFoundRetryCount = 0;
            this.messageService.add({
              severity: 'success',
              summary: 'Sincronización completada',
              detail: 'La reserva se sincronizó correctamente con TourKnife. El proceso fue muy rápido.',
              life: 5000,
            });
            // Recargar la reserva para actualizar el estado
            this.loadUserEmail();
            return;
          }
          
          // Si no tiene tkId y aún podemos reintentar, hacerlo automáticamente
          if (this.jobNotFoundRetryCount < this.MAX_JOB_NOT_FOUND_RETRIES) {
            this.retryEnqueueSync(reservationId);
          } else {
            // Ya se agotaron los reintentos automáticos
            this.isProcessingEnqueueSync = false;
            this.jobNotFoundRetryCount = 0;
            this.messageService.add({
              severity: 'error',
              summary: 'Error al enviar a TourKnife',
              detail: `No se pudo verificar el estado del envío después de ${this.MAX_JOB_NOT_FOUND_RETRIES} intentos. Intenta enviar la reserva nuevamente manualmente. ID: ${reservationId}`,
              life: 7000,
            });
          }
        },
        error: () => {
          // Si no se puede verificar la reserva, intentar reintentar si es posible
          if (this.jobNotFoundRetryCount < this.MAX_JOB_NOT_FOUND_RETRIES) {
            this.retryEnqueueSync(reservationId);
          } else {
            this.isProcessingEnqueueSync = false;
            this.jobNotFoundRetryCount = 0;
            this.messageService.add({
              severity: 'error',
              summary: 'Error al enviar a TourKnife',
              detail: `No se pudo verificar el estado del envío. Intenta enviar la reserva nuevamente. ID: ${reservationId}`,
              life: 7000,
            });
          }
        }
      });
    } else {
      // Si no es el primer intento, solo mostrar el error
      this.isProcessingEnqueueSync = false;
      this.jobNotFoundRetryCount = 0;
      this.messageService.add({
        severity: 'error',
        summary: 'Error al enviar a TourKnife',
        detail: `No se pudo encontrar el proceso de sincronización. Intenta enviar la reserva nuevamente. ID: ${reservationId}`,
        life: 7000,
      });
    }
  }

  /**
   * Reintenta encolar la sincronización automáticamente
   */
  private retryEnqueueSync(reservationId: number): void {
    this.jobNotFoundRetryCount++;
    console.log(`[EnqueueSync] Reintentando encolar job automáticamente (intento ${this.jobNotFoundRetryCount}/${this.MAX_JOB_NOT_FOUND_RETRIES})`);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Reintentando automáticamente',
      detail: `Reintentando envío a TourKnife (intento ${this.jobNotFoundRetryCount}/${this.MAX_JOB_NOT_FOUND_RETRIES})...`,
      life: 4000,
    });
    
    // Esperar 3 segundos antes de reintentar
    timer(3000).pipe(
      switchMap(() => this.reservationsSyncsService.enqueueByReservationId(reservationId)),
      takeUntil(this.enqueueSyncDestroy$)
    ).subscribe({
      next: (response: EnqueueSyncResponse) => {
        const newJobId = response.jobId;
        if (!newJobId || newJobId.trim() === '') {
          // Si el nuevo jobId también es inválido
          if (this.jobNotFoundRetryCount >= this.MAX_JOB_NOT_FOUND_RETRIES) {
            this.isProcessingEnqueueSync = false;
            this.jobNotFoundRetryCount = 0;
            this.messageService.add({
              severity: 'error',
              summary: 'Error al enviar a TourKnife',
              detail: 'No se pudo crear el proceso después de varios intentos. Intenta nuevamente manualmente.',
              life: 6000,
            });
          } else {
            // Reintentar nuevamente
            this.retryEnqueueSync(reservationId);
          }
          return;
        }
        
        // Reiniciar el proceso de polling con el nuevo jobId
        this.startJobPolling(newJobId, reservationId);
      },
      error: () => {
        if (this.jobNotFoundRetryCount >= this.MAX_JOB_NOT_FOUND_RETRIES) {
          this.isProcessingEnqueueSync = false;
          this.jobNotFoundRetryCount = 0;
          this.messageService.add({
            severity: 'error',
            summary: 'Error al enviar a TourKnife',
            detail: 'No se pudo iniciar el envío después de varios intentos. Intenta nuevamente manualmente.',
            life: 6000,
          });
        } else {
          // Reintentar nuevamente
          this.retryEnqueueSync(reservationId);
        }
      }
    });
  }

  /**
   * Inicia el polling del estado del job
   */
  private startJobPolling(jobId: string, reservationId: number): void {
    this.previousRetryCount = 0;
    let pollingAttempts = 0;
    const maxPollingAttempts = 60;

    timer(2000, 5000)
      .pipe(
        switchMap(() => {
          pollingAttempts++;
          return this.reservationsSyncsService.getSyncJobStatus(jobId).pipe(
            catchError((error) => {
              // Manejar específicamente el error 404 (job no encontrado)
              if (error.status === 404) {
                console.error('[EnqueueSync] Job no encontrado:', { 
                  jobId, 
                  reservationId,
                  error: error.error,
                  pollingAttempt: pollingAttempts 
                });
                throw { 
                  type: 'JOB_NOT_FOUND',
                  jobId,
                  reservationId,
                  message: error?.error?.message || 'Job no encontrado',
                  pollingAttempt: pollingAttempts
                };
              }
              
              // Otros errores HTTP
              if (error.status === 500) {
                console.error('[EnqueueSync] Error interno del servidor:', { 
                  jobId, 
                  reservationId,
                  error: error.error 
                });
                throw { 
                  type: 'SERVER_ERROR',
                  jobId,
                  reservationId,
                  message: error?.error?.message || 'Error interno del servidor'
                };
              }
              
              // Error de conexión o timeout
              if (error.status === 0 || error.name === 'TimeoutError') {
                console.error('[EnqueueSync] Error de conexión o timeout:', { 
                  jobId, 
                  reservationId,
                  error 
                });
                throw { 
                  type: 'CONNECTION_ERROR',
                  jobId,
                  reservationId,
                  message: 'Error de conexión con el servidor'
                };
              }
              
              // Error genérico
              throw { 
                type: 'UNKNOWN_ERROR',
                jobId,
                reservationId,
                message: error?.error?.message || 'Error al verificar el estado de la sincronización'
              };
            })
          );
        }),
        takeWhile((statusResponse: SyncJobStatusResponse) => {
          const state = statusResponse.state?.toLowerCase();
          const retryCount = this.getRetryCount(statusResponse);
          
          // Detener si el estado es final
          if (state === 'succeeded' || state === 'failed' || state === 'deleted') {
            return false;
          }
          
          // Detener si llegamos al máximo de intentos de polling
          if (pollingAttempts >= maxPollingAttempts) {
            return false;
          }
          
          // Si llegamos a 3 intentos y no es succeeded, detener el polling
          if (retryCount >= 3 && state !== 'succeeded') {
            return false;
          }
          
          return true;
        }, true),
        takeUntil(this.enqueueSyncDestroy$),
        catchError((error) => {
          // Si es error de job no encontrado, usar el manejo especial
          if (error.type === 'JOB_NOT_FOUND') {
            this.handleJobNotFoundError(reservationId, error.jobId, error.pollingAttempt || 1);
            return of(null);
          }
          
          // Manejo normal de otros errores
          this.isProcessingEnqueueSync = false;
          this.previousRetryCount = 0;
          this.jobNotFoundRetryCount = 0;
          
          const errorInfo = this.getEnqueueSyncErrorMessage(error, jobId, reservationId);
          
          this.messageService.add({
            severity: 'error',
            summary: errorInfo.summary,
            detail: errorInfo.detail,
            life: errorInfo.life,
          });
          
          return of(null);
        }),
        finalize(() => {
          this.previousRetryCount = 0;
        })
      )
      .subscribe({
        next: (statusResponse: SyncJobStatusResponse | null) => {
          if (!statusResponse) {
            return;
          }

          const state = statusResponse.state?.toLowerCase();
          const retryCount = this.getRetryCount(statusResponse);

          // Detectar cambios en el retryCount
          if (retryCount > this.previousRetryCount) {
            if (retryCount === 2) {
              this.messageService.add({
                severity: 'warn',
                summary: 'Reintentando',
                detail: 'Error detectado. Reintentando sincronización...',
                life: 5000,
              });
            } else if (retryCount === 3) {
              this.messageService.add({
                severity: 'warn',
                summary: 'Reintentando',
                detail: 'Último intento de sincronización...',
                life: 5000,
              });
            }
            this.previousRetryCount = retryCount;
          }

          // Si llegamos a 3 intentos y el estado no es "Succeeded", mostrar error
          if (retryCount >= 3 && state !== 'succeeded') {
            this.isProcessingEnqueueSync = false;
            this.previousRetryCount = 0;
            this.messageService.add({
              severity: 'error',
              summary: 'Error de sincronización',
              detail: 'La sincronización falló después de 3 intentos. Verifica que la reserva tenga todos los datos completos e intenta nuevamente.',
              life: 7000,
            });
            return;
          }

          // Si llegamos al máximo de intentos de polling sin éxito
          if (pollingAttempts >= maxPollingAttempts && state !== 'succeeded') {
            this.isProcessingEnqueueSync = false;
            this.previousRetryCount = 0;
            this.messageService.add({
              severity: 'warn',
              summary: 'Tiempo de espera agotado',
              detail: 'La sincronización está tomando más tiempo del esperado. El proceso continúa en segundo plano. Verifica el estado en unos minutos.',
              life: 6000,
            });
            return;
          }

          if (state === 'succeeded') {
            this.isProcessingEnqueueSync = false;
            this.previousRetryCount = 0;
            this.jobNotFoundRetryCount = 0;
            this.messageService.add({
              severity: 'success',
              summary: 'Sincronización completada',
              detail: 'La reserva se ha sincronizado correctamente con TourKnife.',
              life: 5000,
            });
          } else if (state === 'failed' || state === 'deleted') {
            this.isProcessingEnqueueSync = false;
            this.previousRetryCount = 0;
            this.jobNotFoundRetryCount = 0;
            this.messageService.add({
              severity: 'error',
              summary: 'Error en la sincronización',
              detail: 'La sincronización con TourKnife ha fallado. Verifica que todos los datos estén completos e intenta nuevamente.',
              life: 6000,
            });
          }
        },
        error: (error) => {
          this.isProcessingEnqueueSync = false;
          this.previousRetryCount = 0;
          this.jobNotFoundRetryCount = 0;
          
          const errorInfo = this.getEnqueueSyncErrorMessage(error, jobId, reservationId);
          
          this.messageService.add({
            severity: 'error',
            summary: errorInfo.summary,
            detail: errorInfo.detail,
            life: errorInfo.life,
          });
        },
      });
  }

  /**
   * Obtiene un mensaje de error específico y claro para atención al cliente
   * cuando ocurre un error durante el polling del estado del job
   */
  private getEnqueueSyncErrorMessage(
    error: any,
    jobId: string,
    reservationId: number
  ): { summary: string; detail: string; life: number } {
    // Error específico: Job no encontrado (404) - Este caso ya se maneja en handleJobNotFoundError
    if (error.type === 'JOB_NOT_FOUND' || error.status === 404) {
      return {
        summary: 'Proceso no encontrado',
        detail: `No se pudo encontrar el proceso de sincronización. Intenta enviar la reserva nuevamente. ID: ${reservationId}`,
        life: 7000,
      };
    }

    // Error de servidor (500)
    if (error.type === 'SERVER_ERROR' || error.status === 500) {
      return {
        summary: 'Error en el servidor',
        detail: 'Error interno del servidor. Intenta nuevamente en unos momentos.',
        life: 6000,
      };
    }

    // Error de conexión o timeout
    if (error.type === 'CONNECTION_ERROR' || error.status === 0 || error.name === 'TimeoutError') {
      return {
        summary: 'Error de conexión',
        detail: 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.',
        life: 6000,
      };
    }

    // Error genérico
    return {
      summary: 'Error al verificar sincronización',
      detail: error.message || 'Error al verificar el estado. Intenta nuevamente.',
      life: 6000,
    };
  }

  /**
   * Obtiene un mensaje de error específico y claro para atención al cliente
   * cuando ocurre un error al intentar encolar la sincronización inicial
   */
  private getEnqueueSyncInitialErrorMessage(
    error: any,
    reservationId: number
  ): { summary: string; detail: string; life: number } {
    // Error 404: Reserva no encontrada
    if (error.status === 404) {
      return {
        summary: 'Reserva no encontrada',
        detail: `No se encontró la reserva ${reservationId}. Verifica que exista y esté en estado PREBOOK.`,
        life: 6000,
      };
    }

    // Error 400: Datos inválidos
    if (error.status === 400) {
      const errorMessage = error?.error?.message || '';
      if (errorMessage.toLowerCase().includes('tour') && errorMessage.toLowerCase().includes('not bookable')) {
        return {
          summary: 'Tour no disponible',
          detail: 'El tour no está disponible para reservar en TourKnife. Verifica que esté activo.',
          life: 6000,
        };
      }
      return {
        summary: 'Datos inválidos',
        detail: errorMessage || 'La reserva no cumple los requisitos. Verifica que todos los datos estén completos.',
        life: 6000,
      };
    }

    // Error 500: Error interno del servidor
    if (error.status === 500) {
      return {
        summary: 'Error en el servidor',
        detail: 'Error interno del servidor. Intenta nuevamente en unos momentos.',
        life: 6000,
      };
    }

    // Error de conexión
    if (error.status === 0 || error.name === 'TimeoutError') {
      return {
        summary: 'Error de conexión',
        detail: 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.',
        life: 6000,
      };
    }

    // Error genérico
    const errorMessage = error?.error?.message || 'Error al iniciar la sincronización';
    return {
      summary: 'Error al enviar a TourKnife',
      detail: `${errorMessage}. Intenta nuevamente. ID: ${reservationId}`,
      life: 6000,
    };
  }

  /**
   * Obtiene el retryCount de la respuesta del job status.
   * El retryCount viene como string en properties.RetryCount
   */
  private getRetryCount(statusResponse: SyncJobStatusResponse): number {
    const retryCountStr = statusResponse.properties?.RetryCount;
    if (!retryCountStr) {
      return 0;
    }
    const retryCount = parseInt(retryCountStr, 10);
    return isNaN(retryCount) ? 0 : retryCount;
  }

  /**
   * Indica si se puede habilitar el botón de traer información desde TK:
   * - Reserva con tkId
   */
  get canSyncFromTk(): boolean {
    if (!this.currentReservation) {
      return false;
    }
    const hasTkId = !!this.currentReservation.tkId;
    return hasTkId && !this.isProcessingSyncFromTk;
  }

  /**
   * Obtiene el mensaje del tooltip para el botón de traer información desde TK
   * según las condiciones que impiden su uso
   */
  getSyncFromTkTooltip(): string {
    if (this.isProcessingSyncFromTk) {
      return 'La sincronización desde TourKnife se está procesando...';
    }
    if (!this.currentReservation) {
      return 'Cargando información de la reserva...';
    }
    const hasTkId = !!this.currentReservation.tkId;
    
    if (!hasTkId) {
      return 'La reserva debe tener un tkId para traer información desde TourKnife';
    }
    return '';
  }

  /**
   * Ejecuta la llamada para traer la información de la reserva desde TK.
   */
  onSyncFromTk(): void {
    if (!this.currentReservation || !this.currentReservation.tkId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La reserva no tiene tkId',
        life: 3000,
      });
      return;
    }
    if (!this.canSyncFromTk) {
      return;
    }

    this.isProcessingSyncFromTk = true;
    this.reservationsSyncsService.enqueueByTkId(this.currentReservation.tkId).subscribe({
      next: (success: boolean) => {
        this.isProcessingSyncFromTk = false;
        if (success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Sincronización encolada',
            detail: 'La sincronización desde TourKnife se ha encolado correctamente.',
            life: 3000,
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Aviso',
            detail: 'No se pudo encolar la sincronización desde TourKnife.',
            life: 3000,
          });
        }
      },
      error: (error) => {
        this.isProcessingSyncFromTk = false;
        const errorMessage =
          error?.error?.message ||
          'Error al encolar la sincronización desde TourKnife. Inténtalo más tarde.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 4000,
        });
      },
    });
  }

  /**
   * Abre el modal con el email para la acción especificada
   */
  openEmailModal(action: DocumentActionConfig): void {
    this.currentAction = action;
    this.showEmailModal = true;
  }

  /**
   * Cierra el modal
   */
  closeEmailModal(): void {
    this.showEmailModal = false;
    this.currentAction = null;
  }

  /**
   * Obtiene el título del modal según la acción
   */
  getModalTitle(): string {
    return this.currentAction?.test || '';
  }

  /**
   * Verifica si la acción actual tiene código de email
   */
  hasEmailCode(): boolean {
    return !!this.currentAction?.emailCode;
  }

  /**
   * Verifica si la acción actual tiene código de documento
   */
  hasDocumentCode(): boolean {
    return !!this.currentAction?.documentCode;
  }

  /**
   * Obtiene las acciones visibles
   */
  getVisibleActions(): DocumentActionConfig[] {
    return this.documentList.filter((action) => {
      if (!action.visible) return false;
      
      // Ocultar PROFORMA si el retailerId es 7
      if (action.id === 'PROFORMA' && this.currentReservation?.retailerId === 7) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Envía el documento por email
   */
  onSend(): void {
    if (!this.userEmail || !this.currentAction) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, ingrese un email válido',
        life: 3000,
      });
      return;
    }

    const reservationId = parseInt(this.bookingId, 10);
    if (isNaN(reservationId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de reserva inválido',
        life: 3000,
      });
      return;
    }

    if (!this.currentAction.emailCode) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Esta acción no tiene código de email configurado',
        life: 3000,
      });
      return;
    }

    this.isProcessing = true;

    const notificationData: NotificationRequest = {
      reservationId: reservationId,
      code: this.currentAction.emailCode,
      email: this.userEmail,
    };

    this.notificationServicev2.sendNotification(notificationData).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Documento enviado a ${this.userEmail}`,
            life: 3000,
          });
          this.closeEmailModal();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: response.message || 'Error al enviar el documento',
            life: 3000,
          });
        }
      },
      error: (error) => {
        this.isProcessing = false;
        this.handleSendError(error);
      },
    });
  }

  /**
   * Descarga el documento
   */
  onDownload(): void {
    if (!this.currentAction) {
      return;
    }

    const reservationId = parseInt(this.bookingId, 10);
    if (isNaN(reservationId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de reserva inválido',
        life: 3000,
      });
      return;
    }

    if (!this.currentAction.documentCode) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Esta acción no tiene código de documento configurado',
        life: 3000,
      });
      return;
    }

    this.isProcessing = true;
    const documentCode = this.currentAction.documentCode;

    this.documentServicev2
      .downloadDocumentByCode(reservationId, documentCode)
      .subscribe({
        next: (result: DocumentDownloadResult) => {
          const successMessage = this.getDocumentSuccessMessage(documentCode);
          this.handleDownloadSuccess(
            result.blob,
            result.fileName,
            successMessage
          );
        },
        error: (error) => this.handleDownloadError(error),
      });
  }

  /**
   * Obtiene el mensaje de éxito según el código del documento
   */
  private getDocumentSuccessMessage(documentCode: string): string {
    const messageMap: Record<string, string> = {
      RESERVATION_VOUCHER: 'Voucher de reserva descargado exitosamente',
      ETICKETS: 'E-tickets descargados exitosamente',
      COMBINED_CONTRACT: 'Contrato combinado descargado exitosamente',
      PAYMENT_REMINDER: 'Recordatorio de pago descargado exitosamente',
    };
    return messageMap[documentCode] || 'Documento descargado exitosamente';
  }

  /**
   * Maneja el éxito de la descarga
   */
  private handleDownloadSuccess(
    blob: Blob,
    fileName: string,
    message: string
  ): void {
    this.isProcessing = false;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: message,
      life: 3000,
    });
    this.closeEmailModal();
  }

  /**
   * Maneja errores de descarga
   */
  private handleDownloadError(error: any): void {
    this.isProcessing = false;
    console.error('Error downloading document:', error);

    let errorMessage = 'Error al descargar el documento';
    if (error.status === 500) {
      errorMessage = error.error?.message?.includes('KeyNotFoundException')
        ? 'Hay datos incompletos en esta reserva. Por favor, contacta con soporte.'
        : 'Error interno del servidor. Inténtalo más tarde.';
    } else if (error.status === 404) {
      errorMessage = 'Documento no encontrado.';
    } else if (error.status === 403) {
      errorMessage = 'No tienes permisos para descargar este documento.';
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Error al descargar documento',
      detail: errorMessage,
      life: 3000,
    });
  }

  /**
   * Maneja errores de envío
   */
  private handleSendError(error: any): void {
    console.error('Error sending notification:', error);
    let errorMessage = 'Error al enviar el documento';
    if (error.status === 500) {
      errorMessage = 'Error interno del servidor. Inténtalo más tarde.';
    } else if (error.status === 404) {
      errorMessage = 'Reserva no encontrada.';
    } else if (error.status === 403) {
      errorMessage = 'No tienes permisos para enviar este documento.';
    }
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 3000,
    });
  }

  /**
   * Maneja el click en un botón de acción
   */
  onActionClick(action: DocumentActionConfig): void {
    this.openEmailModal(action);
  }
}
