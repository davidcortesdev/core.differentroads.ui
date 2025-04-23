import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, forkJoin, from, of } from 'rxjs';
import { mergeMap, catchError, finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

// Services
import { BookingsService } from '../../../../core/services/bookings.service';
import { ToursService } from '../../../../core/services/tours.service';
import { PeriodsService } from '../../../../core/services/periods.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { SummaryService } from '../../../../core/services/checkout/summary.service';

// Models
import { CldImage } from '../../../../core/models/commons/cld-image.model';
import { Order, SummaryItem } from '../../../../core/models/orders/order.model';

// Generic data interface for all types of bookings
export interface BookingItem {
  id: string;
  title: string;
  number: string; // Generic for all types
  reservationNumber?: string; // For active bookings
  budgetNumber?: string; // For budgets
  ID?: string; // For budgets (in uppercase as in original component)
  _id?: string; // For budgets compatibility
  creationDate: Date;
  status: string;
  departureDate: Date;
  image: string;
  passengers?: number;
  price?: number;
  tourID?: string;
  origin?: string;
  departureName?: string;
  summary?: SummaryItem[]; // For budgets
  imageLoading?: boolean; // Track if image is loading
  imageLoaded?: boolean; // Track if image loaded successfully
  code?: string; // For bookings compatibility
}

// Configuration interface for component customization
export interface BookingListConfig {
  type: 'active-bookings' | 'recent-budgets' | 'travel-history';
  title: string;
  emptyMessage: string;
  status?: string;
  actions: {
    download?: boolean;
    send?: boolean;
    view?: boolean;
    reserve?: boolean;
  };
  buttonLabels?: {
    download?: string;
    send?: string;
    view?: string;
    reserve?: string;
  };
}

@Component({
  selector: 'app-booking-list-section',
  standalone: false,
  templateUrl: './booking-list-section.component.html',
  styleUrls: ['./booking-list-section.component.scss'],
})
export class BookingListSectionComponent implements OnInit, OnDestroy {
  @Input() userEmail!: string;
  @Input() config!: BookingListConfig;
  @Output() itemSelected = new EventEmitter<BookingItem>();

  bookingItems: BookingItem[] = [];
  isExpanded: boolean = true;
  loading: boolean = false;
  downloadLoading: { [key: string]: boolean } = {};
  notificationLoading: { [key: string]: boolean } = {};
  currentOrder: Order | null = null; // For budgets

  private subscriptions = new Subscription();
  private imageCache = new Map<string, string>();
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_DELAY = 300;

  constructor(
    private bookingsService: BookingsService,
    private toursService: ToursService,
    private ordersService: OrdersService,
    private periodsService: PeriodsService,
    private notificationsService: NotificationsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private messageService: MessageService,
    private summaryService: SummaryService
  ) {}

  ngOnInit() {
    this.loading = true;
    if (this.userEmail) {
      this.loadData();

      // For budgets, get current order from summary service
      if (this.config.type === 'recent-budgets') {
        this.getCurrentOrderFromSummary();
      }
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  // Get current order from summary service (for budgets)
  getCurrentOrderFromSummary() {
    const subscription = this.summaryService.order$.subscribe((order) => {
      this.currentOrder = order;
    });
    this.subscriptions.add(subscription);
  }

  // Format date for budget display (Day Month format)
  formatShortDate(date: Date): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Fecha no disponible';
    }

    const day = date.getDate();
    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const month = monthNames[date.getMonth()];

    return `${day} ${month}`;
  }

  // Calculate total price from summary items (for budgets)
  calculateTotalFromSummary(summaryItems: SummaryItem[]): number {
    if (!summaryItems || summaryItems.length === 0) return 0;

    return summaryItems.reduce((total, item) => {
      return total + item.value * item.qty;
    }, 0);
  }

  loadData() {
    switch (this.config.type) {
      case 'active-bookings':
        this.fetchActiveBookings();
        break;
      case 'recent-budgets':
        this.fetchRecentBudgets();
        break;
      case 'travel-history':
        this.fetchTravelHistory();
        break;
    }
  }

  // Default placeholder image for error cases
  private getDefaultImage(): string {
    return 'assets/images/placeholder-tour.jpg';
  }

  // ------------- ACTIVE BOOKINGS METHODS -------------
  fetchActiveBookings() {
    // Fetch bookings with 'Booked' and 'RQ' status
    const bookedRequest = this.bookingsService.getBookingsByEmail(
      this.userEmail,
      'Booked',
      1,
      1000
    );
    const rqRequest = this.bookingsService.getBookingsByEmail(
      this.userEmail,
      'RQ',
      1,
      1000
    );

    const subscription = forkJoin([bookedRequest, rqRequest]).subscribe({
      next: ([bookedResponse, rqResponse]) => {
        const bookedBookings =
          bookedResponse?.data?.map((booking: any) =>
            this.mapActiveBooking(booking)
          ) || [];
        const rqBookings =
          rqResponse?.data?.map((booking: any) =>
            this.mapActiveBooking(booking)
          ) || [];

        this.bookingItems = [...bookedBookings, ...rqBookings];

        // Sort by creation date (most recent first)
        this.bookingItems.sort(
          (a, b) => b.creationDate.getTime() - a.creationDate.getTime()
        );

        // Fetch detailed booking information for prices
        this.fetchDetailedBookingInfo();

        // Load tour images
        this.loadTourImages();
      },
      error: (error) => {
        console.error('Error fetching bookings:', error);
        this.loading = false;
      },
    });

    this.subscriptions.add(subscription);
  }

  mapActiveBooking(booking: any): BookingItem {
    return {
      id: booking?._id ?? '',
      title: booking?.periodData?.['tour']?.name || '',
      number: booking?.code ?? '',
      reservationNumber: booking?.code ?? '',
      creationDate: new Date(booking?.createdAt ?? ''),
      status: booking?.status ?? '',
      departureDate: new Date(booking?.periodData?.['dayOne'] ?? ''),
      image: '',
      tourID: booking?.periodData?.tourID || '',
      passengers: booking?.travelersNumber || 0,
      price: booking?.totalPrice || 0,
      code: booking?.code,
    };
  }

  fetchDetailedBookingInfo() {
    // Process bookings in batches to avoid too many simultaneous requests
    const processBookings = (startIndex = 0) => {
      const batch = this.bookingItems.slice(
        startIndex,
        startIndex + this.BATCH_SIZE
      );
      if (!batch.length) {
        this.loading = false;
        return;
      }

      const subscription = from(batch)
        .pipe(
          mergeMap((item) => {
            return this.bookingsService.getBookingById(item.id).pipe(
              catchError((error) => {
                console.error(
                  `Error fetching detailed info for booking ${item.id}:`,
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
              const index = this.bookingItems.findIndex(
                (b) =>
                  b.reservationNumber === detailedBooking.code ||
                  b.id === detailedBooking.code
              );

              if (index >= 0) {
                // Update the price with the accurate information
                this.bookingItems[index].price =
                  detailedBooking.periodData?.['total'] || 0;

                // Verify that the reservation number is present
                if (
                  detailedBooking.code &&
                  !this.bookingItems[index].reservationNumber
                ) {
                  this.bookingItems[index].reservationNumber =
                    detailedBooking.code;
                }

                this.cdr.detectChanges();
              }
            }
          },
          complete: () => {
            // Process next batch
            const nextIndex = startIndex + this.BATCH_SIZE;
            if (nextIndex < this.bookingItems.length) {
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

  // ------------- RECENT BUDGETS METHODS -------------
  fetchRecentBudgets() {
    this.ordersService.getOrdersByUser(this.userEmail).subscribe({
      next: (response) => {
        console.log('Todos los presupuestos:', response.data);
        const budgetOrders =
          response.data?.filter((order) => order.status === 'Budget') || [];
        console.log('Presupuestos filtrados:', budgetOrders.length);
        this.bookingItems = [];

        // Si no hay presupuestos, finalizar carga
        if (budgetOrders.length === 0) {
          this.loading = false;
          return;
        }

        // Contador para monitorear cuándo se han procesado todos los elementos
        let processedCount = 0;

        budgetOrders.forEach((order) => {
          const periodId = order.periodID;
          if (periodId) {
            this.periodsService.getPeriodDetail(periodId, ['all']).subscribe({
              next: (periodData) => {
                const budget = this.mapBudget(order, periodData);

                // Add summary data if available
                if (order.summary) {
                  budget.summary = order.summary;
                }

                this.ngZone.run(() => {
                  this.bookingItems.push(budget);
                  this.bookingItems = [...this.bookingItems]; // New reference to force update
                  this.bookingItems.sort(
                    (a, b) =>
                      b.creationDate.getTime() - a.creationDate.getTime()
                  );

                  if (budget.tourID) {
                    this.loadItemImage(budget);
                  }

                  processedCount++;
                  if (processedCount === budgetOrders.length) {
                    console.log(
                      'Se han procesado todos los presupuestos:',
                      processedCount
                    );
                    this.loading = false;
                  }

                  this.cdr.detectChanges();
                });
              },
              error: (error) => {
                console.error('Error fetching period:', periodId, error);
                const budget = this.mapBudget(order);

                if (order.summary) {
                  budget.summary = order.summary;
                }

                this.ngZone.run(() => {
                  this.bookingItems.push(budget);
                  this.bookingItems = [...this.bookingItems];
                  this.bookingItems.sort(
                    (a, b) =>
                      b.creationDate.getTime() - a.creationDate.getTime()
                  );

                  processedCount++;
                  if (processedCount === budgetOrders.length) {
                    console.log(
                      'Se han procesado todos los presupuestos:',
                      processedCount
                    );
                    this.loading = false;
                  }

                  this.cdr.detectChanges();
                });
              },
            });
          } else {
            const budget = this.mapBudget(order);

            if (order.summary) {
              budget.summary = order.summary;
            }

            this.ngZone.run(() => {
              this.bookingItems.push(budget);
              this.bookingItems = [...this.bookingItems];
              this.bookingItems.sort(
                (a, b) => b.creationDate.getTime() - a.creationDate.getTime()
              );

              processedCount++;
              if (processedCount === budgetOrders.length) {
                console.log(
                  'Se han procesado todos los presupuestos:',
                  processedCount
                );
                this.loading = false;
              }

              this.cdr.detectChanges();
            });
          }
        });
      },
      error: (error) => {
        console.error('Error fetching orders:', error);
        this.loading = false;
      },
    });
  }

  mapBudget(order: any, periodData?: any): BookingItem {
    const passengers = this.getPassengerCount(order);

    // Calculate price from summary if available
    let calculatedPrice = order.price || 0;
    if (order.summary && order.summary.length > 0) {
      calculatedPrice = this.calculateTotalFromSummary(order.summary);
    }

    const budget: BookingItem = {
      id: order._id,
      _id: order._id, // Include _id for compatibility with the original component
      title: 'Sin información del tour',
      number: order.id || order.code || '',
      budgetNumber: order.id || '',
      ID: order.ID || order.id || order.code || '', // Support both formats
      creationDate: new Date(order.createdAt || Date.now()),
      status: order.status,
      departureDate: new Date(order.createdAt || Date.now()),
      passengers: passengers,
      price: calculatedPrice,
      image: this.getDefaultImage(),
      tourID: '',
      departureName: '',
      summary: order.summary || [],
      imageLoading: true,
      imageLoaded: false,
    };

    if (periodData) {
      if (periodData.tourName) {
        budget.title = periodData.tourName;
      }

      if (periodData.dayOne) {
        const dateStr = periodData.dayOne;
        const dateParts = dateStr.split('T')[0].split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);

        budget.departureDate = new Date(year, month, day);
        budget.departureName = this.formatShortDate(budget.departureDate);
      }

      if (periodData.tourID) {
        budget.tourID = periodData.tourID;
      }
    }

    return budget;
  }

  private getPassengerCount(order: any): number {
    if (Array.isArray(order.travelers)) {
      const validTravelers = order.travelers.filter(
        (traveler: any) => traveler !== null && traveler !== undefined
      );
      return validTravelers.length;
    } else if (typeof order.travelers === 'number') {
      return order.travelers;
    } else if (order.numPassengers !== undefined) {
      return Number(order.numPassengers) || 0;
    } else {
      return 0;
    }
  }

  // ------------- TRAVEL HISTORY METHODS -------------
  fetchTravelHistory() {
    this.bookingsService
      .getBookingsByEmail(this.userEmail, 'Pending,Canceled', 1, 1000)
      .subscribe({
        next: (response) => {
          if (response?.data) {
            this.bookingItems = response.data.map((booking) =>
              this.mapTravelHistory(booking)
            );
            // Load tour images
            this.loadTourImages();
          } else {
            this.bookingItems = [];
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error fetching travel history:', error);
          this.loading = false;
        },
      });
  }

  mapTravelHistory(booking: any): BookingItem {
    const tourID = booking?.periodData?.tourID || '';

    return {
      id: booking?._id ?? '',
      title: booking?.periodData?.['tour']?.name || '',
      number: booking?.code ?? '',
      creationDate: new Date(booking?.createdAt ?? ''),
      status: booking?.status ?? '',
      departureDate: new Date(booking?.periodData?.['dayOne'] ?? ''),
      origin: booking?.flights?.[0]?.name ?? 'MAD',
      passengers: booking?.travelersNumber ?? 0,
      image: '',
      tourID: tourID,
      code: booking?.code ?? '',
    };
  }

  // ------------- COMMON IMAGE LOADING METHODS -------------
  loadTourImages() {
    if (!this.bookingItems || this.bookingItems.length === 0) return;

    // Group items by tourID to avoid duplicate requests
    const tourGroups = this.groupItemsByTourId();

    // Process each unique tourID in batches
    const uniqueTourIds = Array.from(tourGroups.keys()).filter((id) => id); // Filter out empty IDs

    if (uniqueTourIds.length === 0) {
      this.loading = false;
      return;
    }

    this.processTourImageBatches(uniqueTourIds, tourGroups);
  }

  private groupItemsByTourId(): Map<string, BookingItem[]> {
    const tourGroups = new Map<string, BookingItem[]>();

    this.bookingItems.forEach((item) => {
      if (!item.tourID) return;

      // If we already have this tour in the cache, apply the image immediately
      if (this.imageCache.has(item.tourID)) {
        item.image = this.imageCache.get(item.tourID) || '';
        if (item.imageLoading !== undefined) {
          item.imageLoading = false;
          item.imageLoaded = true;
        }
        return;
      }

      // Group items by tourID
      if (!tourGroups.has(item.tourID)) {
        tourGroups.set(item.tourID, []);
      }
      tourGroups.get(item.tourID)?.push(item);
    });

    return tourGroups;
  }

  private processTourImageBatches(
    tourIds: string[],
    tourGroups: Map<string, BookingItem[]>,
    startIndex = 0
  ) {
    const batch = tourIds.slice(startIndex, startIndex + this.BATCH_SIZE);
    if (!batch.length) {
      this.loading = false;
      return;
    }

    let completedBatches = 0;

    batch.forEach((tourID) => {
      this.loadTourImage(tourID, tourGroups.get(tourID) || []).finally(() => {
        completedBatches++;
        if (completedBatches === batch.length) {
          // Process next batch once all current batch items are done
          const nextIndex = startIndex + this.BATCH_SIZE;
          if (nextIndex < tourIds.length) {
            setTimeout(() => {
              this.processTourImageBatches(tourIds, tourGroups, nextIndex);
            }, this.BATCH_DELAY);
          } else {
            this.loading = false;
          }
        }
      });
    });
  }

  private async loadTourImage(
    tourID: string,
    items: BookingItem[]
  ): Promise<void> {
    try {
      const image = await this.getImage(tourID);
      if (image?.url) {
        // Store in cache
        this.imageCache.set(tourID, image.url);

        // Update all items with this tourID
        items.forEach((item) => {
          item.image = image.url;

          // Update loading state if those properties exist
          if (item.imageLoading !== undefined) {
            item.imageLoading = false;
            item.imageLoaded = true;
          }
        });

        this.cdr.detectChanges();
      } else {
        // Set default image for all items in this batch
        items.forEach((item) => {
          item.image = this.getDefaultImage();
          if (item.imageLoading !== undefined) {
            item.imageLoading = false;
            item.imageLoaded = false;
          }
        });
        this.cdr.detectChanges();
      }
    } catch (error) {
      // Handle error case
      items.forEach((item) => {
        item.image = this.getDefaultImage();
        if (item.imageLoading !== undefined) {
          item.imageLoading = false;
          item.imageLoaded = false;
        }
      });
      this.cdr.detectChanges();
    }
  }

  // For individual item image loading (budget specific)
  loadItemImage(item: BookingItem) {
    if (!item.tourID) {
      // If no tourID, end loading and use default image
      if (item.imageLoading !== undefined) {
        item.imageLoading = false;
        item.imageLoaded = false;
      }
      item.image = this.getDefaultImage();
      this.cdr.detectChanges();
      return;
    }

    // Start loading indicator if properties exist
    if (item.imageLoading !== undefined) {
      item.imageLoading = true;
      item.imageLoaded = false;
    }

    this.getTourData(item.tourID)
      .then((tourData) => {
        if (tourData.image?.url) {
          // If image URL exists in the cache, use it immediately
          if (this.imageCache.has(item.tourID!)) {
            item.image = this.imageCache.get(item.tourID!)!;
            if (item.imageLoading !== undefined) {
              item.imageLoading = false;
              item.imageLoaded = true;
            }
            this.cdr.detectChanges();
            return;
          }

          // Otherwise cache it and use it
          item.image = tourData.image.url;
          this.imageCache.set(item.tourID!, tourData.image.url);

          // Create a new Image object to preload the image
          const img = new Image();
          img.onload = () => {
            if (item.imageLoading !== undefined) {
              item.imageLoading = false;
              item.imageLoaded = true;
            }
            this.cdr.detectChanges();
          };

          img.onerror = () => {
            item.image = this.getDefaultImage();
            if (item.imageLoading !== undefined) {
              item.imageLoading = false;
              item.imageLoaded = false;
            }
            this.cdr.detectChanges();
          };

          img.src = item.image;
        } else {
          item.image = this.getDefaultImage();
          if (item.imageLoading !== undefined) {
            item.imageLoading = false;
            item.imageLoaded = false;
          }
          this.cdr.detectChanges();
        }
      })
      .catch(() => {
        item.image = this.getDefaultImage();
        if (item.imageLoading !== undefined) {
          item.imageLoading = false;
          item.imageLoaded = false;
        }
        this.cdr.detectChanges();
      });
  }

  private getImage(id: string): Promise<CldImage | null> {
    return new Promise((resolve, reject) => {
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
            reject(err);
          },
        });

      this.subscriptions.add(subscription);
    });
  }

  // Obtiene los datos del tour (imagen y precio) para presupuestos
  getTourData(
    id: string
  ): Promise<{ image: CldImage | null; price: number | null }> {
    return new Promise((resolve, reject) => {
      const filters = {
        externalID: id,
      };

      this.toursService.getFilteredToursList(filters).subscribe({
        next: (tourData) => {
          if (tourData && tourData.data && tourData.data.length > 0) {
            const tour = tourData.data[0];
            resolve({
              image: tour.image && tour.image.length > 0 ? tour.image[0] : null,
              price: tour.price || null,
            });
          } else {
            resolve({ image: null, price: null });
          }
        },
        error: (err) => {
          console.error('Error fetching tour data:', err);
          reject(err);
        },
      });
    });
  }

  // Handle errors during image loading
  imageLoadError(item: BookingItem): void {
    item.image = this.getDefaultImage();
    if (item.imageLoading !== undefined) {
      item.imageLoading = false;
      item.imageLoaded = false;
    }
    this.cdr.detectChanges();
  }

  // ------------- ACTION METHODS -------------
  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewItem(item: BookingItem) {
    if (this.config.type === 'active-bookings') {
      this.router.navigate(['bookings', item.id]);
    } else if (this.config.type === 'recent-budgets') {
      // Load the order into the summary service
      if (item.ID) {
        this.ordersService.getOrderById(item.id).subscribe((orderData) => {
          if (orderData) {
            this.summaryService.updateOrder(orderData);
          }
        });
      }
    } else {
      this.itemSelected.emit(item);
    }
  }

  downloadItem(item: BookingItem) {
    this.downloadLoading[item.id] = true;
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Generando documento...',
    });

    // Choose the appropriate document method based on the component type
    const documentObservable =
      this.config.type === 'active-bookings'
        ? this.notificationsService.getBookingDocument(item.id)
        : this.notificationsService.getBudgetDocument(item.id);

    documentObservable.subscribe({
      next: (response) => {
        this.downloadLoading[item.id] = false;
        if (response.fileUrl) {
          window.open(response.fileUrl, '_blank');
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se obtuvo el URL del documento',
          });
        }
      },
      error: (error) => {
        this.downloadLoading[item.id] = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al generar el documento',
        });
        console.error('Error generating document:', error);
      },
    });
  }

  sendItem(item: BookingItem) {
    this.notificationLoading[item.id] = true;

    if (this.config.type === 'recent-budgets') {
      this.notificationsService
        .sendBudgetNotificationEmail({
          id: item.id,
          email: this.userEmail,
        })
        .subscribe({
          next: (response) => {
            this.notificationLoading[item.id] = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Presupuesto enviado exitosamente',
            });
          },
          error: (error) => {
            this.notificationLoading[item.id] = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al enviar el presupuesto',
            });
            console.error('Error sending budget notification:', error);
          },
        });
    } else if (this.config.type === 'active-bookings') {
      // For active bookings, use the booking notification service
      this.notificationsService
        .sendBookingNotificationEmail({
          id: item.id,
          email: this.userEmail,
        })
        .subscribe({
          next: (response) => {
            this.notificationLoading[item.id] = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Reserva enviada exitosamente',
            });
          },
          error: (error) => {
            this.notificationLoading[item.id] = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al enviar la reserva',
            });
            console.error('Error sending booking notification:', error);
          },
        });
    } else {
      // Logic for sending travel history - fallback to timeout for now
      setTimeout(() => {
        this.notificationLoading[item.id] = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Información de viaje enviada exitosamente',
        });
      }, 1000);
    }
  }

  reserveItem(item: BookingItem) {
    if (this.config.type === 'recent-budgets') {
      this.router.navigate(['/checkout', item.id]);
    }
  }

  trackById(index: number, item: BookingItem): string {
    return item.id;
  }
}
