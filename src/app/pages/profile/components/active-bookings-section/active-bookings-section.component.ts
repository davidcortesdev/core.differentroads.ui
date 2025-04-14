import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { BookingsService } from '../../../../core/services/bookings.service';
import { forkJoin, Subscription, from, of } from 'rxjs';
import { ToursService } from '../../../../core/services/tours.service';
import { CldImage } from '../../../../core/models/commons/cld-image.model';
import { mergeMap, catchError, finalize } from 'rxjs/operators';

interface Booking {
  id: string;
  title: string;
  reservationNumber: string;
  creationDate: Date;
  status: string;
  departureDate: Date;
  image: string;
  tourID?: string;
  passengers?: number;
  price?: number; // Changed from string to number for consistency
}

@Component({
  selector: 'app-active-bookings-section',
  standalone: false,
  templateUrl: './active-bookings-section.component.html',
  styleUrls: ['./active-bookings-section.component.scss'],
})
export class ActiveBookingsSectionComponent implements OnInit, OnDestroy {
  bookings: Booking[] = [];
  isExpanded: boolean = true;
  @Input() userEmail!: string;
  loading: boolean = false;
  @Output() bookingSelected = new EventEmitter<string>();

  private subscriptions = new Subscription();
  private imageCache = new Map<string, string>(); // Cache for tour images
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_DELAY = 300;

