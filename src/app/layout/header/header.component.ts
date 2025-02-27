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
import { Subject, takeUntil, finalize } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Add loading states
  isLoadingMenu = true;
  isLoadingUser = false;
  
  selectedLanguage = 'ES';
  readonly languages: string[] = ['ES', 'EN'];
  filteredLanguages: string[] = [];
  leftMenuItems?: MenuItem[];
  rightMenuItems?: MenuItem[];
  userMenuItems?: MenuItem[];
  isLoggedIn = false;

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
    this.languageService
      .getCurrentLang()
      .pipe(takeUntil(this.destroy$))
      .subscribe((lang) => (this.selectedLanguage = lang.toUpperCase()));

    this.fetchMenuConfig();
    this.populateUserMenu();

    this.authService.userAttributesChanged
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.userMenuItems) {
          this.populateUserMenu();
        }
      });
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
        finalize(() => this.isLoadingMenu = false)
      )
      .subscribe((menuConfig: MenuConfig) => {
        this.leftMenuItems = this.mapMenuListToItems(menuConfig['menu-list-left']);
        this.rightMenuItems = this.mapMenuListToItems(menuConfig['menu-list-right']);
      });
  }

  private createLink(slug: string, type: string): string {
    switch (type) {
      case 'collections':
        return `/collection/${slug}`;
      case 'landings':
        return `/landing/${slug}`;
      case 'page':
        return `pages/${slug}`;
      case 'tours':
        return `/tour/${slug}`;
      default:
        return `${slug}`;
    }
  }

  private mapMenuListToItems(menuList: MenuList[]): MenuItem[] {
    return menuList.map((item: MenuList) => {
      const menuItem: MenuItem = {
        label: item.text,
        routerLink: item['custom-link'] ? this.createLink(item['custom-link'], item.subtype || '') : undefined,
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

  filterLanguages(event: AutoCompleteCompleteEvent) {
    const query = event.query.toUpperCase();
    this.filteredLanguages = this.languages.filter((lang) =>
      lang.includes(query)
    );
  }

  onLanguageChange(lang: any) {
    this.languageService.setLanguage(lang.toLowerCase());
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
              finalize(() => this.isLoadingUser = false)
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
