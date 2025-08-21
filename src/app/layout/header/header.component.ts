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
import { GeneralConfigService } from '../../core/services/general-config.service';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { UsersNetService } from '../../core/services/usersNet.service';
import {
  MenuConfig,
  MenuList,
  LinkMenu,
} from '../../core/models/general/menu.model';
import {
  Subject,
  takeUntil,
  finalize,
  filter,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
} from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
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
  isLoggedIn = false;
  isMobileView = false;

  chipLabel = 'Iniciar Sesión';
  readonly chipIcon = 'pi pi-user';
  chipImage = '';
  readonly chipAlt = 'Avatar image';

  constructor(
    private languageService: LanguageService,
    private generalConfigService: GeneralConfigService,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private router: Router
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
      console.error('Error al manejar la redirección de autenticación:', error);
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
    this.generalConfigService
      .getMenuConfig()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoadingMenu = false))
      )
      .subscribe((menuConfig: MenuConfig) => {
        this.leftMenuItems = this.mapMenuListToItems(
          menuConfig['menu-list-left']
        );
        this.rightMenuItems = this.mapMenuListToItems(
          menuConfig['menu-list-right']
        );

        // Combinar menús para vista móvil
        this.combinedMenuItems = [
          ...(this.leftMenuItems || []),
          ...(this.rightMenuItems || []),
        ];
      });
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

  private createLink(slug: string, type: string): string {
    const routes: Record<string, string> = {
      collections: `/collection/${slug}`,
      landings: `/landing/${slug}`,
      page: `pages/${slug}`,
      tours: `/tour/${slug}`,
    };
    return routes[type] || slug;
  }

  private mapMenuListToItems(menuList: MenuList[]): MenuItem[] {
    return menuList.map((item) => ({
      label: item.text,
      routerLink: item['custom-link']
        ? this.createLink(item['custom-link'], item.subtype || '')
        : undefined,
      command: () => {
        if (item['custom-link']) {
          this.navigateTo(item['custom-link'], item.subtype || '');
        }
      },
      items: item['link-menu']
        ? this.mapLinkMenuToItems(item['link-menu'])
        : undefined,
    }));
  }

  private mapLinkMenuToItems(linkMenu: LinkMenu[]): MenuItem[] {
    return linkMenu.map((link) => ({
      label: link.name,
      routerLink: this.createLink(link.slug, link.type || ''),
    }));
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
        command: () => this.authService.navigateToProfile(),
      },
      {
        label: 'Desconectar',
        icon: 'pi pi-sign-out',
        command: () => this.authService.logOut(),
      },
    ];
  }

  private navigateTo(slug: string, type: string): void {
    const route = this.createLink(slug, type);
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
}
