import { Component, Input, OnInit } from '@angular/core';
import { TableRowCollapseEvent, TableRowExpandEvent } from 'primeng/table';
import { BookingsService } from '../../../core/services/bookings.service';
import { Document } from '../../../core/models/document/document.model';
import { NotificationLog } from '../../../core/models/notification-log/notification-log.model';
import { BookingNote } from '../../../core/models/bookings/booking-note.model';
import { SelectItem } from 'primeng/api';

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
  @Input() showExpandControls: boolean = true; // controla visibilidad de expand/collapse

  documents: Document[] = []; // Replace products with documents array
  groupedDocuments: { [type: string]: Document[] } = {};
  latestDocuments: Document[] = [];
  expandedRowKeys: { [key: string]: boolean } = {};

  // Add property for notification logs
  notificationLogs: NotificationLog[] = [];

  // Add property for notes
  notes: BookingNote[] = [];

  // Add property for type options
  typeOptions: SelectItem[] = [];

  constructor(private bookingsService: BookingsService) {}

  ngOnInit(): void {
    if (this.bookingId) {
      this.loadDocuments();
      this.loadNotificationLogs();
      this.loadNotes();
    }
  }

  loadDocuments(): void {
    this.bookingsService.getBookingDocumentation(this.bookingId).subscribe({
      next: (docs) => {
        this.documents = docs;
        this.groupDocumentsByType();
        console.log('Documents loaded:', this.documents);
      },
      error: (err) => {
        console.error('Error loading documents:', err);
      },
    });
  }

  groupDocumentsByType(): void {
    // Agrupar por type
    const grouped: { [type: string]: Document[] } = {};
    for (const doc of this.documents) {
      if (!grouped[doc.type]) {
        grouped[doc.type] = [];
      }
      grouped[doc.type].push(doc);
    }
    // Ordenar cada grupo por fecha descendente
    for (const type in grouped) {
      grouped[type].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    this.groupedDocuments = grouped;
    console.log('Grouped documents:', this.groupedDocuments);

    // Solo el más reciente de cada tipo
    this.latestDocuments = Object.values(grouped).map((docs) => docs[0]);
  }

  getPreviousVersions(type: string): Document[] {
    const docs = this.groupedDocuments[type] || [];
    return docs.slice(1); // Todas menos la más reciente
  }

  rowExpanded(document: Document): void {
    console.log('Row expanded for document:', document);
    console.log('Previous versions:', this.getPreviousVersions(document.type));
  }

  onRowExpand(event: TableRowExpandEvent) {
    console.log('Row expanded:', event.data);
  }

  onRowCollapse(event: TableRowCollapseEvent) {
    console.log('Row collapsed:', event.data);
  }

  expandAll() {
    this.latestDocuments.forEach((doc) => {
      if (this.getPreviousVersions(doc.type).length > 0) {
        this.expandedRowKeys[doc._id] = true;
      }
    });
  }

  collapseAll() {
    this.expandedRowKeys = {};
  }

  // Add method to load notification logs
  loadNotificationLogs(): void {
    this.bookingsService.getBookingNotificationLog(this.bookingId).subscribe({
      next: (logs) => {
        this.notificationLogs = logs;
        console.log('Notification logs loaded:', this.notificationLogs);
      },
      error: (err) => {
        console.error('Error loading notification logs:', err);
      },
    });
  }

  // Add method to load notes
  loadNotes(): void {
    this.bookingsService.getBookingNotes(this.bookingId).subscribe({
      next: (notes) => {
        this.notes = notes;
        // Generar opciones únicas para filtro de estado
        this.typeOptions = Array.from(new Set(notes.map((n) => n.type))).map(
          (t) => ({ label: t, value: t })
        );
        console.log('Notes loaded:', this.notes);
      },
      error: (err) => {
        console.error('Error loading notes:', err);
      },
    });
  }

  /** devuelve severidad válida para p-tag */
  getCategorySeverity(category: string): Severity {
    switch (category?.toLowerCase()) {
      case 'internal':
        return 'info';
      case 'customer':
        return 'warn';
      case 'important':
        return 'danger';
      case 'system':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  /** devuelve severidad válida para p-tag */
  getTypeSeverity(type: string): Severity {
    switch (type?.toLowerCase()) {
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
}
