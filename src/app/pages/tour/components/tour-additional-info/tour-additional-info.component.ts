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
        }
      },
    });

    this.subscription.add(authSubscription);
  }

  // Método para obtener el email del usuario
  private getUserEmail(): void {
    const emailSubscription = this.authService.getUserEmail().subscribe({
      next: (email) => {
        this.userEmail = email;
        console.log('Email del usuario logueado:', email);
      },
      error: (error) => {
        console.error('Error al obtener el email del usuario:', error);
      }
    });

    this.subscription.add(emailSubscription);
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
            console.error('Error loading tour data:', error);
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
      console.error('No se pudo obtener el email del usuario');
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
          console.log('Orden creada automáticamente:', createdOrder);
          this.loading = false;
          
          // Mostrar mensaje de éxito con Toast
          this.showSuccessToast('Presupuesto guardado correctamente');
        },
        error: (error) => {
          console.error('Error al crear la orden:', error);
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
    this.visible = false;
  }

  handleDownloadTrip(): void {
    // Solo mostrar el modal sin mostrar Toast
    this.visible = true;
  }

  // Optimización: Método separado para mostrar notificación
  private showDownloadNotification(): void {
    alert('La descarga de tu viaje comenzará en breve');
    // Aquí iría la lógica para generar y descargar el PDF
  }

  handleInviteFriend(): void {
    console.log('Inviting friend to trip...');

    // Fix: Check if Web Share API is available by checking if it's a function
    if (navigator.share && typeof navigator.share === 'function') {
      this.shareViaWebAPI();
    } else {
      this.shareViaEmail();
    }
  }

  // Optimización: Métodos separados para compartir
  private shareViaWebAPI(): void {
    navigator
      .share({
        title: this.tour?.name || 'Mi viaje con Different Roads',
        text: '¡Mira este increíble viaje que estoy planeando!',
        url: window.location.href,
      })
      .catch((error) => console.error('Error sharing:', error));
  }

  private shareViaEmail(): void {
    const emailSubject = encodeURIComponent(
      this.tour?.name || 'Mi viaje con Different Roads'
    );
    const emailBody = encodeURIComponent(
      '¡Mira este increíble viaje que estoy planeando! ' + window.location.href
    );
    window.open(`mailto:?subject=${emailSubject}&body=${emailBody}`);
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