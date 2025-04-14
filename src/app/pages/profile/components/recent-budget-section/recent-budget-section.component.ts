import {
  Component,
  OnInit,
  Input,
  ChangeDetectorRef,
  NgZone,
  AfterViewInit,
} from '@angular/core';
import { OrdersService } from '../../../../core/services/orders.service';
import { PeriodsService } from '../../../../core/services/periods.service';
import { ToursService } from '../../../../core/services/tours.service';
import { CldImage } from '../../../../core/models/commons/cld-image.model';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { MessageService } from 'primeng/api';
import { SummaryService } from '../../../../core/services/checkout/summary.service';
import { Order, SummaryItem } from '../../../../core/models/orders/order.model';

interface Budget {
  _id: string;
  ID: string;
  title: string;
  budgetNumber: string;
  creationDate: Date;
  status: string;
  departureDate: Date;
  departureName: string;
  passengers: number;
  price: number;
  image: string;
  tourID?: string; // Almacena el identificador del tour para obtener más datos
  summary?: SummaryItem[]; // Add summary items array from older version
  imageLoading: boolean; // Track if image is currently loading
  imageLoaded: boolean; // Track if image has loaded successfully
}

@Component({
  selector: 'app-recent-budget-section',
  standalone: false,
  templateUrl: './recent-budget-section.component.html',
  styleUrls: ['./recent-budget-section.component.scss'],
})
export class RecentBudgetSectionComponent implements OnInit, AfterViewInit {
  budgets: Budget[] = [];
  isExpanded: boolean = true;
  loading: boolean = false;
  @Input() userEmail!: string;
  downloadLoading: { [key: string]: boolean } = {};
  notificationLoading: { [key: string]: boolean } = {};
  currentOrder: Order | null = null; // Added from older version

  constructor(
    private ordersService: OrdersService,
    private periodsService: PeriodsService,
    private toursService: ToursService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router,
    private notificationsService: NotificationsService,
    private messageService: MessageService,
    private summaryService: SummaryService // Added from older version
  ) {}

  // Default placeholder image for error cases
  private getDefaultImage(): string {
    return 'assets/images/placeholder-tour.jpg'; // Update with your default image path
  }

  ngOnInit() {
    this.loading = true;
    this.fetchBudgets();
    this.getCurrentOrderFromSummary(); // Added from older version
  }

  ngAfterViewInit() {}

  // Get current order from summary service (Added from older version)
  getCurrentOrderFromSummary() {
    this.summaryService.order$.subscribe(order => {
      this.currentOrder = order;
    });
  }

  // Formatea la fecha mostrando el día y las 3 primeras letras del mes en español
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

  // Calculate total price from summary items (Added from older version)
  calculateTotalFromSummary(summaryItems: SummaryItem[]): number {
    if (!summaryItems || summaryItems.length === 0) return 0;
    
    return summaryItems.reduce((total, item) => {
      return total + (item.value * item.qty);
    }, 0);
  }

  // Obtiene los presupuestos del usuario
  fetchBudgets() {
    this.ordersService.getOrdersByUser(this.userEmail).subscribe({
      next: (response) => {
        const budgetOrders = response.data.filter(
          (order) => order.status === 'Budget'
        );

        this.budgets = [];

        budgetOrders.forEach((order) => {
          const periodId = order.periodID;
          if (periodId) {
            this.periodsService.getPeriodDetail(periodId, ['all']).subscribe({
              next: (periodData) => {
                const budget = this.createBudgetWithPeriodData(order, periodData);
                
                // Add summary data if available (Added from older version)
                if (order.summary) {
                  budget.summary = order.summary;
                }

                this.ngZone.run(() => {
                  this.budgets.push(budget);
                  this.budgets = [...this.budgets]; // Nueva referencia para forzar actualización
                  this.budgets.sort(
                    (a, b) => b.creationDate.getTime() - a.creationDate.getTime()
                  );
                  this.cdr.detectChanges();

                  if (budget.tourID) {
                    this.loadBudgetImage(budget);
                  }
                });
              },
              error: (error) => {
                const budget = this.createBudgetFromOrder(order);
                
                // Add summary data if available (Added from older version)
                if (order.summary) {
                  budget.summary = order.summary;
                }

                this.ngZone.run(() => {
                  this.budgets.push(budget);
                  this.budgets = [...this.budgets];
                  this.budgets.sort(
                    (a, b) => b.creationDate.getTime() - a.creationDate.getTime()
                  );
                  this.cdr.detectChanges();
                });
              }
            });
          } else {
            const budget = this.createBudgetFromOrder(order);
            
            // Add summary data if available (Added from older version)
            if (order.summary) {
              budget.summary = order.summary;
            }

            this.ngZone.run(() => {
              this.budgets.push(budget);
              this.budgets = [...this.budgets];
              this.budgets.sort(
                (a, b) => b.creationDate.getTime() - a.creationDate.getTime()
              );
              this.cdr.detectChanges();
            });
          }
        });
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
      }
    });
  }

