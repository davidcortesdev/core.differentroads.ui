import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { HomeSectionService, IHomeSectionResponse, } from '../../core/services/home/home-section.service';
import { HomeSectionConfigurationService, IHomeSectionConfigurationResponse, } from '../../core/services/home/home-section-configuration.service';
import { Title } from '@angular/platform-browser';
import { AuthenticateService } from '../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../core/services/users/usersNet.service';

@Component({
  selector: 'app-home-v2',
  standalone: false,
  templateUrl: './home-v2.component.html',
  styleUrls: ['./home-v2.component.scss'],
})
export class HomeV2Component implements OnInit, OnDestroy {
  // Configuraciones ordenadas globalmente por displayOrder
  orderedConfigurations: IHomeSectionConfigurationResponse[] = [];

  // Estado de carga
  isLoading = true;
  hasError = false;

  private destroy$ = new Subject<void>();

  constructor(
    private titleService: Title,
    private homeSectionService: HomeSectionService,
    private homeSectionConfigurationService: HomeSectionConfigurationService,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService
  ) {}

  async ngOnInit() {
    
    this.titleService.setTitle('Different Roads - Viajes y Experiencias Únicas');
    this.loadAllHomeSections();
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      console.log('✅ Detectado callback de OAuth en App Component');
      await this.handleOAuthCallback();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async handleOAuthCallback(): Promise<void> {
    try {
      // Procesar la autenticación
      await this.authService.handleAuthRedirect();
      
      console.log('✅ handleAuthRedirect completado');
      
      // Obtener atributos del usuario
      this.authService.getUserAttributes().subscribe({
        next: async (attributes) => {
          console.log('✅ Atributos obtenidos:', attributes);
          
          const username = this.authService.getCurrentUsername();
          const cognitoId = attributes.sub;
          const email = attributes.email;
          
          if (!cognitoId || !email) {
            console.error('❌ Datos incompletos');
            return;
          }
          
          console.log('🔍 Verificando usuario en API...');
          
          // Buscar por Cognito ID
          this.usersNetService.getUsersByCognitoId(cognitoId).subscribe({
            next: (users) => {
              if (users && users.length > 0) {
                console.log('✅ Usuario encontrado');
                // Limpiar URL y navegar
                this.cleanUrlAndNavigate();
              } else {
                // Buscar por email
                this.usersNetService.getUsersByEmail(email).subscribe({
                  next: (usersByEmail) => {
                    if (usersByEmail && usersByEmail.length > 0) {
                      console.log('✅ Usuario encontrado por email, actualizando...');
                      // Actualizar con Cognito ID
                      this.usersNetService.updateUser(usersByEmail[0].id, {
                        cognitoId: cognitoId,
                        name: usersByEmail[0].name ?? '',
                        email: usersByEmail[0].email ?? ''
                      }).subscribe(() => {
                        this.cleanUrlAndNavigate();
                      });
                    } else {
                      console.log('🆕 Creando nuevo usuario...');
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
          console.error('❌ Error obteniendo atributos:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error procesando callback:', error);
    }
  }

  private cleanUrlAndNavigate(): void {
    // Limpiar URL (quitar code y state)
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Ya estás en la página correcta, solo limpia la URL
    console.log('✅ Proceso completado');
  }
  private loadAllHomeSections(): void {
    this.isLoading = true;
    this.hasError = false;

    // Cargar todas las configuraciones activas ordenadas
    this.homeSectionConfigurationService
      .getActiveOrdered()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (configurations) => {
          this.distributeConfigurationsBySection(configurations);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading home configurations:', error);
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
  }

  // Método para obtener la configuración del banner (siempre la primera)
  getBannerConfiguration(): IHomeSectionConfigurationResponse | null {
    return (
      this.orderedConfigurations.find((config) => config.homeSectionId === 1) ||
      null
    );
  }

  // Método para obtener configuraciones ordenadas excluyendo el banner
  getOrderedConfigurationsExcludingBanner(): IHomeSectionConfigurationResponse[] {
    return this.orderedConfigurations.filter(
      (config) => config.homeSectionId !== 1
    );
  }

  // Método para determinar qué componente renderizar según el homeSectionId
  getComponentType(homeSectionId: number): string {
    const componentMap: { [key: number]: string } = {
      1: 'banner', // app-hero-section-v2
      2: 'tour-carousel', // app-tour-carrussel-v2
      3: 'tour-grid', // app-carousel-section-v2
      4: 'fullscreen-cards', // app-full-card-section-v2
      5: 'mixed-section', // app-carousel-section-v2
      6: 'traveler-section', // app-community-section-v2
      7: 'reviews-section', // app-reviews-section-v2
      8: 'featured-section', // app-highlight-section-v2
      10: 'partners-section', // app-partners-section-v2
      11: 'publicity-section', // app-publicity-section-v2
    };
    return componentMap[homeSectionId] || 'unknown';
  }

  // Método para obtener el nombre de la sección por ID
  getSectionName(sectionId: number): string {
    const sectionNames: { [key: number]: string } = {
      1: 'Banner',
      2: 'Carrusel de Tours',
      3: 'Lista de Tours en Cuadrícula',
      4: 'Cards a Pantalla Completa',
      5: 'Sección Mixta',
      6: 'Sección de Viajeros',
      7: 'Sección de Reviews',
      8: 'Sección Destacada',
      10: 'Carrusel de Colaboradores',
      11: 'Sección de Publicidad',
    };
    return sectionNames[sectionId] || 'Sección desconocida';
  }
}
