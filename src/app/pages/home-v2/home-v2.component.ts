import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, take, from, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';

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

  ngOnInit(): void {
    this.titleService.setTitle('Different Roads - Viajes y Experiencias Únicas');
    this.loadAllHomeSections();
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state && code.length > 0 && state.length > 0) {
      this.handleOAuthCallback();
    }
  }

  ngOnDestroy() {
    this.abortController.abort();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Maneja el callback de OAuth después de la autenticación.
   * Busca o crea el usuario en la base de datos y limpia la URL.
   * Usa operadores RxJS para evitar callbacks anidados y posibles memory leaks.
   */
  private handleOAuthCallback(): void {
    from(this.authService.handleAuthRedirect())
      .pipe(
        switchMap(() => this.authService.getUserAttributes()),
        switchMap(attributes => {
          const cognitoId = attributes.sub;
          const email = attributes.email;
          
          if (!cognitoId || !email) {
            console.warn('OAuth callback: Missing cognitoId or email');
            return of(null);
          }
          
          // Buscar usuario por Cognito ID
          return this.usersNetService.getUsersByCognitoId(cognitoId).pipe(
            switchMap(users => {
              if (users?.length > 0) {
                // Usuario encontrado por Cognito ID
                return of(users[0]);
              }
              
              // Si no existe por Cognito ID, buscar por email
              return this.usersNetService.getUsersByEmail(email).pipe(
                switchMap(usersByEmail => {
                  if (usersByEmail?.length > 0) {
                    // Actualizar usuario existente con Cognito ID
                    return this.usersNetService.updateUser(usersByEmail[0].id, {
                      cognitoId: cognitoId,
                      name: usersByEmail[0].name ?? '',
                      email: usersByEmail[0].email ?? ''
                    }).pipe(
                      map(() => usersByEmail[0]),
                      catchError(error => {
                        console.error('Error updating user with Cognito ID:', error);
                        return of(null);
                      })
                    );
                  }
                  
                  // Crear nuevo usuario
                  return this.usersNetService.createUser({
                    cognitoId: cognitoId,
                    name: email,
                    email: email,
                    hasWebAccess: true,
                    hasMiddleAccess: false
                  }).pipe(
                    catchError(error => {
                      console.error('Error creating new user:', error);
                      return of(null);
                    })
                  );
                }),
                catchError(error => {
                  console.error('Error searching user by email:', error);
                  return of(null);
                })
              );
            }),
            catchError(error => {
              console.error('Error searching user by Cognito ID:', error);
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (user) => {
          if (user) {
            this.cleanUrlAndNavigate();
          }
        },
        error: (error) => {
          console.error('Error in OAuth callback:', error);
          // Opcional: mostrar notificación al usuario
        }
      });
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
          this.sortAndStoreConfigurations(configurations);
          this.isLoading = false;
          // Los eventos view_item_list se dispararán cuando cada lista aparezca en pantalla
          // mediante Intersection Observer en los componentes hijos
        },
        error: (error) => {
          console.error('Error loading home sections:', error);
          this.hasError = true;
          this.isLoading = false;
        },
      });
  }

  /**
   * Ordena las configuraciones por displayOrder y actualiza las propiedades computadas.
   * Crea una copia del array antes de ordenar para evitar mutación in-place.
   * 
   * @param configurations - Array de configuraciones a ordenar y almacenar
   */
  private sortAndStoreConfigurations(
    configurations: IHomeSectionConfigurationResponse[]
  ): void {
    // Crear copia antes de ordenar para evitar mutación del array original
    this.orderedConfigurations = [...configurations].sort(
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
