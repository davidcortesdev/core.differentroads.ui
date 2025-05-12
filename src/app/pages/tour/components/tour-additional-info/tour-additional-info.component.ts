import { Component, OnInit, OnDestroy, ViewChild, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Tour } from '../../../../core/models/tours/tour.model';
import { ToursService } from '../../../../core/services/tours.service';
import { AuthenticateService } from '../../../../core/services/auth-service.service';
import { BudgetDialogComponent } from '../../../../shared/components/budget-dialog/budget-dialog.component';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { TourDataService } from '../../../../core/services/tour-data/tour-data.service';
import { TourOrderService } from '../../../../core/services/tour-data/tour-order.service';
import { MessageService } from 'primeng/api';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
import { Order } from '../../../../core/models/orders/order.model';
import { OrdersService } from '../../../../core/services/orders.service';
import { SummaryService } from '../../../../core/services/checkout/summary.service';

@Component({
  selector: 'app-tour-additional-info',
  standalone: false,
  templateUrl: './tour-additional-info.component.html',
  styleUrl: './tour-additional-info.component.scss',
  providers: [MessageService] // Añadir MessageService al componente
})
export class TourAdditionalInfoComponent implements OnInit, OnDestroy {
  @ViewChild(BudgetDialogComponent) budgetDialog!: BudgetDialogComponent;
  
  // Nuevos inputs para poder recibir datos del checkout si está disponible
  @Input() existingOrder: Order | null = null;
  @Input() tourName: string = '';
  @Input() periodName: string = '';
  @Input() periodDates: string = '';
  @Input() selectedFlight: any = null;
  @Input() travelersSelected: any = { adults: 0, childs: 0, babies: 0 };
  @Input() periodID: string = '';
  @Input() isAuthenticated: boolean = false;
  
  tour: Tour | null = null;
  visible: boolean = false;
  private subscription: Subscription = new Subscription();
  loginDialogVisible: boolean = false;
  userEmail: string = '';
  loading: boolean = false;
  
  // Flag para indicar si limpiar los campos del formulario
  shouldClearFields: boolean = false;

  // Flag para indicar si estamos en modo actualización (checkout) o creación (tour detail)
  get isUpdateMode(): boolean {
    return !!this.existingOrder;
  }

  // Optimización: Extraer configuraciones a propiedades
  dialogBreakpoints = { '1199px': '80vw', '575px': '90vw' };
  dialogStyle = { width: '50vw' };

  // Optimización: Getters para simplificar la plantilla
  get infoCards(): any[] {
    
    // Crear un array vacío para las tarjetas de información
    let cards = [];
    
    // Verificar si existe la propiedad tripIncludes en info-practica
    const tripIncludes = this.tour?.['info-practica']?.['tripIncludes'];
    
    // Verificar si existe la propiedad extraInformation en info-practica
    const extraInfo = this.tour?.['info-practica']?.['extraInformation'];
    
    // Array para almacenar las nuevas tarjetas
    const newCards = [];
    
    // Si existe tripIncludes, crear un nuevo objeto y añadirlo
    if (tripIncludes) {
      const includesCard = {
        title: "¿Que incluye el viaje?",
        content: tripIncludes,
        order: 1
      };
      
      newCards.push(includesCard);
    }
    
    // Si existe extraInformation, crear un nuevo objeto y añadirlo
    if (extraInfo) {
      const extraInfoCard = {
        title: "Información del viaje",
        content: extraInfo,
        order: 2
      };
      
      newCards.push(extraInfoCard);
    }
    
    // Usar solo las nuevas tarjetas
    cards = newCards;
    
    return cards;
  }