  // Crea un presupuesto base con los datos mínimos de la orden
  private createBaseBudget(order: any): Budget {
    const passengers = this.getPassengerCount(order);
    
    // Calculate price from summary if available
    let calculatedPrice = order.price || 0;
    if (order.summary && order.summary.length > 0) {
      calculatedPrice = this.calculateTotalFromSummary(order.summary);
    }

    return {
      _id: order._id,
      ID: order.ID || order.id || '',
      title: 'Sin información del tour',
      budgetNumber: order.id || '',
      creationDate: new Date(order.createdAt || Date.now()),
      status: order.status,
      departureName: '',
      departureDate: new Date(order.createdAt || Date.now()),
      passengers: passengers,
      price: calculatedPrice,
      image: this.getDefaultImage(),
      tourID: '',
      summary: order.summary || [], // Added from older version
      imageLoading: true, // Initially in loading state
      imageLoaded: false // Not loaded yet
    };
  }

  // Función de depuración específica para pasajeros
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

  // Crea un presupuesto con datos adicionales del período
  private createBudgetWithPeriodData(order: any, periodData: any): Budget {
    const budget = this.createBaseBudget(order);

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

  // Crea un presupuesto solo con datos de la orden (cuando no hay período)
  private createBudgetFromOrder(order: any): Budget {
    return this.createBaseBudget(order);
  }

  // Carga la imagen y el precio real del tour asociado al presupuesto
  async loadBudgetImage(budget: Budget) {
    if (!budget.tourID) {
      // If no tourID, end loading and use default image
      budget.imageLoading = false;
      budget.imageLoaded = false;
      budget.image = this.getDefaultImage();
      this.cdr.detectChanges();
      return;
    }
    
    // Start loading indicator
    budget.imageLoading = true;
    budget.imageLoaded = false;
    
    try {
      const tourData = await this.getTourData(budget.tourID);
      
      // Check if we have a valid image URL
      if (tourData.image && tourData.image.url) {
        budget.image = tourData.image.url;
        
        // Create a new Image object to preload the image
        const img = new Image();
        img.onload = () => {
          budget.imageLoading = false;
          budget.imageLoaded = true;
          this.cdr.detectChanges();
        };
        
        img.onerror = () => {
          budget.image = this.getDefaultImage();
          budget.imageLoading = false;
          budget.imageLoaded = false;
          this.cdr.detectChanges();
        };
        
        img.src = budget.image;
      } else {
        budget.image = this.getDefaultImage();
        budget.imageLoading = false;
        budget.imageLoaded = false;
        this.cdr.detectChanges();
      }
      
      // REMOVED: Price calculation logic to avoid changing price after initial load
    } catch (error) {
      budget.image = this.getDefaultImage();
      budget.imageLoading = false;
      budget.imageLoaded = false;
      this.cdr.detectChanges();
    }
  }

  // Obtiene los datos del tour (imagen y precio)
  getTourData(
    id: string
  ): Promise<{ image: CldImage | null; price: number | null }> {
    return new Promise((resolve) => {
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
          resolve({ image: null, price: null });
        },
      });
    });
  }

  // Carga las imágenes para todos los presupuestos
  loadTourImages() {
    this.budgets.forEach((budget) => {
      if (budget.tourID) {
        this.loadBudgetImage(budget);
      }
    });
  }

  // Maneja errores de carga de imagen
  imageLoadError(budget: Budget): void {
    budget.image = this.getDefaultImage();
    budget.imageLoading = false;
    budget.imageLoaded = false;
    this.cdr.detectChanges();
  }

  // Alternar la vista expandida/contraída
  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  // Manejar la acción de ver un presupuesto (Updated from older version)
  viewBudget(budget: Budget) {
    // Load the order into the summary service
    if (budget.budgetNumber) {
      this.ordersService.getOrderById(budget.budgetNumber).subscribe(orderData => {
        if (orderData) {
          this.summaryService.updateOrder(orderData);
        }
      });
    }
  }

  // Nuevo método para descargar presupuesto
  downloadBudget(budget: Budget) {
    this.downloadLoading[budget._id] = true;
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Generando documento...',
    });

    this.notificationsService.getBudgetDocument(budget._id).subscribe({
      next: (response) => {
        this.downloadLoading[budget._id] = false;
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
        this.downloadLoading[budget._id] = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al generar el documento',
        });
      },
    });
  }

  // Nuevo método para enviar notificación de presupuesto
  sendBudgetNotification(budget: Budget) {
    this.notificationLoading[budget._id] = true;
    this.notificationsService
      .sendBudgetNotificationEmail({
        id: budget._id,
        email: this.userEmail,
      })
      .subscribe({
        next: (response) => {
          this.notificationLoading[budget._id] = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Presupuesto enviado exitosamente',
          });
        },
        error: (error) => {
          this.notificationLoading[budget._id] = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al enviar el presupuesto',
          });
        },
      });
  }

  // Nuevo método para reservar: redirige a /checkout/:id
  reserveBudget(budget: Budget) {
    this.router.navigate(['/checkout', budget._id]);
  }
}