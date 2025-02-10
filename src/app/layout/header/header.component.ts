import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { LanguageService } from '../../core/services/language.service';
import { TranslateService } from '@ngx-translate/core';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { GeneralConfigService } from '../../core/services/general-config.service';
import {
  MenuConfig,
  MenuList,
  LinkMenu,
} from '../../core/models/general/menu.model';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  selectedLanguage: string = 'ES';
  languages: string[] = ['ES', 'EN'];
  filteredLanguages: string[] = [];
  leftMenuItems: MenuItem[] | undefined;
  rightMenuItems: MenuItem[] | undefined;

  constructor(
    private languageService: LanguageService,
    private translate: TranslateService,
    private generalConfigService: GeneralConfigService
  ) {}

  ngOnInit() {
    this.languageService.getCurrentLang().subscribe((lang) => {
      this.selectedLanguage = lang.toUpperCase();
    });

    this.fetchMenuConfig();
  }

  fetchMenuConfig() {
    this.generalConfigService
      .getMenuConfig()
      .subscribe((menuConfig: MenuConfig) => {
        // Mapear menu-list-left a leftMenuItems
        console.log('menuconfig', menuConfig);
        this.leftMenuItems = this.mapMenuListToItems(
          menuConfig['menu-list-left']
        );

        // Mapear menu-list-right a rightMenuItems
        this.rightMenuItems = this.mapMenuListToItems(
          menuConfig['menu-list-right']
        );
      });
  }

  private mapMenuListToItems(menuList: MenuList[]): MenuItem[] {
    return menuList.map((item: MenuList) => {
      const menuItem: MenuItem = {
        label: item.text, // Usar el campo 'text' como label
        routerLink: item['custom-link'], // Usar 'custom-link' como routerLink si existe
        items: item['link-menu']
          ? this.mapLinkMenuToItems(item['link-menu'])
          : undefined, // Mapear 'link-menu' si existe
      };
      return menuItem;
    });
  }

  private mapLinkMenuToItems(linkMenu: LinkMenu[]): MenuItem[] {
    return linkMenu.map((link: LinkMenu) => ({
      label: link.name, // Usar el campo 'name' como label
      routerLink: link.slug, // Usar 'slug' como routerLink
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
}
