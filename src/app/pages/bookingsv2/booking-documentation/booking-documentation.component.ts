import { Component, Input, OnInit } from '@angular/core';
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
import { MessageService } from 'primeng/api';
import { BookingNote } from '../../../core/models/bookings/booking-note.model';

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

  constructor(
    private documentationService: DocumentationService,
    private notificationService: NotificationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    if (this.bookingId) {
      this.loadNotificationStatuses();
      this.loadNotificationTypes();
      this.loadDocumentTypes();
      this.loadDocuments();
      this.loadNotifications();
      this.loadNotes();
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
}
