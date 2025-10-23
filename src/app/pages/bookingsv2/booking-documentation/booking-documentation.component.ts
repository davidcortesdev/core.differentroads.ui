import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  DocumentationService,
  IDocumentReservationResponse,
  IDocumentTypeResponse,
} from '../../../core/services/documentation/documentation.service';
import {
  NotificationService,
  INotification,
  INotificationStatusResponse,
  INotificationTypeResponse,
} from '../../../core/services/documentation/notification.service';
import {
  ReservationTKLogService,
  IReservationTKLogResponse,
} from '../../../core/services/reservation/reservation-tk-log.service';
import { MessageService } from 'primeng/api';
import { BookingNote } from '../../../core/models/bookings/booking-note.model';
import { catchError, of } from 'rxjs';

type Severity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast';

@Component({
  selector: 'app-booking-documentation-v2',
  standalone: false,
  templateUrl: './booking-documentation.component.html',
  styleUrls: ['./booking-documentation.component.scss'],
})
export class BookingDocumentationV2Component implements OnInit {
  @Input() bookingId!: string; // Receive bookingId as input

  // Propiedades para los servicios de API
  apiDocuments: IDocumentReservationResponse[] = [];
  apiNotifications: INotification[] = [];
  documentsLoading: boolean = false;
  notificationsLoading: boolean = false;

  // Propiedades para estados y tipos
  notificationStatuses: INotificationStatusResponse[] = [];
  notificationTypes: INotificationTypeResponse[] = [];
  statusesLoading: boolean = false;
  typesLoading: boolean = false;

  // Propiedades para tipos de documento
  documentTypes: IDocumentTypeResponse[] = [];
  documentTypesLoading: boolean = false;

  // Add property for notes
  notes: BookingNote[] = [];

  // TKLog table properties
  tkLogs: IReservationTKLogResponse[] = [];
  tkLogsLoading = false;
  showTkLogsTable = false;

  // Propiedad para detectar si es ATC
  isAtc: boolean = false;

  constructor(
    private documentationService: DocumentationService,
    private notificationService: NotificationService,
    private messageService: MessageService,
    private reservationTKLogService: ReservationTKLogService,
    private route: ActivatedRoute
  ) {}

  /**
   * Detecta si la aplicación está corriendo en ATC mediante parámetros de URL
   * Similar a cómo checkout-v2 detecta isTourOperator
   */
  private detectIfAtc(): void {
    // Leer parámetros de query string
    this.route.queryParams.subscribe((params) => {
      // Si viene el parámetro isATC=true, activar modo ATC
      if (params['isATC'] === 'true' || params['isAtc'] === 'true') {
        this.isAtc = true;
        console.log('✅ ATC detectado desde parámetro URL');
      }
    });

    console.log('🔍 isAtc:', this.isAtc);
  }

  ngOnInit(): void {
    // Detectar si es ATC desde los parámetros de URL
    this.detectIfAtc();

    if (this.bookingId) {
      this.loadNotificationStatuses();
      this.loadNotificationTypes();
      this.loadDocumentTypes();
      this.loadDocuments();
      this.loadNotifications();
      this.loadNotes();

      // Solo cargar TK logs si estamos en ATC
      if (this.isAtc) {
        this.loadTKLogs();
      }
    }
  }

  /**
   * Carga estados de notificación desde la API
   */
  loadNotificationStatuses(): void {
    this.statusesLoading = true;

    this.notificationService.getNotificationStatuses().subscribe({
      next: (statuses: INotificationStatusResponse[]) => {
        this.notificationStatuses = statuses;
        this.statusesLoading = false;
        console.log('📊 Notification statuses loaded:', statuses);
      },
      error: (error) => {
        console.error('❌ Error loading notification statuses:', error);
        this.notificationStatuses = [];
        this.statusesLoading = false;
      },
    });
  }

  /**
   * Carga tipos de notificación desde la API
   */
  loadNotificationTypes(): void {
    this.typesLoading = true;

    this.notificationService.getNotificationTypes().subscribe({
      next: (types: INotificationTypeResponse[]) => {
        this.notificationTypes = types;
        this.typesLoading = false;
        console.log('📋 Notification types loaded:', types);
      },
      error: (error) => {
        console.error('❌ Error loading notification types:', error);
        this.notificationTypes = [];
        this.typesLoading = false;
      },
    });
  }

