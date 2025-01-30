import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';

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

  ngOnInit() {
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
