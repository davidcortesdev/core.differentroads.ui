import { Component, OnInit, OnDestroy } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { LanguageService } from '../../core/services/language.service';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { GeneralConfigService } from '../../core/services/general-config.service';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { UsersService } from '../../core/services/users.service';
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
  Observable,
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
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
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.loadingAuthState = true;
    this.initializeLanguage();
    this.initializeMenu();
    this.initializeUserMenu();
    this.handleResponsiveMenus();
    
    // Verificar si hay una redirección de autenticación (por ejemplo, de Google)
    this.checkAuthRedirect().finally(() => {
      setTimeout(() => {
        this.loadingAuthState = false;
      }, 500); 
    });
  }

  // Nuevo método para verificar y manejar redirecciones OAuth
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

  private initializeUserMenu(): void {
    // Observa el estado de autenticación y actualiza la UI cuando cambie
    this.authService.isLoggedIn()
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300), // Evitar cambios demasiado rápidos
        distinctUntilChanged() // Solo procesar cuando realmente cambie
      )
      .subscribe(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
        

        if (isLoggedIn) {
          this.populateUserMenu();
        } else {
          this.showUserInfo = false;
          setTimeout(() => this.resetUserMenu(), 300);
        }
      });

    // Escucha cambios en los atributos del usuario
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

        // Create combined menu items for mobile view
        this.combinedMenuItems = [
          ...(this.leftMenuItems || []),
          ...(this.rightMenuItems || []),
        ];
      });
  }

  private handleResponsiveMenus(): void {
    // Initial check on component initialization
    this.checkScreenSize();

    // Add window resize listener
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  private checkScreenSize(): void {
    // Set mobile view flag based on screen width (tablet breakpoint)
    this.isMobileView = window.innerWidth <= 992; // Same as $tablet-breakpoint
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
    return menuList.map((item: MenuList) => {
      const menuItem: MenuItem = {
        label: item.text,
        routerLink: item['custom-link']
          ? this.createLink(item['custom-link'], item.subtype || '')
          : undefined,
        items: item['link-menu']
          ? this.mapLinkMenuToItems(item['link-menu'])
          : undefined,
      };
      return menuItem;
    });
  }

  private mapLinkMenuToItems(linkMenu: LinkMenu[]): MenuItem[] {
    return linkMenu.map((link: LinkMenu) => ({
      label: link.name,
      routerLink: this.createLink(link.slug, link.type || ''),
    }));
  }

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

  populateUserMenu(): void {
    if (this.isLoadingUser) {
      return; // Evitar múltiples llamadas simultáneas
    }
    
    
    this.authService.getUserEmail()
      .pipe(
        takeUntil(this.destroy$),
        filter(email => !!email), 
        debounceTime(300) 
      )
      .subscribe(email => {
        this.isLoadingUser = true;
        
        // Guardar una copia temporal mientras se carga
        const tempLabel = this.chipLabel;
        const tempImage = this.chipImage;
        
        
        this.chipLabel = `Cargando...`;
        
        this.usersService
          .getUserByEmail(email)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.isLoadingUser = false;
              
              
              setTimeout(() => {
                this.showUserInfo = true;
              }, 100);
            })
          )
          .subscribe({
            next: (user) => {
              this.chipLabel = `Hola, ${user.names === 'pendiente' ? email : (user.names || email)}`;
              this.chipImage = user.profileImage || '';
              
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
            },
            error: async (err) => {
              console.error('Error al obtener el usuario:', err);
              
              // Mantener los valores anteriores en caso de error
              this.chipLabel = `Hola, ${email}`;
              
              // Si no existe el usuario, intentar crearlo
              if (err.status === 404) {
                try {
                  await this.authService.createUserIfNotExists(email);
                  this.populateUserMenu(); // Intentar obtener el usuario nuevamente
                } catch (createError) {
                  console.error('Error al crear el usuario:', createError);
                }
              }
            },
          });
      });
  }

  onChipClick(): void {
    if (this.isLoggedIn) {
      // Si ya está autenticado, mostrar el menú de usuario
      // (Esto dependerá de tu implementación de UI)
    } else {
      this.authService.navigateToLogin();
    }
  }

  // Método auxiliar para el template para mostrar estado del chip
  get userChipClass(): string {
    // Clases CSS para diferentes estados
    return this.loadingAuthState 
      ? 'auth-loading' 
      : this.showUserInfo 
        ? 'user-info-visible' 
        : 'user-info-hidden';
  }
}