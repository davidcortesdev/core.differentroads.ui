import { Component, Input, OnInit } from '@angular/core';
import { BookingsService } from '../../../core/services/bookings.service';
import { Document } from '../../../core/models/document/document.model';

@Component({
  selector: 'app-booking-documentation',
  standalone: false,
  templateUrl: './booking-documentation.component.html',
  styleUrl: './booking-documentation.component.scss',
})
export class BookingDocumentationComponent implements OnInit {
  @Input() bookingId!: string; // Receive bookingId as input
  documents: Document[] = []; // Replace products with documents array

  constructor(private bookingsService: BookingsService) {}

  ngOnInit(): void {
    if (this.bookingId) {
      this.loadDocuments();
    }
  }

  loadDocuments(): void {
    this.bookingsService.getBookingDocumentation(this.bookingId).subscribe({
      next: (docs) => {
        this.documents = docs;
        console.log('Documents loaded:', this.documents);
      },
      error: (err) => {
        console.error('Error loading documents:', err);
      },
    });
  }
}
