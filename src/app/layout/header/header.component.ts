import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { LanguageService } from '../../core/services/language.service';
import { TranslateService } from '@ngx-translate/core';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  selectedLanguage: string = 'ES';
  languages: string[] = ['ES', 'EN'];
  filteredLanguages: string[] = [];
  leftMenuItems: MenuItem[] | undefined;
  rightMenuItems: MenuItem[] | undefined;

  constructor(
    private languageService: LanguageService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.initializeMenus();
    this.languageService.getCurrentLang().subscribe(lang => {
      this.selectedLanguage = lang.toUpperCase();
    });
  }

  filterLanguages(event: AutoCompleteCompleteEvent) {
    const query = event.query.toUpperCase();
    this.filteredLanguages = this.languages.filter(lang => 
      lang.includes(query)
    );
  }

  onLanguageChange(lang: any) {
    this.languageService.setLanguage(lang.toLowerCase());
  }

  private initializeMenus() {
    this.leftMenuItems = [
      { label: 'ABOUT' },
      { label: 'PRENSA' },
      { label: 'BLOG' }
    ];

    this.rightMenuItems = [
      {
        label: 'DESTINOS',
        items: [
          { label: 'Europa' },
          { label: 'Asia' },
          { label: 'África' }
        ]
      },
      {
        label: 'TEMPORADA',
        items: [
          { label: 'Verano 2024' },
          { label: 'Invierno 2024' }
        ]
      },
      {
        label: 'TIPO DE VIAJE',
        items: [
          { label: 'Cultural' },
          { label: 'Aventura' },
          { label: 'Relax' }
        ]
      },
      { label: 'LAST MINUTE' }
    ];
  }
}
