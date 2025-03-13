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
  isLoadingUser = true;

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
    this.initializeLanguage();
    this.initializeMenu();
    this.initializeUserMenu();
    this.handleResponsiveMenus();
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
    this.populateUserMenu();
    this.listenToUserChanges();
  }

  private listenToUserChanges(): void {
    this.authService.userAttributesChanged
      .pipe(
        takeUntil(this.destroy$),
        filter(() => !this.userMenuItems)
      )
      .subscribe(() => this.populateUserMenu());
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
    if (this.authService.getCurrentUser()) {
      this.isLoadingUser = true;
      this.authService
        .getUserAttributes()
        .pipe(takeUntil(this.destroy$))
        .subscribe((userAttributes) => {
          const { email } = userAttributes;
          this.usersService
            .getUserByEmail(email)
            .pipe(
              takeUntil(this.destroy$),
              finalize(() => (this.isLoadingUser = false))
            )
            .subscribe((user) => {
              this.chipLabel = `Hola, ${user.names || email}`;
              this.chipImage = user.profileImage || '';
              this.isLoggedIn = true;
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
            });
        });
    } else {
      this.isLoggedIn = false;
      this.isLoadingUser = false
      this.chipLabel = 'Iniciar Sesión';
      this.chipImage = '';
      this.userMenuItems = [
        {
          label: 'Iniciar sesión',
          command: () => this.onChipClick(),
        },
      ];
    }
  }

  onChipClick(): void {
    this.authService.navigateToLogin();
  }
}
