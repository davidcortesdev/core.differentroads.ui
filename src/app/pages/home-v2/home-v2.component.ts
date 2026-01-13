import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, take } from 'rxjs';

import { HomeSectionConfigurationService, IHomeSectionConfigurationResponse, } from '../../core/services/home/home-section-configuration.service';
import { HomeSectionService, IHomeSectionResponse } from '../../core/services/home/home-section.service';
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
  
  // Cache de tipos de secciones del backend (opcional, para validación y nombres)
  private homeSectionsMap: Map<number, IHomeSectionResponse> = new Map();

  constructor(
    private titleService: Title,
    private homeSectionConfigurationService: HomeSectionConfigurationService,
    private homeSectionService: HomeSectionService,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private analyticsService: AnalyticsService
  ) {}

  async ngOnInit() {
    this.titleService.setTitle('Different Roads - Viajes y Experiencias Únicas');
    
    // Cargar tipos de secciones desde el backend (opcional, para validación y nombres)
    this.loadHomeSectionTypes();
    
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

  /**
   * Carga los tipos de secciones desde el backend (opcional)
   * Útil para validar que las secciones estén activas y obtener nombres dinámicos
   */
  private loadHomeSectionTypes(): void {
    this.homeSectionService
      .getAll({ isActive: true }, this.abortController.signal)
      .pipe(
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (sections) => {
          sections.forEach(section => {
            this.homeSectionsMap.set(section.id, section);
          });
        },
        error: (error) => {
          console.warn('No se pudieron cargar los tipos de secciones:', error);
          // No es crítico, continuar sin validación
        }
      });
  }

  /**
   * Valida si una sección está activa según el backend
   */
  private isSectionActive(homeSectionId: number): boolean {
    const section = this.homeSectionsMap.get(homeSectionId);
    return section?.isActive ?? true; // Por defecto true si no está en el cache
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

  /**
   * Obtiene el nombre de la sección desde el backend o fallback local
   * @param sectionId ID de la sección
   * @returns Nombre de la sección
   */
  getSectionName(sectionId: number): string {
    // Intentar obtener desde el backend primero
    const section = this.homeSectionsMap.get(sectionId);
    if (section) {
      return section.name;
    }
    
    // Fallback a nombres hardcodeados si no hay cache del backend
    const fallbackNames: { [key: number]: string } = {
      [HomeSectionId.BANNER]: 'Banner',
      [HomeSectionId.TOUR_CARROUSEL]: 'Carrusel de Tours',
      [HomeSectionId.TOUR_GRID]: 'Lista de Tours en Cuadrícula',
      [HomeSectionId.FULLSCREEN_CARDS]: 'Cards a Pantalla Completa',
      [HomeSectionId.MIXED_SECTION]: 'Sección Mixta',
      [HomeSectionId.TRAVELER_SECTION]: 'Sección de Viajeros',
      [HomeSectionId.REVIEWS_SECTION]: 'Sección de Reviews',
      [HomeSectionId.FEATURED_SECTION]: 'Sección Destacada',
      [HomeSectionId.ARTICLES_SECTION]: 'Sección de Artículos',
      [HomeSectionId.PARTNERS_CARROUSEL]: 'Carrusel de Colaboradores',
      [HomeSectionId.ABOUT_US]: 'Sobre Nosotros',
    };
    
    return fallbackNames[sectionId] || 'Sección desconocida';
  }

}