  get hasInfoCards(): boolean {
    return this.infoCards.length > 0;
  }

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private toursService: ToursService,
    private authService: AuthenticateService,
    private router: Router,
    private notificationsService: NotificationsService,
    private tourDataService: TourDataService,
    private tourOrderService: TourOrderService,
    private messageService: MessageService,
    private ordersService: OrdersService,
    private summaryService: SummaryService
  ) {}

  ngOnInit(): void {
    // Solo cargar datos del tour si no estamos en modo actualización
    if (!this.isUpdateMode) {
      this.loadTourData();
    }

    // Inicializamos el estado de autenticación sin mostrar modales
    const authSubscription = this.authService.isLoggedIn().subscribe({
      next: (isAuthenticated) => {
        this.isAuthenticated = isAuthenticated;
        
        // Si el usuario está autenticado, obtener su email
        if (isAuthenticated) {
          this.getUserEmail();
          
          // También verificamos con el método getCurrentUser de cognito directamente
          const cognitoCurrentUser = this.authService.getCurrentUser();
          
          // Obtener el nombre de usuario actual
          const currentUsername = this.authService.getCurrentUsername();
          
          // Intentar obtener los atributos del usuario completos
          this.getUserAttributes();
        }
      },
      error: (error) => {
        // Manejo silencioso del error
      },
      complete: () => {
        // Completado
      }
    });

    this.subscription.add(authSubscription);
  }

  // Método para obtener el email del usuario
  private getUserEmail(): void {
    const emailSubscription = this.authService.getUserEmail().subscribe({
      next: (email) => {
        this.userEmail = email;
        
        // Intentar obtener más información del usuario si está disponible
        this.tryGetAdditionalUserInfo();
      },
      error: (error) => {
        // Manejo silencioso del error
      },
      complete: () => {
        // Completado
      }
    });

    this.subscription.add(emailSubscription);
  }

  // Método para obtener atributos del usuario de Cognito
  private getUserAttributes(): void {
    const attributesSubscription = this.authService.getUserAttributes().subscribe({
      next: (attributes) => {
        // Procesamiento silencioso de los atributos
      },
      error: (error) => {
        // Manejo silencioso del error
      },
      complete: () => {
        // Completado
      }
    });
    this.subscription.add(attributesSubscription);
  }
  
  // Método para intentar obtener información adicional del usuario
  private tryGetAdditionalUserInfo(): void {
    // Verificar si hay un usuario en el pool de Cognito
    try {
      const userPool = new CognitoUserPool({
        UserPoolId: 'us-east-1_7g4sL6XLN', // Puedes obtener esto desde environment.cognitoUserPoolId
        ClientId: '5hfu0oe9jrsgbvb7rjn76jrrn6' // Puedes obtener esto desde environment.cognitoAppClientId
      });
      
      const currentUser = userPool.getCurrentUser();
      
      if (currentUser) {
        currentUser.getSession((err: any, session: any) => {
          if (err) {
            return;
          }
          
          // No hacemos console.log de los tokens ni la sesión
        });
      }
    } catch (error) {
      // Manejo silencioso del error
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadTourData(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      // Obtener el parámetro filterByStatus de los query params
      const filterByStatus = this.route.snapshot.queryParamMap.get('filterByStatus') !== 'false';
      
      const tourSubscription = this.toursService
        .getTourDetailBySlug(slug, ['extra-info-section','info-practica'], filterByStatus)
        .subscribe({
          next: (tour) => {
            if (tour && tour['extra-info-section']?.['info-card']) {
              tour['extra-info-section']['info-card'].sort(
                (a, b) => parseInt(a.order) - parseInt(b.order)
              );
            }
            this.tour = tour;
          },
          error: (error) => {
            // Manejo silencioso del error
          },
        });

      this.subscription.add(tourSubscription);
    }
  }

  handleSaveTrip(): void {
    // En lugar de usar la suscripción para determinar si mostrar el modal,
    // simplemente verificamos el estado actual
    if (this.isAuthenticated) {
      // User is authenticated, guardar el presupuesto directamente
      if (this.isUpdateMode) {
        // En modo actualización (desde checkout)
        console.log('Actualizando presupuesto...');
        this.actualizarPresupuestoDirectamente();
      } else {
        // En modo creación (desde tour detail)
        console.log('Guardando presupuesto...');
        this.savePresupuestoDirectamente();
      }
    } else {
      // User is not authenticated, save URL and show login dialog
      const currentUrl = window.location.pathname;
      sessionStorage.setItem('redirectUrl', currentUrl);
      this.loginDialogVisible = true; // SOLO aquí se activa el modal de login
    }
  }

  // Método original para guardar presupuesto (crear nueva orden)
  savePresupuestoDirectamente(): void {
    // Verificar que tenemos la información necesaria
    if (!this.userEmail) {
      this.showErrorToast('No se pudo obtener la información del usuario. Por favor, inténtalo de nuevo.');
      return;
    }

    this.loading = true;

    // Obtener información sobre periodo seleccionado y viajeros
    let selectedPeriod: any;
    let travelers: any;
    let totalPrice: number = 0;

    // Subscribirse a los datos necesarios
    const periodSubscription = this.tourOrderService.selectedDateInfo$.subscribe(dateInfo => {
      selectedPeriod = dateInfo;
    });
    
    const travelersSubscription = this.tourOrderService.selectedTravelers$.subscribe(travelersData => {
      travelers = travelersData;
    });

    const priceSubscription = this.tourOrderService.getTotalPrice().subscribe(price => {
      totalPrice = price;
    });

    this.subscription.add(periodSubscription);
    this.subscription.add(travelersSubscription);
    this.subscription.add(priceSubscription);

    // Información del viajero (usando datos del usuario logueado)
    const travelerInfo = {
      name: 'Usuario Registrado',
      email: this.userEmail,
      phone: ''
    };

    // Agregar console.log para ver los datos
    console.log('Datos a enviar en la orden:', {
      periodID: selectedPeriod?.periodID || '',
      status: 'Budget',
      owner: this.userEmail,
      traveler: travelerInfo,
      price: totalPrice,
    });

    // Crear la orden
    this.tourOrderService
      .createOrder({
        periodID: selectedPeriod?.periodID || '',
        status: 'Budget',
        owner: this.userEmail,
        traveler: travelerInfo,
        price: totalPrice,
      })
      .subscribe({
        next: (createdOrder) => {
          this.loading = false;
          console.log('Orden creada:', createdOrder);
          // Mostrar mensaje de éxito con Toast
          this.showSuccessToast('Presupuesto guardado correctamente');
        },
        error: (error) => {
          this.loading = false;
          
          // Mostrar mensaje de error con Toast
          this.showErrorToast('Ha ocurrido un error al guardar el presupuesto. Por favor, inténtalo de nuevo.');
        },
      });
  }

  // Nuevo método para actualizar presupuesto (actualizar orden existente)
  actualizarPresupuestoDirectamente(): void {
    // Verificar que tenemos la información necesaria
    if (!this.userEmail) {
      this.showErrorToast('No se pudo obtener la información del usuario. Por favor, inténtalo de nuevo.');
      return;
    }

    if (!this.existingOrder || !this.existingOrder._id) {
      this.showErrorToast('No se encontró información de la orden existente.');
      return;
    }

    this.loading = true;

    // Obtener la orden actual del servicio de resumen o usar la existente
    const currentOrder = this.summaryService.getOrderValue() || this.existingOrder;
    
    // Crear una copia del objeto para no modificar el original
    const updatedOrder = { ...currentOrder };
    
    // Actualizar SOLO las propiedades que necesitamos cambiar
    updatedOrder.status = 'Budget';
    updatedOrder.owner = this.userEmail;
    
    // Verificar que tenemos el ID necesario
    if (!updatedOrder._id) {
      this.showErrorToast('No se pudo identificar la orden para actualizar.');
      this.loading = false;
      return;
    }

    // Actualizar la orden existente 
    this.ordersService
      .updateOrder(updatedOrder._id, updatedOrder)
      .subscribe({
        next: (response) => {
          this.loading = false;
          // Mostrar mensaje de éxito (sin enviar notificación por correo)
          this.showSuccessToast('Presupuesto guardado correctamente');
        },
        error: (error) => {
          this.loading = false;
          this.showErrorToast('Ha ocurrido un error al guardar el presupuesto. Por favor, inténtalo de nuevo.');
          console.error('Error al actualizar la orden:', error);
        },
      });
  }

  // Helper method para construir los productos a partir de la orden actual
  buildProductsFromOrder(order: any): any[] {
    if (!order.summary || order.summary.length === 0) {
      return [];
    }

    return order.summary.map((item: any) => {
      return {
        id: '',
        name: item.description,
        price: item.value,
        qty: item.qty,
        total: item.value * item.qty,
      };
    });
  }

  // Métodos para mostrar mensajes Toast
  showSuccessToast(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: '¡Éxito!',
      detail: message,
      life: 3000
    });
  }

  showErrorToast(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000
    });
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
  }

  handleCloseModal(): void {
    // Asegurar que el modal se cierra correctamente
    this.visible = false;
    // Importante: Restablecer shouldClearFields después de cerrar el modal
    setTimeout(() => {
      this.shouldClearFields = false;
    }, 100);
  }

  handleDownloadTrip(): void {
    // Explícitamente establecer en falso para asegurar que mantenga los datos
    this.shouldClearFields = false;
    this.visible = true;
  }

  // Modificado para que abra el mismo modal que Descargar pero con campos vacíos
  handleInviteFriend(): void {
    // Activar el flag para limpiar campos
    this.shouldClearFields = true;
    // Mostrar el modal
    this.visible = true;
  }

  // Add methods to handle login modal
  closeLoginModal(): void {
    this.loginDialogVisible = false;
  }

  navigateToLogin(): void {
    this.closeLoginModal();
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.closeLoginModal();
    this.router.navigate(['/sign-up']);
  }
}