  constructor(
    private bookingsService: BookingsService,
    private router: Router,
    private toursService: ToursService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loading = true;
    if (this.userEmail) {
      this.fetchBookingsWithMultipleStatuses(this.userEmail);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  fetchBookingsWithMultipleStatuses(email: string, page: number = 1) {
    // Obtenemos las reservas tanto con estado "Booked" como "RQ"
    const bookedRequest = this.bookingsService.getBookingsByEmail(
      email,
      'Booked',
      page,
      1000
    );
    const rqRequest = this.bookingsService.getBookingsByEmail(
      email,
      'RQ',
      page,
      1000
    );

    const subscription = forkJoin([bookedRequest, rqRequest]).subscribe({
      next: ([bookedResponse, rqResponse]) => {
        const bookedBookings =
          bookedResponse?.data?.map((booking: any) =>
            this.mapBooking(booking)
          ) || [];
        const rqBookings =
          rqResponse?.data?.map((booking: any) => this.mapBooking(booking)) ||
          [];

        this.bookings = [...bookedBookings, ...rqBookings];

        // Ordenar por fecha de creación (más reciente primero)
        this.bookings.sort(
          (a, b) => b.creationDate.getTime() - a.creationDate.getTime()
        );

        // Fetch detailed booking information to get accurate prices
        this.fetchDetailedBookingInfo();

        // Cargar las imágenes después de que las reservas estén disponibles
        this.loadTourImages();
      },
      error: (error) => {
        console.error('Error fetching bookings:', error);
        this.loading = false;
      },
    });

    this.subscriptions.add(subscription);
  }

  fetchDetailedBookingInfo() {
    // Process bookings in batches to avoid too many simultaneous requests
    const processBookings = (startIndex = 0) => {
      const batch = this.bookings.slice(
        startIndex,
        startIndex + this.BATCH_SIZE
      );
      if (!batch.length) {
        this.loading = false;
        return;
      }

      const subscription = from(batch)
        .pipe(
          mergeMap((booking) => {
            return this.bookingsService.getBookingById(booking.id).pipe(
              catchError((error) => {
                console.error(
                  `Error fetching detailed info for booking ${booking.id}:`,
                  error
                );
                return of(null);
              })
            );
          }, 3) // Limit concurrent requests to 3
        )
        .subscribe({
          next: (detailedBooking) => {
            if (detailedBooking) {
              // Find the corresponding booking by reservation number
              const index = this.bookings.findIndex(
                (b) => b.reservationNumber === detailedBooking.code
              );

              if (index >= 0) {
                // Update the price with the accurate information
                this.bookings[index].price =
                  detailedBooking.periodData?.['total'] || 0;
                this.cdr.detectChanges();
              }
            }
          },
          complete: () => {
            // Process next batch
            const nextIndex = startIndex + this.BATCH_SIZE;
            if (nextIndex < this.bookings.length) {
              setTimeout(() => {
                processBookings(nextIndex);
              }, this.BATCH_DELAY);
            } else {
              this.loading = false;
            }
          },
        });

      this.subscriptions.add(subscription);
    };

    // Start processing bookings
    processBookings();
  }

  mapBooking(booking: any): Booking {
    return {
      id: booking?._id ?? '',
      title: booking?.periodData?.['tour']?.name || '',
      reservationNumber: booking?.code ?? '',
      creationDate: new Date(booking?.createdAt ?? ''),
      status: booking?.status ?? '',
      departureDate: new Date(booking?.periodData?.['dayOne'] ?? ''),
      image: '', // Imagen por defecto
      tourID: booking?.periodData?.tourID || '',
      passengers: booking?.travelersNumber || 0,
      price: booking?.totalPrice || 0,
    };
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewBooking(booking: Booking) {
    this.router.navigate(['bookings', booking.id]);
  }

  loadTourImages() {
    if (!this.bookings?.length) return;

    // Group bookings by tourID to avoid duplicate requests
    const tourGroups = this.groupBookingsByTourId();

    // Process each unique tourID in batches
    const uniqueTourIds = Array.from(tourGroups.keys());
    this.processTourImageBatches(uniqueTourIds, tourGroups);
  }

  private groupBookingsByTourId(): Map<string, Booking[]> {
    const tourGroups = new Map<string, Booking[]>();

    this.bookings.forEach((booking) => {
      if (!booking.tourID) return;

      // If we already have this tour in the cache, apply the image immediately
      if (this.imageCache.has(booking.tourID)) {
        booking.image = this.imageCache.get(booking.tourID) || '';
        return;
      }

      // Group bookings by tourID
      if (!tourGroups.has(booking.tourID)) {
        tourGroups.set(booking.tourID, []);
      }
      tourGroups.get(booking.tourID)?.push(booking);
    });

    return tourGroups;
  }

  private processTourImageBatches(
    tourIds: string[],
    tourGroups: Map<string, Booking[]>,
    startIndex = 0
  ) {
    const batch = tourIds.slice(startIndex, startIndex + this.BATCH_SIZE);
    if (!batch.length) return;

    batch.forEach((tourID) => {
      this.loadTourImage(tourID, tourGroups.get(tourID) || []);
    });

    const nextIndex = startIndex + this.BATCH_SIZE;
    if (nextIndex < tourIds.length) {
      setTimeout(() => {
        this.processTourImageBatches(tourIds, tourGroups, nextIndex);
      }, this.BATCH_DELAY);
    }
  }

  private async loadTourImage(tourID: string, bookings: Booking[]) {
    const image = await this.getImage(tourID);
    if (image?.url) {
      // Store in cache
      this.imageCache.set(tourID, image.url);

      // Update all bookings with this tourID
      bookings.forEach((booking) => {
        booking.image = image.url;
      });

      this.cdr.detectChanges();
    }
  }

  private getImage(id: string): Promise<CldImage | null> {
    return new Promise((resolve) => {
      const filters = { externalID: id };
      const subscription = this.toursService
        .getFilteredToursList(filters)
        .subscribe({
          next: (tourData) => {
            if (
              tourData?.data?.length > 0 &&
              tourData.data[0].image?.length > 0
            ) {
              resolve(tourData.data[0].image[0]);
            } else {
              console.warn('No image data available for tour:', id);
              resolve(null);
            }
          },
          error: (err) => {
            console.error('Error fetching tour image:', err);
            resolve(null);
          },
        });

      this.subscriptions.add(subscription);
    });
  }

  trackByBookingId(index: number, booking: Booking): string {
    return booking.id;
  }
}
