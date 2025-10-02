import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Tour, Flight } from '../../../core/models/tours/tour.model';
import { NotificationsService } from '../../../core/services/notifications.service';
import { OrdersService } from '../../../core/services/orders.service';
import { TourDataService } from '../../../core/services/tour-data/tour-data.service';
import {
  DateInfo,
  TourOrderService,
} from '../../../core/services/tour-data/tour-order.service';
import { SummaryService } from '../../../core/services/checkout/summary.service';
// Importamos los servicios de autenticación y usuarios
import { AuthenticateService } from '../../../core/services/auth-service.service';
import { UsersService } from '../../../core/services/users.service';
import { Subscription } from 'rxjs';
// Importamos MessageService para los Toast
import { MessageService } from 'primeng/api';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-budget-dialog',
  standalone: false,
  templateUrl: './budget-dialog.component.html',
  styleUrl: './budget-dialog.component.scss',
  // Agregamos MessageService a los providers del componente
  providers: [MessageService]
})
export class BudgetDialogComponent implements OnInit, OnDestroy, OnChanges {
  @Input() visible: boolean = false;
  @Input() handleCloseModal: () => void = () => {};
  @Output() close = new EventEmitter<void>();
  
  // Input para indicar si se deben limpiar los campos
  @Input() shouldClearFields: boolean = false;

  // New inputs for flexible usage
  @Input() existingOrderId: string | null = null;
  @Input() tourName: string | null = null;
  @Input() periodName: string | null = null;
  @Input() periodDates: string | null = null;
  @Input() departureCity: string | null = null;
  @Input() tripType: string | null = null;
  @Input() travelersCount: {
    adults: number;
    children: number;
    babies: number;
  } | null = null;
  @Input() periodId: string | null = null;

  travelers: {
    adults: number;
    children: number;
    babies: number;
  } = {
    adults: 1,
    children: 0,
    babies: 0,
  };

  tour: Tour | null = null;
  tourData: Tour | null = null;
  traveler = {
    name: '',
    email: '',
    phone: '',
  };

  travelerErrors = {
    name: false,
    email: false,
    phone: false,
  };

  flights: Flight[] = [];
  selectedPeriod: DateInfo | null = null;
  loading: boolean = false;
  isAuthenticated: boolean = false;
  
  // Flag interno para controlar si ya se ha inicializado
  private initialized: boolean = false;
  
  // Subscripción para gestionar todas las suscripciones
  private subscription: Subscription = new Subscription();
  
  // Bandera para controlar cuándo se deben enviar correos
  private shouldSendEmails: boolean = false;

  constructor(
    private sanitizer: DomSanitizer,
    private tourDataService: TourDataService,
    private tourOrderService: TourOrderService,
    private ordersService: OrdersService,
    private notificationsService: NotificationsService,
    private summaryService: SummaryService,
    private authService: AuthenticateService, // Inyectamos servicio de autenticación
    private usersService: UsersService, // Inyectamos servicio de usuarios
    private messageService: MessageService, // Inyectamos MessageService para los toast
    private analyticsService: AnalyticsService // Inyectamos servicio de analytics
  ) {}

  ngOnInit(): void {
    this.initialized = true;
    
    // La bandera comienza en false (no enviar correos)
    this.shouldSendEmails = false;
    
    // Cargar datos del tour y periodo seleccionado
    this.loadTourData();
    
    // Si no debemos limpiar los campos, verificamos autenticación
    if (!this.shouldClearFields) {
      this.checkAuthAndLoadUserData();
    } else {
      // Si shouldClearFields es true, limpiar los campos
      this.resetTravelerForm();
    }
  }
  
