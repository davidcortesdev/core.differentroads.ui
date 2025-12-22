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
import { InvoiceProcessService } from '../../../core/services/v2/invoice-process.service';

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

  showEmailModal: boolean = false;
  userEmail: string = '';
  currentAction: DocumentActionConfig | null = null;
  isLoadingEmail: boolean = false;
  isProcessing: boolean = false;

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
      test: 'Generar proforma',
      icon: 'pi pi-file-pdf',
      emailCode: 'PROFORMA',
      documentCode: 'PROFORMA',
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
    {
      id: 'GENERAR_FACTURA',
      test: 'Generar factura',
      icon: 'pi pi-file',
      visible: true,
      documentCode: 'INVOICE',
    },
  ];

  constructor(
    private messageService: MessageService,
    private reservationService: ReservationService,
    private usersNetService: UsersNetService,
    private notificationServicev2: NotificationServicev2,
    private documentServicev2: DocumentServicev2,
    private reservationStatusService: ReservationStatusService,
    private reservationsSyncsService: ReservationsSyncsService,
    private invoiceProcessService: InvoiceProcessService
  ) {}

  ngOnInit(): void {
    this.loadUserEmail();
  }

  ngOnDestroy(): void {
    this.enqueueSyncDestroy$.next();
    this.enqueueSyncDestroy$.complete();
  }

  loadUserEmail(): void {
    if (!this.bookingId) {
      return;
    }

    const reservationId = parseInt(this.bookingId, 10);
    if (isNaN(reservationId)) {
      return;
    }

    this.isLoadingEmail = true;

    this.reservationService
      .getById(reservationId)
      .pipe(
        switchMap((reservation: IReservationResponse) => {
          this.currentReservation = reservation;
          if (!reservation || !reservation.userId) {
            return of('');
          }

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

  private currentReservation: IReservationResponse | null = null;
  private prebookedStatusId: number | null = null;
  isProcessingSyncFromTk: boolean = false;
  isProcessingEnqueueSync: boolean = false;
  private enqueueSyncDestroy$ = new Subject<void>();
  private previousRetryCount: number = 0;
  private jobNotFoundRetryCount: number = 0;
  private readonly MAX_JOB_NOT_FOUND_RETRIES = 2; 
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

  get canEnqueueSync(): boolean {
    if (!this.currentReservation || this.prebookedStatusId == null) {
      return false;
    }
    const isPrebooked = this.currentReservation.reservationStatusId === this.prebookedStatusId;
    const hasNoTkId = !this.currentReservation.tkId;
    return isPrebooked && hasNoTkId && !this.isProcessingEnqueueSync;
  }

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
          return;
        }
        this.previousRetryCount = 0;
        this.jobNotFoundRetryCount = 0;
        this.messageService.add({
          severity: 'info',
          summary: 'Procesando',
          detail: 'Sincronizando con TourKnife. Esto puede tardar unos momentos...',
          life: 5000,
        });
        this.startJobPolling(jobId, reservationId);
      },
      error: (error) => {
        this.isProcessingEnqueueSync = false;
        this.previousRetryCount = 0;
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

  private handleJobNotFoundError(
    reservationId: number,
    jobId: string,
    pollingAttempt: number
  ): void {
    if (pollingAttempt === 1) {
      this.reservationService.getById(reservationId).subscribe({
        next: (reservation) => {
          if (reservation.tkId) {
            this.isProcessingEnqueueSync = false;
            this.jobNotFoundRetryCount = 0;
            this.messageService.add({
              severity: 'success',
              summary: 'Sincronización completada',
              detail: 'La reserva se sincronizó correctamente con TourKnife. El proceso fue muy rápido.',
              life: 5000,
            });
            this.loadUserEmail();
            return;
          }
          if (this.jobNotFoundRetryCount < this.MAX_JOB_NOT_FOUND_RETRIES) {
            this.retryEnqueueSync(reservationId);
          } else {
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

  private retryEnqueueSync(reservationId: number): void {
    this.jobNotFoundRetryCount++;
    this.messageService.add({
      severity: 'info',
      summary: 'Reintentando automáticamente',
      detail: `Reintentando envío a TourKnife (intento ${this.jobNotFoundRetryCount}/${this.MAX_JOB_NOT_FOUND_RETRIES})...`,
      life: 4000,
    });
    
    timer(3000).pipe(
      switchMap(() => this.reservationsSyncsService.enqueueByReservationId(reservationId)),
      takeUntil(this.enqueueSyncDestroy$)
    ).subscribe({
      next: (response: EnqueueSyncResponse) => {
        const newJobId = response.jobId;
        if (!newJobId || newJobId.trim() === '') {
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
            this.retryEnqueueSync(reservationId);
          }
          return;
        }
        
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
          this.retryEnqueueSync(reservationId);
        }
      }
    });
  }

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
              if (error.status === 404) {
                throw { 
                  type: 'JOB_NOT_FOUND',
                  jobId,
                  reservationId,
                  message: error?.error?.message || 'Job no encontrado',
                  pollingAttempt: pollingAttempts
                };
              }
              if (error.status === 500) {
                throw { 
                  type: 'SERVER_ERROR',
                  jobId,
                  reservationId,
                  message: error?.error?.message || 'Error interno del servidor'
                };
              }
              if (error.status === 0 || error.name === 'TimeoutError') {
                throw { 
                  type: 'CONNECTION_ERROR',
                  jobId,
                  reservationId,
                  message: 'Error de conexión con el servidor'
                };
              }
              
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
          if (state === 'succeeded' || state === 'failed' || state === 'deleted') {
            return false;
          }          
          if (pollingAttempts >= maxPollingAttempts) {
            return false;
          }          
          if (retryCount >= 3 && state !== 'succeeded') {
            return false;
          }
          return true;
        }, true),
        takeUntil(this.enqueueSyncDestroy$),
        catchError((error) => {
          if (error.type === 'JOB_NOT_FOUND') {
            this.handleJobNotFoundError(reservationId, error.jobId, error.pollingAttempt || 1);
            return of(null);
          }
          
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
    if (error.type === 'JOB_NOT_FOUND' || error.status === 404) {
      return {
        summary: 'Proceso no encontrado',
        detail: `No se pudo encontrar el proceso de sincronización. Intenta enviar la reserva nuevamente. ID: ${reservationId}`,
        life: 7000,
      };
    }

    if (error.type === 'SERVER_ERROR' || error.status === 500) {
      return {
        summary: 'Error en el servidor',
        detail: 'Error interno del servidor. Intenta nuevamente en unos momentos.',
        life: 6000,
      };
    }

    if (error.type === 'CONNECTION_ERROR' || error.status === 0 || error.name === 'TimeoutError') {
      return {
        summary: 'Error de conexión',
        detail: 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.',
        life: 6000,
      };
    }

    return {
      summary: 'Error al verificar sincronización',
      detail: error.message || 'Error al verificar el estado. Intenta nuevamente.',
      life: 6000,
    };
  }

  private getEnqueueSyncInitialErrorMessage(
    error: any,
    reservationId: number
  ): { summary: string; detail: string; life: number } {
    if (error.status === 404) {
      return {
        summary: 'Reserva no encontrada',
        detail: `No se encontró la reserva ${reservationId}. Verifica que exista y esté en estado PREBOOK.`,
        life: 6000,
      };
    }

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

    if (error.status === 500) {
      return {
        summary: 'Error en el servidor',
        detail: 'Error interno del servidor. Intenta nuevamente en unos momentos.',
        life: 6000,
      };
    }

    if (error.status === 0 || error.name === 'TimeoutError') {
      return {
        summary: 'Error de conexión',
        detail: 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.',
        life: 6000,
      };
    }

    const errorMessage = error?.error?.message || 'Error al iniciar la sincronización';
    return {
      summary: 'Error al enviar a TourKnife',
      detail: `${errorMessage}. Intenta nuevamente. ID: ${reservationId}`,
      life: 6000,
    };
  }

  private getRetryCount(statusResponse: SyncJobStatusResponse): number {
    const retryCountStr = statusResponse.properties?.RetryCount;
    if (!retryCountStr) {
      return 0;
    }
    const retryCount = parseInt(retryCountStr, 10);
    return isNaN(retryCount) ? 0 : retryCount;
  }

  get canSyncFromTk(): boolean {
    if (!this.currentReservation) {
      return false;
    }
    const hasTkId = !!this.currentReservation.tkId;
    return hasTkId && !this.isProcessingSyncFromTk;
  }

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

  openEmailModal(action: DocumentActionConfig): void {
    this.currentAction = action;
    this.showEmailModal = true;
  }

  closeEmailModal(): void {
    this.showEmailModal = false;
    this.currentAction = null;
  }

  getModalTitle(): string {
    return this.currentAction?.test || '';
  }

  hasEmailCode(): boolean {
    // El botón de factura también necesita el botón de enviar aunque no tenga emailCode
    if (this.currentAction?.id === 'GENERAR_FACTURA') {
      return true;
    }
    return !!this.currentAction?.emailCode;
  }

  hasDocumentCode(): boolean {
    return !!this.currentAction?.documentCode;
  }

  getVisibleActions(): DocumentActionConfig[] {
    return this.documentList.filter((action) => {
      if (!action.visible) return false;
      
      if (action.id === 'PROFORMA' && this.currentReservation?.retailerId === 7) {
        return false;
      }
      
      return true;
    });
  }

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

    // Si es GENERAR_FACTURA, usar las APIs de InvoiceProcess
    if (this.currentAction.id === 'GENERAR_FACTURA') {
      this.handleGenerateInvoice();
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

    // Si es GENERAR_FACTURA, usar las APIs de InvoiceProcess
    if (this.currentAction.id === 'GENERAR_FACTURA') {
      this.handleDownloadInvoice(reservationId);
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
   * Maneja la descarga de factura usando las APIs de InvoiceProcess
   */
  private handleDownloadInvoice(reservationId: number): void {
    this.isProcessing = true;

    this.invoiceProcessService.downloadDocumentByReservation(reservationId).subscribe({
      next: (result) => {
        this.handleDownloadSuccess(
          result.blob,
          result.fileName,
          'Factura descargada exitosamente'
        );
      },
      error: (error) => {
        this.isProcessing = false;
        let errorMessage = 'Error al descargar la factura';
        if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Inténtalo más tarde.';
        } else if (error.status === 404) {
          errorMessage = 'Factura no encontrada. Primero debe generar la factura.';
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Datos inválidos para descargar la factura.';
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 3000,
        });
      },
    });
  }

  private getDocumentSuccessMessage(documentCode: string): string {
    const messageMap: Record<string, string> = {
      RESERVATION_VOUCHER: 'Voucher de reserva descargado exitosamente',
      ETICKETS: 'E-tickets descargados exitosamente',
      COMBINED_CONTRACT: 'Contrato combinado descargado exitosamente',
      PAYMENT_REMINDER: 'Recordatorio de pago descargado exitosamente',
    };
    return messageMap[documentCode] || 'Documento descargado exitosamente';
  }

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

  private handleDownloadError(error: any): void {
    this.isProcessing = false;
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

  private handleSendError(error: any): void {
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

  onActionClick(action: DocumentActionConfig): void {
    // Para todas las acciones, abrir el modal de email
    // Las acciones especiales se manejarán en onSend()
    this.openEmailModal(action);
  }

  /**
   * Maneja la generación de factura usando las APIs de InvoiceProcess
   * Flujo: 1. Generar documento (si es necesario), 2. Encolar proceso completo con /api/InvoiceProcess/full-process/enqueue
   */
  private handleGenerateInvoice(): void {
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
    
    this.isProcessing = true;

    // Intentar primero con reservationId directamente (como NotificationService)
    // Si el endpoint espera invoiceId, intentaremos obtenerlo después
    this.invoiceProcessService.enqueueFullProcessByReservation(reservationId, this.userEmail).pipe(
      catchError((error) => {
        // Si falla con reservationId, intentar obtener invoiceId primero
        if (error.status === 400 || error.status === 404) {
          return this.invoiceProcessService.getInvoiceByReservation(reservationId).pipe(
            switchMap((invoiceId) => {
              // Primero generar el documento si es necesario
              return this.invoiceProcessService.generateDocument(invoiceId).pipe(
                switchMap((generateResponse) => {
                  if (!generateResponse.success) {
                    throw new Error(generateResponse.message || 'Error al generar el documento');
                  }
                  
                  // Luego encolar el proceso completo con invoiceId
                  return this.invoiceProcessService.enqueueFullProcess(invoiceId, this.userEmail);
                })
              );
            }),
            catchError((innerError) => {
              if (innerError.status === 404) {
                throw new Error('No se encontró una factura asociada a esta reserva. Debe crear la factura primero.');
              }
              throw innerError;
            })
          );
        }
        throw error;
      })
    ).subscribe({
      next: (response) => {
        this.isProcessing = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Factura enviada a ${this.userEmail}`,
          life: 3000,
        });
        this.closeEmailModal();
      },
      error: (error) => {
        this.isProcessing = false;
        let errorMessage = 'Error al enviar la factura';
        if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Inténtalo más tarde.';
        } else if (error.status === 404) {
          errorMessage = 'Factura no encontrada. Debe crear la factura primero.';
        } else if (error.status === 400) {
          errorMessage = 'Datos inválidos para enviar la factura.';
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 3000,
        });
      },
    });
  }

}
