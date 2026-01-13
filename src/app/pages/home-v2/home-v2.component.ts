import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, take } from 'rxjs';

import { HomeSectionConfigurationService, IHomeSectionConfigurationResponse, } from '../../core/services/home/home-section-configuration.service';
import { Title } from '@angular/platform-browser';
import { AuthenticateService } from '../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../core/services/users/usersNet.service';
import { AnalyticsService } from '../../core/services/analytics/analytics.service';
import { HomeSectionId } from '../../shared/constants/home-section-codes.constants';

@Component({
  selector: 'app-home-v2',
  standalone: false,
  templateUrl: './home-v2.component.html',
  styleUrls: ['./home-v2.component.scss'],
})
export class HomeV2Component implements OnInit, OnDestroy {
  // Configuraciones ordenadas globalmente por displayOrder
  orderedConfigurations: IHomeSectionConfigurationResponse[] = [];

  // Propiedades computadas para optimizar el template
  bannerConfiguration: IHomeSectionConfigurationResponse | null = null;
  orderedConfigurationsExcludingBanner: IHomeSectionConfigurationResponse[] = [];

  // Estado de carga
  isLoading = true;
  hasError = false;

  // Exponer constantes para usar en el template
  readonly homeSectionIds = HomeSectionId;

  private destroy$ = new Subject<void>();
  private abortController = new AbortController();

  constructor(
    private titleService: Title,
    private homeSectionConfigurationService: HomeSectionConfigurationService,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private analyticsService: AnalyticsService
  ) {}

  async ngOnInit() {
    this.titleService.setTitle('Different Roads - Viajes y Experiencias Únicas');
    this.loadAllHomeSections();
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      await this.handleOAuthCallback();
    }
  }

  ngOnDestroy() {
    this.abortController.abort();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async handleOAuthCallback(): Promise<void> {
    try {
      // Procesar la autenticación
      await this.authService.handleAuthRedirect();
      
      // Obtener atributos del usuario
      this.authService.getUserAttributes().subscribe({
        next: async (attributes) => {
          const username = this.authService.getCurrentUsername();
          const cognitoId = attributes.sub;
          const email = attributes.email;
          
          if (!cognitoId || !email) {
            return;
          }
          
          // Buscar por Cognito ID
          this.usersNetService.getUsersByCognitoId(cognitoId).subscribe({
            next: (users) => {
              if (users && users.length > 0) {
                // Limpiar URL y navegar
                this.cleanUrlAndNavigate();
              } else {
                // Buscar por email
                this.usersNetService.getUsersByEmail(email).subscribe({
                  next: (usersByEmail) => {
                    if (usersByEmail && usersByEmail.length > 0) {
                      // Actualizar con Cognito ID
                      this.usersNetService.updateUser(usersByEmail[0].id, {
                        cognitoId: cognitoId,
                        name: usersByEmail[0].name ?? '',
                        email: usersByEmail[0].email ?? ''
                      }).subscribe(() => {
                        this.cleanUrlAndNavigate();
                      });
                    } else {
                      // Crear usuario
                      this.usersNetService.createUser({
                        cognitoId: cognitoId,
                        name: email,
                        email: email,
                        hasWebAccess: true,
                        hasMiddleAccess: false
                      }).subscribe(() => {
                        this.cleanUrlAndNavigate();
                      });
                    }
                  }
                });
              }
            }
          });
        },
        error: (error) => {
        }
      });
    } catch (error) {
    }
  }

  private cleanUrlAndNavigate(): void {
    // Limpiar URL (quitar code y state)
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  private loadAllHomeSections(): void {
    this.isLoading = true;
    this.hasError = false;

    // Limpiar tracking previo al cargar nuevas secciones
    this.analyticsService.clearTrackedListIds();

    // Cargar todas las configuraciones activas ordenadas
    this.homeSectionConfigurationService
      .getActiveOrdered(this.abortController.signal)
      .pipe(
        take(1), // Solo tomar el primer valor para evitar múltiples emisiones
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (configurations) => {
          this.distributeConfigurationsBySection(configurations);
          this.isLoading = false;
          // Los eventos view_item_list se dispararán cuando cada lista aparezca en pantalla
          // mediante Intersection Observer en los componentes hijos
        },
        error: (error) => {
          this.hasError = true;
          this.isLoading = false;
        },
      });
  }

  private distributeConfigurationsBySection(
    configurations: IHomeSectionConfigurationResponse[]
  ): void {
    // Ordenar configuraciones por displayOrder y almacenar globalmente
    this.orderedConfigurations = configurations.sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    
    // Actualizar propiedades computadas
    this.updateComputedProperties();
  }

  /**
   * Actualiza las propiedades computadas basadas en orderedConfigurations
   * Esto evita ejecutar find() y filter() en cada ciclo de detección de cambios
   */
  private updateComputedProperties(): void {
    // Usar constante en lugar de número mágico
    this.bannerConfiguration = 
      this.orderedConfigurations.find(
        (config) => config.homeSectionId === HomeSectionId.BANNER
      ) || null;
    
    this.orderedConfigurationsExcludingBanner = 
      this.orderedConfigurations.filter(
        (config) => config.homeSectionId !== HomeSectionId.BANNER
      );
  }

}