  // Cargar datos del tour y viajeros de los servicios
  private loadTourData(): void {
    // If we don't have inputs, use the service data (tour detail page)
    if (!this.existingOrderId) {
      const periodSubscription = this.tourOrderService.selectedDateInfo$.subscribe((dateInfo) => {
        this.selectedPeriod = dateInfo;
      });
      this.subscription.add(periodSubscription);

      const tourSubscription = this.tourDataService.tour$.subscribe((tour) => {
        this.tourData = tour;
      });
      this.subscription.add(tourSubscription);

      const travelersSubscription = this.tourOrderService.selectedTravelers$.subscribe((travelers) => {
        this.travelers = travelers;
      });
      this.subscription.add(travelersSubscription);
    } else {
      // Use input values passed from checkout (override service values)
      if (this.travelersCount) {
        this.travelers = this.travelersCount;
      }
    }
  }
  
  // Implementamos OnChanges para detectar cambios en shouldClearFields
  ngOnChanges(changes: SimpleChanges): void {
    // Solo ejecutar si ya está inicializado
    if (!this.initialized) return;
    
    // Si cambia shouldClearFields
    if (changes['shouldClearFields']) {
      if (this.shouldClearFields) {
        this.resetTravelerForm();
      } else if (this.isAuthenticated) {
        // Solo cargar datos del usuario si está autenticado y no debemos limpiar campos
        this.getUserEmailAndData();
      }
    }
    
    // Si cambia visible a true, verificar si debemos limpiar campos
    if (changes['visible'] && changes['visible'].currentValue === true) {
      if (this.shouldClearFields) {
        this.resetTravelerForm();
      }
    }
  }
  
  // Método para resetear el formulario
  private resetTravelerForm(): void {
    this.traveler = {
      name: '',
      email: '',
      phone: ''
    };
    
    // Resetear errores
    this.travelerErrors = {
      name: false,
      email: false,
      phone: false
    };
  }
  
  // Método para verificar autenticación y cargar datos del usuario
  private checkAuthAndLoadUserData(): void {
    const authSubscription = this.authService.isLoggedIn().subscribe({
      next: (isAuthenticated) => {
        this.isAuthenticated = isAuthenticated;
        
        if (isAuthenticated && !this.shouldClearFields) {
          this.getUserEmailAndData();
        }
      },
      error: (error) => {
        // Manejo silencioso del error
      }
    });
    
    this.subscription.add(authSubscription);
  }
  
  // Método para obtener el email y datos del usuario
  private getUserEmailAndData(): void {
    const emailSubscription = this.authService.getUserEmail().subscribe({
      next: (email) => {
        if (email && !this.shouldClearFields) {
          // Prellenar el campo de email
          this.traveler.email = email;
          
          // Obtener datos completos del usuario
          this.getUserDataByEmail(email);
        }
      },
      error: (error) => {
        // Manejo silencioso del error
      }
    });
    
    this.subscription.add(emailSubscription);
  }
  
  // Método para obtener datos completos del usuario por email
  private getUserDataByEmail(email: string): void {
    const userDataSubscription = this.usersService.getUserByEmail(email).subscribe({
      next: (userData) => {
        // Prellenar los campos del formulario con los datos del usuario si no debemos limpiarlos
        if (userData && !this.shouldClearFields) {
          this.traveler.name = userData.names ? `${userData.names} ${userData.lastname || ''}` : '';
          this.traveler.phone = userData.phone ? userData.phone.toString() : '';
        }
      },
      error: (error) => {
        // Manejo silencioso del error
      }
    });
    
    this.subscription.add(userDataSubscription);
  }

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones
    this.subscription.unsubscribe();
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  saveTrip() {
    if (!this.validateForm()) {
      this.showErrorToast('Por favor, completa todos los campos obligatorios.');
      return;
    }
    this.loading = true;
    
    // Activar la bandera para permitir el envío de correos
    this.shouldSendEmails = true;

    if (this.existingOrderId) {
      this.updateExistingOrder();
    } else {
      this.createOrder();
    }
  }

  validateForm(): boolean {
    this.travelerErrors.name = !this.traveler.name;
    this.travelerErrors.email = !this.traveler.email;
    this.travelerErrors.phone = !this.traveler.phone;

    return (
      !this.travelerErrors.name &&
      !this.travelerErrors.email &&
      !this.travelerErrors.phone
    );
  }

