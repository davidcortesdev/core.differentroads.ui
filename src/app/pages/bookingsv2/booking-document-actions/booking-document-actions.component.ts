import { Component, Input, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ReservationService } from '../../../core/services/reservation/reservation.service';
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
import { of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

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
export class BookingDocumentActionsV2Component implements OnInit {
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
      documentCode: 'PAYMENT_REMINDER',
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
    private documentServicev2: DocumentServicev2
  ) {}

  ngOnInit(): void {
    this.loadUserEmail();
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

    // Obtener la reserva para obtener el userId
    this.reservationService
      .getById(reservationId)
      .pipe(
        switchMap((reservation) => {
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
        },
        error: () => {
          this.isLoadingEmail = false;
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
    return this.documentList.filter((action) => action.visible);
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
