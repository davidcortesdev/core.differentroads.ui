import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  Renderer2,
} from '@angular/core';
import { MenuItem } from 'primeng/api';
import { LanguageService } from '../../core/services/language.service';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { UsersNetService } from '../../core/services/usersNet.service';
import {
  MenuItemService,
  IMenuItemResponse,
} from '../../core/services/menu/menu-item.service';
import {
  TourLocationService,
  CountryWithToursResponse,
} from '../../core/services/tour/tour-location.service';
import {
  LocationNetService,
  Location,
} from '../../core/services/locations/locationNet.service';
import { TourTagService } from '../../core/services/tag/tour-tag.service';

import {
  Subject,
  takeUntil,
  finalize,
  filter,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  forkJoin,
} from 'rxjs';
import { Router } from '@angular/router';
import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
  selector: 'app-header-v2',
  standalone: false,
  templateUrl: './header-v2.component.html',
  styleUrl: './header-v2.component.scss',
})
export class HeaderV2Component implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private documentClickListener: Function | null = null;
  isLoadingMenu = true;
  isLoadingUser = false;

  // Estado para controlar la visibilidad y transiciones
  showUserInfo = false;
  loadingAuthState = true;

  selectedLanguage = 'ES';
  readonly languages: readonly string[] = ['ES', 'EN'] as const;
  filteredLanguages: string[] = [];
  leftMenuItems?: MenuItem[];
  rightMenuItems?: MenuItem[];
  userMenuItems?: MenuItem[];
  combinedMenuItems?: MenuItem[];

  // Almacenar países por continente para submenús
  countriesByContinent: { [continentId: number]: Location[] } = {};
  isLoggedIn = false;
  isMobileView = false;

  chipLabel = 'Iniciar Sesión';
  readonly chipIcon = 'pi pi-user';
  chipImage = '';
  readonly chipAlt = 'Avatar image';

  constructor(
    private languageService: LanguageService,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private menuItemService: MenuItemService,
    private tourLocationService: TourLocationService,
    private locationNetService: LocationNetService,
    private tourTagService: TourTagService,
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private router: Router,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.loadingAuthState = true;

    // Inicializar componentes en paralelo
    this.initializeLanguage();
    this.initializeMenu();
    this.initializeUserMenu();
    this.handleResponsiveMenus();
    this.initializeClickOutside();

    // Verificar si hay una redirección de autenticación (por ejemplo, de Google)
    this.checkAuthRedirect().finally(() => {
      setTimeout(() => (this.loadingAuthState = false), 300);
    });
  }

  ngOnDestroy(): void {
    // Limpiar el listener de resize
    window.removeEventListener('resize', this.checkScreenSize.bind(this));

    // Clean up document click listener
    if (this.documentClickListener) {
      this.documentClickListener();
      this.documentClickListener = null;
    }

    // Limpiar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Métodos públicos
  filterLanguages(event: AutoCompleteCompleteEvent): void {
    const query = event.query.toUpperCase();
    this.filteredLanguages = this.languages.filter((lang) =>
      lang.includes(query)
    );
  }

  onLanguageChange(lang: string): void {
    if (typeof lang === 'string') {
      this.languageService.setLanguage(lang.toLowerCase());
    }
  }

  onChipClick(): void {
    if (!this.isLoggedIn) {
      this.authService.navigateToLogin();
    }
    // Si está autenticado, la lógica para mostrar el menú se maneja en el template
  }

  // Método para cerrar todos los menús móviles
  public closeAllMobileMenus(): void {
    // Find all mobile active menus and remove the active class
    const mobileActiveMenus = document.querySelectorAll(
      '.p-menubar-mobile-active'
    );
    mobileActiveMenus.forEach((menu) => {
      menu.classList.remove('p-menubar-mobile-active');
    });
  }

  // Getter para clases CSS condicionales
  get userChipClass(): string {
    if (this.loadingAuthState) return 'auth-loading';
    return this.showUserInfo ? 'user-info-visible' : 'user-info-hidden';
  }

  // Métodos privados
  private async checkAuthRedirect(): Promise<void> {
    try {
      await this.authService.handleAuthRedirect();
    } catch (error) {
      // Error handling - could be logged to a service in production
    }
  }

  private initializeLanguage(): void {
    this.languageService
      .getCurrentLang()
      .pipe(takeUntil(this.destroy$), filter(Boolean))
      .subscribe((lang) => (this.selectedLanguage = lang.toUpperCase()));
  }

  private initializeMenu(): void {
    this.fetchMenuConfig();
  }

  private initializeClickOutside(): void {
    // Only add listener in mobile view
    if (this.isMobileView) {
      this.documentClickListener = this.renderer.listen(
        'document',
        'click',
        (event) => {
          // Check if click is outside the header element
          if (!this.elementRef.nativeElement.contains(event.target)) {
            this.closeAllMobileMenus();
          }
        }
      );
    } else if (this.documentClickListener) {
      // Remove listener if not in mobile view
      this.documentClickListener();
      this.documentClickListener = null;
    }
  }

  private initializeUserMenu(): void {
    // Observa el estado de autenticación y actualiza la UI cuando cambie
    this.authService
      .isLoggedIn()
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300), // Evitar cambios demasiado rápidos
        distinctUntilChanged() // Solo procesar cuando realmente cambie
      )
      .subscribe((isLoggedIn) => {
        this.isLoggedIn = isLoggedIn;

        if (isLoggedIn) {
          this.populateUserMenu();
        } else {
          this.showUserInfo = false;
          setTimeout(() => this.resetUserMenu(), 300);
        }
      });

    // Observar cambios en atributos del usuario
    this.authService.userAttributesChanged
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isLoggedIn) {
          this.populateUserMenu();
        }
      });
  }

  private resetUserMenu(): void {
    this.chipLabel = 'Iniciar Sesión';
    this.chipImage = '';
    this.userMenuItems = [
      {
        label: 'Iniciar sesión',
        command: () => this.onChipClick(),
      },
    ];
  }

  private fetchMenuConfig(): void {
    this.isLoadingMenu = true;

    // Obtener todos los elementos de menú activos sin importar el tipo
    this.menuItemService
      .getAll({ isActive: true })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoadingMenu = false))
      )
      .subscribe({
        next: (menuItems: IMenuItemResponse[]) => {
          // Procesar los elementos de menú y crear el menú unificado
          this.processMenuItems([menuItems]);
        },
        error: (error) => {
          this.isLoadingMenu = false;
        },
      });
  }

  private processMenuItems(menuItemsArrays: IMenuItemResponse[][]): void {
    // Combinar todos los elementos de menú en un solo array
    const allMenuItems = menuItemsArrays.flat();

    // Ordenar todos los elementos por el campo orden
    const sortedAllItems = allMenuItems.sort((a, b) => a.orden - b.orden);

    // Crear un solo menú con todos los elementos ordenados
    const singleMenuItems = this.mapMenuItemResponseToPrimeNG(sortedAllItems);

    // Asignar el mismo menú a todas las propiedades para mantener compatibilidad
    this.leftMenuItems = singleMenuItems;
    this.rightMenuItems = [];
    this.combinedMenuItems = singleMenuItems;

    // Ahora que los menús están cargados, obtener países para los continentes
    this.loadContinentsFromLeftMenu();
  }

  private loadCountriesWithTours(): void {
    // Solo procesar continentes del menú izquierdo
    this.loadContinentsFromLeftMenu();
  }

  private loadContinentsFromLeftMenu(): void {
    // Usar los IDs de los elementos del menú izquierdo directamente
    if (this.leftMenuItems && this.leftMenuItems.length > 0) {
      this.leftMenuItems.forEach((menuItem, index) => {
        const continentId = (menuItem as any).id as string;

        // Verificar que el ID existe
        if (!continentId) {
          return;
        }

        this.tourLocationService
          .getCountriesWithToursByContinent(parseInt(continentId))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (countries: CountryWithToursResponse[]) => {
              // Extraer countryIds para este continente
              const countryIds = countries.map(
                (country) => (country as any).countryId
              );

              // Obtener nombres de países usando los countryIds
              this.loadCountryNames(countryIds, parseInt(continentId));
            },
            error: (error: any) => {
              // Error handling - could be logged to a service in production
            },
          });
      });
    }
  }

  private loadCountryNames(countryIds: number[], continentId?: number): void {
    if (countryIds.length === 0) {
      return;
    }

    countryIds.forEach((countryId, index) => {
      this.locationNetService.getLocationById(countryId).subscribe({
        next: (location) => {
          // Almacenar país para el continente
          if (continentId && !this.countriesByContinent[continentId]) {
            this.countriesByContinent[continentId] = [];
          }
          if (continentId) {
            this.countriesByContinent[continentId].push(location);
          }

          // Actualizar menús cuando se complete la carga
          if (index === countryIds.length - 1) {
            this.updateMenusWithCountries();
          }
        },
        error: (error) => {
          // Error handling - could be logged to a service in production
        },
      });
    });
  }

  private updateMenusWithCountries(): void {
    // Verificar si tenemos países cargados
    const hasCountries = Object.keys(this.countriesByContinent).length > 0;

    if (!hasCountries) {
      return;
    }

    // Actualizar menú único (continentes) con países como submenús
    if (this.leftMenuItems && this.leftMenuItems.length > 0) {
      this.leftMenuItems = this.leftMenuItems.map((menuItem) => {
        // Usar directamente el ID del menú como continentId
        const continentId = (menuItem as any).id;

        if (continentId && this.countriesByContinent[parseInt(continentId)]) {
          const countries = this.countriesByContinent[parseInt(continentId)];

          const updatedMenuItem = {
            ...menuItem,
            items: countries.map((country: Location) => ({
              label: country.name,
              command: () => {
                // Disparar evento menu_interaction para submenús
                this.onMenuInteraction(country.name);
                
                this.router.navigate([`/tours/${country.code.toLowerCase()}`]);
              },
            })),
          };

          return updatedMenuItem;
        }

        return menuItem;
      });
    }

    // Actualizar menú combinado para móvil (ahora es el mismo que el menú principal)
    this.combinedMenuItems = this.leftMenuItems;
  }

  private findContinentIdByName(continentName: string): number | null {
    // Buscar el continentId basado en el nombre del continente desde los datos de la API
    for (const [continentId, countries] of Object.entries(
      this.countriesByContinent
    )) {
      if (countries.length > 0) {
        // Usar el continentName del primer país como referencia
        const firstCountry = countries[0];
        if (
          firstCountry &&
          (firstCountry as any).continentName === continentName
        ) {
          return parseInt(continentId);
        }
      }
    }

    return null;
  }

  private mapMenuItemResponseToPrimeNG(
    menuItems: IMenuItemResponse[]
  ): MenuItem[] {
    return menuItems.map((item) => ({
      label: item.name,
      // Preservar el ID original para las URLs
      id: item.id.toString(),
      // No agregar routerLink aquí para permitir submenús
      command: () => {
        // Disparar evento menu_interaction
        this.onMenuInteraction(item.name);
        
        this.navigateToSlug(item.slugContenido);
      },
    }));
  }

  private createRouteFromSlug(slug: string): string {
    // Crear ruta basada en el slug
    // Esto puede necesitar ajustes según la estructura de rutas de tu aplicación
    return `/${slug}`;
  }

  private handleResponsiveMenus(): void {
    // Initial check on component initialization
    this.checkScreenSize();

    // Usar bind para mantener el contexto this
    const boundCheckScreenSize = this.checkScreenSize.bind(this);

    // Agregar listener con referencia a función vinculada
    window.addEventListener('resize', boundCheckScreenSize);
  }

  private checkScreenSize(): void {
    // Set mobile view flag based on screen width (tablet breakpoint)
    const wasMobileView = this.isMobileView;
    this.isMobileView = window.innerWidth <= 992; // Same as $tablet-breakpoint

    // If mobile view status changed, update click outside listener
    if (wasMobileView !== this.isMobileView) {
      this.initializeClickOutside();
    }
  }

  populateUserMenu(): void {
    if (this.isLoadingUser) {
      return;
    }

    this.authService
      .getUserEmail()
      .pipe(
        takeUntil(this.destroy$),
        filter((email) => !!email),
        debounceTime(300)
      )
      .subscribe((email) => {
        this.isLoadingUser = true;
        this.chipLabel = 'Cargando...';

        // Combinar email y Cognito ID en un solo flujo
        this.authService
          .getCognitoId()
          .pipe(
            takeUntil(this.destroy$),
            switchMap((cognitoId: string) => {
              if (cognitoId) {
                return this.usersNetService.getUsersByCognitoId(cognitoId);
              } else {
                // Si no hay Cognito ID, mostrar solo el email
                this.chipLabel = `Hola, ${email}`;
                this.setUserMenuItems();
                this.isLoadingUser = false;
                this.showUserInfo = true;
                return of([]);
              }
            }),
            finalize(() => {
              this.isLoadingUser = false;
              this.showUserInfo = true;
            })
          )
          .subscribe({
            next: (users: any[]) => {
              if (users && users.length > 0) {
                const user = users[0];
                const displayName = user?.name || email;

                this.chipLabel = `Hola, ${displayName}`;
                this.chipImage = ''; // El nuevo modelo no tiene profileImage
                this.setUserMenuItems();

                // Asegurar que el estado se actualice correctamente
                this.isLoadingUser = false;
                this.showUserInfo = true;
              } else {
                // Si no se encuentra el usuario, mostrar solo el email
                this.chipLabel = `Hola, ${email}`;
                this.setUserMenuItems();

                // Asegurar que el estado se actualice correctamente
                this.isLoadingUser = false;
                this.showUserInfo = true;
              }
            },
            error: (error: any) => {
              this.chipLabel = `Hola, ${email}`;
              this.setUserMenuItems();

              // Asegurar que el estado se actualice correctamente
              this.isLoadingUser = false;
              this.showUserInfo = true;
            },
          });
      });
  }

  /**
   * Configura los elementos del menú de usuario
   */
  private setUserMenuItems(): void {
    this.userMenuItems = [
      {
        label: 'Ver Perfil',
        icon: 'pi pi-user',
        command: () => {
          // Obtener el userId real del usuario, no el cognitoId
          this.authService.getCognitoId().pipe(
            takeUntil(this.destroy$),
            switchMap((cognitoId: string) => {
              if (cognitoId) {
                return this.usersNetService.getUsersByCognitoId(cognitoId);
              } else {
                return of([]);
              }
            })
          ).subscribe((users: any[]) => {
            if (users && users.length > 0) {
              const user = users[0];
              const userId = user?.id; // Usar el ID real del usuario, no el cognitoId
              if (userId) {
                this.authService.navigateToProfile(userId);
              }
            }
          });
        },
      },
      {
        label: 'Desconectar',
        icon: 'pi pi-sign-out',
        command: () => this.authService.logOut(),
      },
    ];
  }

  private navigateToSlug(slug: string): void {
    const route = this.createRouteFromSlug(slug);
    if (route) {
      this.router
        .navigate([route])
        .then(() => {
          // Navigation successful
        })
        .catch((error) => {
          // Navigation error handling
        });
    }
  }

  /**
   * Disparar evento menu_interaction cuando el usuario hace clic en elementos del menú
   */
  onMenuInteraction(clickElement: string): void {
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.menuInteraction(clickElement, userData);
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        // Fallback con datos básicos
        this.analyticsService.menuInteraction(clickElement, this.getUserData());
      }
    });
  }

  /**
   * Disparar evento click_logo cuando el usuario hace clic en el logo
   */
  onLogoClick(): void {
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.clickLogo(userData);
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        // Fallback con datos básicos
        this.analyticsService.clickLogo(this.getUserData());
      }
    });
  }

  /**
   * Obtener datos del usuario para analytics
   */
  private getUserData() {
    if (this.authService.isAuthenticatedValue()) {
      return this.analyticsService.getUserData(
        this.authService.getUserEmailValue(),
        undefined, // No tenemos teléfono en el header
        this.authService.getCognitoIdValue()
      );
    }
    return undefined;
  }
}