  // Método para mostrar Toast de éxito
  showSuccessToast(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: '¡Éxito!',
      detail: message,
      life: 5000
    });
  }

  // Método para mostrar Toast de error
  showErrorToast(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000
    });
  }

  // Method for updating existing order (checkout page)
  updateExistingOrder(): void {
    if (!this.existingOrderId) return;

    this.loading = true;

    // Get the current order directly from the summary service
    const orderToUpdate = this.summaryService.getOrderValue();

    if (!orderToUpdate) {
      this.loading = false;
      this.showErrorToast('No se encontró la orden para actualizar');
      return;
    }

    // Update only the budget-specific fields
    orderToUpdate.status = 'Budget';

    // Calcular el precio total a partir del resumen
    if (orderToUpdate.summary && orderToUpdate.summary.length > 0) {
      const totalPrice = orderToUpdate.summary.reduce((sum, item) => {
        return sum + (item.value * item.qty);
      }, 0);
      
      // Asegurarse de que el precio se actualice
      orderToUpdate.price = totalPrice;
    }

    // Use the same pattern as checkout.updateOrder()
    this.ordersService.updateOrder(orderToUpdate._id, orderToUpdate).subscribe({
      next: (response) => {
        // Construir los productos a partir del summary de la orden
        const products = this.buildProductsFromOrder(orderToUpdate);

        // Solo enviar correo si la bandera está activa
        if (this.shouldSendEmails) {
          // Send budget notification email with the constructed products
          this.notificationsService
            .sendBudgetNotificationEmail({
              id: this.existingOrderId!,
              email: this.traveler.email,
              products: products,
            })
            .subscribe({
              next: (response) => {
                this.loading = false;
                this.showSuccessToast('¡Presupuesto enviado correctamente a tu correo!');
                
                // Disparar evento contact_form cuando el envío sea exitoso
                this.trackContactForm();
                
                setTimeout(() => {
                  if (this.handleCloseModal) {
                    this.handleCloseModal();
                  }
                  this.close.emit();
                }, 1500);
                
                // Resetear la bandera después del envío
                this.shouldSendEmails = false;
              },
              error: (error) => {
                this.loading = false;
                this.showErrorToast('Error al enviar la notificación del presupuesto');
                // Resetear la bandera en caso de error
                this.shouldSendEmails = false;
              },
            });
        } else {
          // Si no debemos enviar correos, simplemente finalizamos
          this.loading = false;
          // Cerramos el modal sin mostrar mensaje
          setTimeout(() => {
            if (this.handleCloseModal) {
              this.handleCloseModal();
            }
            this.close.emit();
          }, 500);
        }
      },
      error: (error) => {
        this.loading = false;
        this.showErrorToast('Error al actualizar la orden');
        // Resetear la bandera en caso de error
        this.shouldSendEmails = false;
      },
    });
  }

  // Helper method to build products array from order summary
  buildProductsFromOrder(order: any): any[] {
    if (!order.summary || order.summary.length === 0) {
      return [];
    }

    return order.summary.map((item: any) => {
      return {
        id: '', // No tenemos ID específico en el resumen
        name: item.description,
        singlePrice: item.value,
        units: item.qty,
      };
    });
  }

  // Original method for creating new order (tour detail page)
  createOrder(): void {
    if (!this.validateForm()) {
      this.showErrorToast('Por favor, completa todos los campos obligatorios.');
      return;
    }
    this.loading = true;

    // Primero calculamos el precio total de los productos
    this.tourOrderService.getTotalPrice().subscribe({
      next: (totalPrice) => {
        // Ahora creamos la orden con el precio total calculado
        this.tourOrderService
          .createOrder({
            periodID: this.selectedPeriod?.periodID || '',
            status: 'Budget',
            owner: this.traveler.email,
            traveler: this.traveler,
            price: totalPrice, // Añadimos el precio total aquí
          })
          .subscribe({
            next: (createdOrder) => {
              // Use the new method to build products
              this.tourOrderService
                .buildOrderProducts(this.travelers, this.selectedPeriod)
                .subscribe({
                  next: (products) => {
                    // Solo enviar correo si la bandera está activa
                    if (this.shouldSendEmails) {
                      // Send budget notification email
                      this.notificationsService
                        .sendBudgetNotificationEmail({
                          id: createdOrder._id,
                          email: this.traveler.email,
                          products,
                        })
                        .subscribe({
                          next: (response) => {
                            this.loading = false;
                            this.showSuccessToast('¡Presupuesto enviado correctamente a tu correo!');
                            
                            // Disparar evento contact_form cuando el envío sea exitoso
                            this.trackContactForm();
                            
                            setTimeout(() => {
                              if (this.handleCloseModal) {
                                this.handleCloseModal();
                              }
                              this.close.emit();
                            }, 1500);
                            
                            // Resetear la bandera después del envío
                            this.shouldSendEmails = false;
                          },
                          error: (error) => {
                            this.loading = false;
                            this.showErrorToast('Error al enviar la notificación del presupuesto');
                            // Resetear la bandera en caso de error
                            this.shouldSendEmails = false;
                          },
                        });
                    } else {
                      // Si no debemos enviar correos, simplemente finalizamos
                      this.loading = false;
                      // Cerramos el modal sin mostrar mensaje
                      setTimeout(() => {
                        if (this.handleCloseModal) {
                          this.handleCloseModal();
                        }
                        this.close.emit();
                      }, 500);
                    }
                  },
                  error: (error) => {
                    this.loading = false;
                    this.showErrorToast('Error al construir los productos para el presupuesto');
                    // Resetear la bandera en caso de error
                    this.shouldSendEmails = false;
                  }
                });
            },
            error: (error) => {
              this.loading = false;
              this.showErrorToast('Error al crear la orden');
              // Resetear la bandera en caso de error
              this.shouldSendEmails = false;
            },
          });
      },
      error: (error) => {
        this.loading = false;
        this.showErrorToast('Error al calcular el precio total');
        this.shouldSendEmails = false;
      }
    });
  }

  getTravelersText() {
    if (this.existingOrderId && this.travelersCount) {
      // Custom formatting for checkout page
      const { adults, children, babies } = this.travelersCount;
      let text = '';

      if (adults > 0) {
        text += `${adults} adulto${adults > 1 ? 's' : ''}`;
      }

      if (children > 0) {
        text += text ? ', ' : '';
        text += `${children} niño${children > 1 ? 's' : ''}`;
      }

      if (babies > 0) {
        text += text ? ', ' : '';
        text += `${babies} bebé${babies > 1 ? 's' : ''}`;
      }

      return text;
    }

    // Original method for tour detail page
    return this.tourOrderService.getTravelersText();
  }

  // Helper method to get tour name
  getDisplayTourName(): string {
    return this.tourName || this.tourData?.name || '';
  }

  // Helper method to get period dates
  getDisplayPeriodDate(): string {
    return this.periodDates || this.selectedPeriod?.date || '';
  }

  // Helper method to get departure city
  getDisplayDepartureCity(): string {
    const city = this.departureCity || this.selectedPeriod?.departureCity || '';

    if (city.toLowerCase().includes('sin')) {
      return 'Sin vuelos';
    } else if (city.toLowerCase().includes('vuelo')) {
      return city;
    } else {
      return 'Desde ' + city;
    }
  }

  // Helper method to get trip type
  getDisplayTripType(): string {
    return this.tripType || this.selectedPeriod?.tripType || '';
  }

  /**
   * Disparar evento generated_lead (contact_form) cuando el formulario de contacto se envíe con éxito
   */
  private trackContactForm(): void {
    this.analyticsService.generatedLead(
      'ficha_tour',
      this.analyticsService.getUserData(
        this.traveler.email,
        this.traveler.phone,
        this.authService.getCognitoIdValue()
      )
    );
  }
}