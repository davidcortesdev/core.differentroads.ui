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
  DocumentType,
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
        
        if (!jobId) {
          this.isProcessingEnqueueSync = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se recibió un jobId válido de la sincronización.',
            life: 4000,
          });
          return;
        }

        // Mostrar notificación informativa de que se está procesando
        this.messageService.add({
          severity: 'info',
          summary: 'Procesando',
          detail: 'La sincronización se está procesando...',
          life: 3000,
        });

        // Hacer polling cada 5 segundos hasta que el estado sea "Succeeded"
        // timer(0, 5000) hace la primera llamada inmediatamente y luego cada 5 segundos
        timer(0, 5000)
          .pipe(
            switchMap(() => this.reservationsSyncsService.getSyncJobStatus(jobId)),
            takeWhile((statusResponse: SyncJobStatusResponse) => {
              const state = statusResponse.state?.toLowerCase();
              return state !== 'succeeded' && state !== 'failed' && state !== 'deleted';
            }, true), // Incluir el último valor que rompió la condición
            takeUntil(this.enqueueSyncDestroy$),
            catchError((error) => {
              this.isProcessingEnqueueSync = false;
              const errorMessage =
                error?.error?.message ||
                'Error al verificar el estado de la sincronización.';
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage,
                life: 4000,
              });
              return of(null);
            }),
            finalize(() => {
              // Este bloque se ejecuta cuando el polling termina
            })
          )
          .subscribe({
            next: (statusResponse: SyncJobStatusResponse | null) => {
              if (!statusResponse) {
                return;
              }

              const state = statusResponse.state?.toLowerCase();

              if (state === 'succeeded') {
                this.isProcessingEnqueueSync = false;
                this.messageService.add({
                  severity: 'success',
                  summary: 'Sincronización completada',
                  detail: 'La sincronización con TourKnife se ha completado correctamente.',
                  life: 3000,
                });
              } else if (state === 'failed' || state === 'deleted') {
                this.isProcessingEnqueueSync = false;
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error en la sincronización',
                  detail: 'La sincronización con TourKnife ha fallado.',
                  life: 4000,
                });
              }
              // Si el estado es 'enqueued', 'processing', etc., continuamos el polling
            },
            error: (error) => {
              this.isProcessingEnqueueSync = false;
              const errorMessage =
                error?.error?.message ||
                'Error al verificar el estado de la sincronización.';
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage,
                life: 4000,
              });
            },
          });
      },
      error: (error) => {
        this.isProcessingEnqueueSync = false;
        const errorMessage =
          error?.error?.message ||
          'Error al encolar la sincronización. Inténtalo más tarde.';
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
      if (action.id === 'PROFORMA' && this.currentReservation?.retailerId === 8) {
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
