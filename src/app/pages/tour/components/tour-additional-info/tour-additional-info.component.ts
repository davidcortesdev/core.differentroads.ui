import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-tour-additional-info',
  standalone: false,
  templateUrl: './tour-additional-info.component.html',
  styleUrl: './tour-additional-info.component.scss',
  providers: [MessageService] // Añadir MessageService al componente
})
export class TourAdditionalInfoComponent implements OnInit, OnDestroy {
  @ViewChild(BudgetDialogComponent) budgetDialog!: BudgetDialogComponent;
  
  tour: Tour | null = null;
  visible: boolean = false;
  private subscription: Subscription = new Subscription();
  isAuthenticated: boolean = false;
  loginDialogVisible: boolean = false;
  userEmail: string = '';
  loading: boolean = false;
  
  // Flag para indicar si limpiar los campos del formulario
  shouldClearFields: boolean = false;

  // Optimización: Extraer configuraciones a propiedades
  dialogBreakpoints = { '1199px': '80vw', '575px': '90vw' };
  dialogStyle = { width: '50vw' };

  // Optimización: Getters para simplificar la plantilla
  get infoCards(): any[] {
    return this.tour?.['extra-info-section']?.['info-card'] || [];
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
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadTourData();

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

    // Verificamos si hay información en localStorage relacionada con Cognito
    Object.keys(localStorage).forEach(key => {
      if (key.includes('Cognito') || key.includes('cognito') || key.includes('aws') || key.includes('AWS')) {
        // No hacemos console.log, solo conservamos la lógica
      }
    });
    
    // Y también en sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('Cognito') || key.includes('cognito') || key.includes('aws') || key.includes('AWS') || key === 'redirectUrl') {
        // No hacemos console.log, solo conservamos la lógica
      }
    });
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
      const tourSubscription = this.toursService
        .getTourDetailBySlug(slug, ['extra-info-section'])
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
      this.savePresupuestoDirectamente();
    } else {
      // User is not authenticated, save URL and show login dialog
      const currentUrl = window.location.pathname;
      sessionStorage.setItem('redirectUrl', currentUrl);
      this.loginDialogVisible = true; // SOLO aquí se activa el modal de login
    }
  }

  // Método para guardar el presupuesto directamente sin abrir el modal
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

    // Subscribirse a los datos necesarios
    const periodSubscription = this.tourOrderService.selectedDateInfo$.subscribe(dateInfo => {
      selectedPeriod = dateInfo;
    });
    
    const travelersSubscription = this.tourOrderService.selectedTravelers$.subscribe(travelersData => {
      travelers = travelersData;
    });

    this.subscription.add(periodSubscription);
    this.subscription.add(travelersSubscription);

    // Información del viajero (usando datos del usuario logueado)
    const travelerInfo = {
      name: 'Usuario Registrado',
      email: this.userEmail,
      phone: ''
    };

    // Crear la orden
    this.tourOrderService
      .createOrder({
        periodID: selectedPeriod?.periodID || '',
        status: 'Budget',
        owner: this.userEmail,
        traveler: travelerInfo,
      })
      .subscribe({
        next: (createdOrder) => {
          this.loading = false;
          
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