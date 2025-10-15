import { Component, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { AuthenticateService } from '../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../core/services/users/usersNet.service';
import { MenuItemService, IMenuItemResponse } from '../../core/services/menu/menu-item.service';
import { TourLocationService, CountryWithToursResponse } from '../../core/services/tour/tour-location.service';
import { LocationNetService, Location } from '../../core/services/locations/locationNet.service';
import { Subject, takeUntil, finalize, filter, debounceTime, distinctUntilChanged, switchMap, of, timeout } from 'rxjs';
import { Router } from '@angular/router';
import { AnalyticsService } from '../../core/services/analytics/analytics.service';

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

  leftMenuItems?: MenuItem[];
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
  currentUserId: string = ''; // Almacenar el userId real del usuario

  constructor(
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private menuItemService: MenuItemService,
    private tourLocationService: TourLocationService,
    private locationNetService: LocationNetService,
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private router: Router,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.loadingAuthState = true;

    // Inicializar componentes en paralelo
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
  /**
   * Maneja el click en el chip de usuario (login si no está autenticado)
   */
  onChipClick(): void {
    if (!this.isLoggedIn) {
      this.authService.navigateToLogin();
    }
  }

  /**
   * Cierra todos los menús móviles activos
   */
  public closeAllMobileMenus(): void {
    document.querySelectorAll('.p-menubar-mobile-active').forEach((menu) => {
      menu.classList.remove('p-menubar-mobile-active');
    });
  }

  // Métodos privados
  /**
   * Verifica si hay una redirección de autenticación pendiente
   */
  private async checkAuthRedirect(): Promise<void> {
    try {
      await this.authService.handleAuthRedirect();
    } catch (error) {
      // Error handling
    }
  }

  /**
   * Inicializa la configuración del menú
   */
  private initializeMenu(): void {
    this.fetchMenuConfig();
  }

  /**
   * Configura el listener para cerrar menús al hacer click fuera del header
   */
  private initializeClickOutside(): void {
    if (this.documentClickListener) {
      this.documentClickListener();
      this.documentClickListener = null;
    }

    if (this.isMobileView) {
      this.documentClickListener = this.renderer.listen(
        'document',
        'click',
        (event) => {
          if (!this.elementRef.nativeElement.contains(event.target)) {
            this.closeAllMobileMenus();
          }
        }
      );
    }
  }

  /**
   * Inicializa el menú de usuario y observa cambios de autenticación
   */
  private initializeUserMenu(): void {
    this.authService
      .isLoggedIn()
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
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

    this.authService.userAttributesChanged
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isLoggedIn) {
          this.populateUserMenu();
        }
      });
  }

  /**
   * Resetea el menú de usuario al estado de no autenticado
   */
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

  /**
   * Obtiene la configuración del menú desde el servicio
   */
  private fetchMenuConfig(): void {
    this.isLoadingMenu = true;

    this.menuItemService
      .getAll({ isActive: true })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoadingMenu = false))
      )
      .subscribe({
        next: (menuItems: IMenuItemResponse[]) => {
          this.processMenuItems([menuItems]);
        },
        error: (error) => {
          this.isLoadingMenu = false;
        },
      });
  }

  /**
   * Procesa los elementos del menú y los ordena por prioridad
   */
  private processMenuItems(menuItemsArrays: IMenuItemResponse[][]): void {
    const allMenuItems = menuItemsArrays.flat();
    const sortedAllItems = allMenuItems.sort((a, b) => a.orden - b.orden);
    const singleMenuItems = this.mapMenuItemResponseToPrimeNG(sortedAllItems);

    this.leftMenuItems = singleMenuItems;
    this.combinedMenuItems = singleMenuItems;

    this.loadContinentsFromLeftMenu();
  }

  /**
   * Carga los países para cada continente del menú izquierdo
   */
  private loadContinentsFromLeftMenu(): void {
    if (this.leftMenuItems && this.leftMenuItems.length > 0) {
      this.leftMenuItems.forEach((menuItem, index) => {
        const continentId = (menuItem as any).id as string;

        if (!continentId) {
          return;
        }

        this.tourLocationService
          .getCountriesWithToursByContinent(parseInt(continentId))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (countries: CountryWithToursResponse[]) => {
              const countryIds = countries.map(
                (country) => (country as any).countryId
              );
              this.loadCountryNames(countryIds, parseInt(continentId));
            },
            error: (error: any) => {
              // Error handling
            },
          });
      });
    }
  }

  /**
   * Carga los nombres de países por sus IDs y los agrupa por continente
   */
  private loadCountryNames(countryIds: number[], continentId?: number): void {
    if (countryIds.length === 0) {
      return;
    }

    countryIds.forEach((countryId, index) => {
      this.locationNetService.getLocationById(countryId).subscribe({
        next: (location) => {
          if (continentId && !this.countriesByContinent[continentId]) {
            this.countriesByContinent[continentId] = [];
          }
          if (continentId) {
            this.countriesByContinent[continentId].push(location);
          }

          if (index === countryIds.length - 1) {
            this.updateMenusWithCountries();
          }
        },
        error: (error) => {
          // Error handling
        },
      });
    });
  }

  /**
   * Actualiza los menús con la información de países cargada
   */
  private updateMenusWithCountries(): void {
    const hasCountries = Object.keys(this.countriesByContinent).length > 0;

    if (!hasCountries) {
      return;
    }

    if (this.leftMenuItems && this.leftMenuItems.length > 0) {
      this.leftMenuItems = this.leftMenuItems.map((menuItem) => {
        const continentId = (menuItem as any).id;

        if (continentId && this.countriesByContinent[parseInt(continentId)]) {
          const countries = this.countriesByContinent[parseInt(continentId)];

          return {
            ...menuItem,
            items: countries.map((country: Location) => ({
              label: country.name,
              command: () => {
                this.onMenuInteraction(country.name);
                this.router.navigate([`/tours/${country.code.toLowerCase()}`]);
              },
            })),
          };
        }

        return menuItem;
      });
    }

    this.combinedMenuItems = this.leftMenuItems;
  }


  /**
   * Convierte los elementos del menú de la API al formato de PrimeNG
   */
  private mapMenuItemResponseToPrimeNG(
    menuItems: IMenuItemResponse[]
  ): MenuItem[] {
    return menuItems.map((item) => ({
      label: item.name,
      id: item.id.toString(),
      command: () => {
        this.onMenuInteraction(item.name);
        this.navigateToSlug(item.slugContenido);
      },
    }));
  }

  /**
   * Crea una ruta a partir de un slug
   */
  private createRouteFromSlug(slug: string): string {
    return `/${slug}`;
  }

  /**
   * Configura el manejo de menús responsivos
   */
  private handleResponsiveMenus(): void {
    this.checkScreenSize();
    window.addEventListener('resize', this.checkScreenSize.bind(this));
  }

  /**
   * Verifica el tamaño de pantalla y ajusta la vista móvil
   */
  private checkScreenSize(): void {
    const wasMobileView = this.isMobileView;
    this.isMobileView = window.innerWidth <= 992;

    if (wasMobileView !== this.isMobileView) {
      this.initializeClickOutside();
    }
  }

  /**
   * Pobla el menú de usuario con datos del usuario autenticado
   */
  populateUserMenu(): void {
    if (this.isLoadingUser) {
      return;
    }

    this.authService
      .getUserEmail()
      .pipe(
        takeUntil(this.destroy$),
        filter((email) => !!email),
        debounceTime(100)
      )
      .subscribe((email) => {
        this.isLoadingUser = true;
        this.chipLabel = 'Cargando...';

        // Obtener usuario por email directamente
        this.usersNetService
          .getUsersByEmail(email)
          .pipe(
            takeUntil(this.destroy$),
            timeout(5000), // Timeout de 5 segundos
            finalize(() => {
              this.isLoadingUser = false;
              this.showUserInfo = true;
            })
          )
          .subscribe({
            next: (users: any[]) => {
              if (users && users.length > 0) {
                const user = users[0];
                const displayName = user?.name && user?.lastName 
                  ? `${user.name} ${user.lastName}`.trim()
                  : user?.name || email;
                
                this.currentUserId = user?.id || '';
                this.chipLabel = `Hola, ${displayName}`;
                this.chipImage = '';
                this.setUserMenuItems();
                this.isLoadingUser = false;
                this.showUserInfo = true;
              } else {
                this.chipLabel = `Hola, ${email}`;
                this.setUserMenuItems();
                this.isLoadingUser = false;
                this.showUserInfo = true;
              }
            },
            error: (error: any) => {
              this.chipLabel = `Hola, ${email}`;
              this.setUserMenuItems();
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
        command: () => this.navigateToUserProfile(),
      },
      {
        label: 'Desconectar',
        icon: 'pi pi-sign-out',
        command: () => this.authService.logOut(),
      },
    ];
  }

  /**
   * Navega al perfil del usuario usando su ID real de la base de datos
   */
  private navigateToUserProfile(): void {
    this.authService.getUserEmail().pipe(
      takeUntil(this.destroy$),
      switchMap((email: string) => {
        if (email) {
          return this.usersNetService.getUsersByEmail(email);
        } else {
          return of([]);
        }
      })
    ).subscribe({
      next: (users: any[]) => {
        if (users && users.length > 0) {
          const user = users[0];
          const userId = user?.id;
          
          this.currentUserId = userId || '';
          
          if (userId) {
            this.router.navigate(['/profile-v2', userId]);
          }
        } else {
          const cognitoId = this.authService.getCognitoIdValue();
          if (cognitoId) {
            this.router.navigate(['/profile-v2', cognitoId]);
          }
        }
      },
      error: (error) => {
        const cognitoId = this.authService.getCognitoIdValue();
        if (cognitoId) {
          this.router.navigate(['/profile-v2', cognitoId]);
        }
      }
    });
  }

  /**
   * Navega a una ruta usando un slug
   */
  private navigateToSlug(slug: string): void {
    const route = this.createRouteFromSlug(slug);
    if (route) {
      this.router.navigate([route]);
    }
  }

  /**
   * Registra la interacción del usuario con elementos del menú para analytics
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
   * Registra el click en el logo para analytics
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
   * Obtiene los datos del usuario para analytics
   */
  private getUserData() {
    if (this.authService.isAuthenticatedValue()) {
      return this.analyticsService.getUserData(
        this.authService.getUserEmailValue(),
        undefined,
        this.authService.getCognitoIdValue()
      );
    }
    return undefined;
  }
}