  /**
   * Carga tipos de documento desde la API
   */
  loadDocumentTypes(): void {
    this.documentTypesLoading = true;

    this.documentationService.getDocumentTypes().subscribe({
      next: (types: IDocumentTypeResponse[]) => {
        this.documentTypes = types;
        this.documentTypesLoading = false;
        console.log('📄 Document types loaded:', types);
      },
      error: (error) => {
        console.error('❌ Error loading document types:', error);
        this.documentTypes = [];
        this.documentTypesLoading = false;
      },
    });
  }

  /**
   * Carga documentos desde la API
   */
  loadDocuments(): void {
    this.documentsLoading = true;

    this.documentationService
      .getCompleteDocumentsByReservationId(parseInt(this.bookingId, 10))
      .subscribe({
        next: (documents: any[]) => {
          this.apiDocuments = documents;
          this.documentsLoading = false;
          console.log('📄 Documents loaded:', documents);
        },
        error: (error) => {
          console.error('❌ Error loading documents:', error);
          this.apiDocuments = [];
          this.documentsLoading = false;
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar los documentos',
          });
        },
      });
  }

  /**
   * Carga notificaciones desde la API
   */
  loadNotifications(): void {
    this.notificationsLoading = true;

    this.notificationService
      .getNotificationsByReservationId(parseInt(this.bookingId, 10))
      .subscribe({
        next: (notifications: INotification[]) => {
          this.apiNotifications = notifications;
          this.notificationsLoading = false;
          console.log('📧 Notifications loaded:', notifications);
        },
        error: (error) => {
          console.error('❌ Error loading notifications:', error);
          this.apiNotifications = [];
          this.notificationsLoading = false;
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar las notificaciones',
          });
        },
      });
  }

  /**
   * Carga notas (método restaurado)
   */
  loadNotes(): void {
    // Inicializar array vacío como estaba antes
    this.notes = [];
    console.log('📝 Notes loaded:', this.notes);
  }

  /**
   * Formatea la fecha de creación de un documento
   */
  formatDocumentDate(dateString: string): string {
    if (!dateString) return 'Fecha no disponible';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
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
   * Formatea la fecha de creación de una notificación
   */
  formatNotificationDate(dateString: string): string {
    if (!dateString) return 'Fecha no disponible';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
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
   * Obtiene el estado de una notificación en texto legible desde la API
   */
  getNotificationStatusText(notificationStatusId: number): string {
    const status = this.notificationStatuses.find(
      (s) => s.id === notificationStatusId
    );
    return status?.name || 'Desconocido';
  }

  /**
   * Obtiene el color del estado de una notificación basado en el código de la API
   */
  getNotificationStatusColor(notificationStatusId: number): Severity {
    const status = this.notificationStatuses.find(
      (s) => s.id === notificationStatusId
    );
    if (!status) return 'secondary';

    const code = status.code?.toUpperCase();
    switch (code) {
      case 'PENDING':
        return 'warn';
      case 'READY':
        return 'info';
      case 'SENT':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'CANCELLED':
        return 'secondary';
      default:
        return 'info';
    }
  }

  /**
   * Obtiene el tipo de notificación en texto legible desde la API
   */
  getNotificationTypeText(notificationTypeId: number): string {
    const type = this.notificationTypes.find(
      (t) => t.id === notificationTypeId
    );
    return type?.name || 'Desconocido';
  }

  /**
   * Obtiene la severidad del tipo de nota (método restaurado)
   */
  getTypeSeverity(type: string): Severity {
    switch (type) {
      case 'info':
        return 'info';
      case 'warning':
        return 'warn';
      case 'error':
        return 'danger';
      case 'success':
        return 'success';
      default:
        return 'secondary';
    }
  }

  /**
   * Obtiene el nombre del tipo de documento desde la API
   */
  getDocumentTypeText(documentTypeId: number): string {
    const type = this.documentTypes.find((t) => t.id === documentTypeId);
    return type?.name || 'Desconocido';
  }

  /**
   * Método de prueba para verificar que los servicios funcionan
   */
  testServices(): void {
    console.log('🧪 TEST: Testing services for booking:', this.bookingId);
    console.log('📊 Loaded notification statuses:', this.notificationStatuses);
    console.log('📋 Loaded notification types:', this.notificationTypes);
    console.log('📄 Loaded document types:', this.documentTypes);

    // Probar servicio de notificaciones
    this.notificationService
      .getNotificationsByReservationId(parseInt(this.bookingId, 10))
      .subscribe({
        next: (notifications) => {
          console.log('✅ TEST: Notifications service working:', notifications);
        },
        error: (error) => {
          console.error('❌ TEST: Notifications service error:', error);
        },
      });

    // Probar servicio de documentación con reserva que tiene documentos
    this.documentationService
      .getCompleteDocumentsByReservationId(56) // Usar reserva 56 que tiene documentos
      .subscribe({
        next: (documents) => {
          console.log('✅ TEST: Documentation service working:', documents);
        },
        error: (error) => {
          console.error('❌ TEST: Documentation service error:', error);
        },
      });
  }

  /**
   * Carga los logs de comunicación con TK para la reserva actual
   */
  private loadTKLogs(): void {
    if (!this.bookingId) {
      return;
    }

    const reservationIdNumber = parseInt(this.bookingId, 10);
    if (isNaN(reservationIdNumber)) {
      console.error('ID de reserva no válido:', this.bookingId);
      return;
    }

    this.tkLogsLoading = true;
    this.reservationTKLogService
      .getByReservation(reservationIdNumber)
      .pipe(
        catchError((error) => {
          console.error('Error al cargar logs de TK:', error);
          this.tkLogsLoading = false;
          return of([]);
        })
      )
      .subscribe((logs: IReservationTKLogResponse[]) => {
        this.tkLogs = logs;
        this.tkLogsLoading = false;
        this.showTkLogsTable = logs.length > 0;
      });
  }

  /**
   * Determina la severidad del log basándose en el estado
   */
  getLogSeverity(
    log: IReservationTKLogResponse
  ): 'success' | 'info' | 'warn' | 'error' {
    // Si hay un error de TK, mostrar como error
    if (log.tkErrorCode || log.tkErrorMessage) {
      return 'error';
    }

    // Si el código de estado HTTP es un error (4xx o 5xx)
    if (log.httpStatusCode >= 400) {
      return 'error';
    }

    // Si el código de estado HTTP es exitoso (2xx)
    if (log.httpStatusCode >= 200 && log.httpStatusCode < 300) {
      return 'success';
    }

    // Si hay código de estado HTTP 3xx (redirección)
    if (log.httpStatusCode >= 300 && log.httpStatusCode < 400) {
      return 'warn';
    }

    // Por defecto, informativo
    return 'info';
  }

  /**
   * Formatea la fecha para mostrar en la tabla
   */
  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  }

  /**
   * Formatea el contenido de respuesta truncándolo si es muy largo
   */
  formatResponseContent(content: string): string {
    if (!content) return '-';
    const maxLength = 60;
    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content;
  }

  /**
   * Obtiene el icono apropiado según la severidad del log
   */
  getLogIcon(severity: string): string {
    switch (severity) {
      case 'success':
        return 'pi pi-check-circle';
      case 'error':
        return 'pi pi-times-circle';
      case 'warn':
        return 'pi pi-exclamation-triangle';
      default:
        return 'pi pi-info-circle';
    }
  }

  /**
   * Obtiene la clase CSS apropiada según la severidad del log
   */
  getLogClass(severity: string): string {
    switch (severity) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warn':
        return 'text-orange-600';
      default:
        return 'text-blue-600';
    }
  }

  /**
   * Formatea el mensaje de error - ahora muestra el mensaje completo
   */
  formatErrorMessage(message: string): string {
    if (!message) return '-';
    return message; // Mostrar el mensaje completo
  }

  /**
   * Obtiene el mensaje completo formateado para el tooltip del Error TK
   */
  getFullErrorMessage(log: IReservationTKLogResponse): string {
    const parts: string[] = [];

    if (log.tkErrorCode) {
      parts.push(`<strong>Código de Error:</strong> ${log.tkErrorCode}`);
    }

    if (log.tkErrorMessage) {
      parts.push(`<strong>Mensaje:</strong> ${log.tkErrorMessage}`);
    }

    if (parts.length === 0) {
      return 'No hay información de error disponible';
    }

    return parts.join('<br><br>');
  }
}
