import { Component } from '@angular/core';

@Component({
  selector: 'app-community-gallery',
  standalone: false,
  templateUrl: './community-gallery.component.html',
  styleUrls: ['./community-gallery.component.scss'],
})
export class CommunityGalleryComponent {
  communityImages = [
    {
      url: 'https://picsum.photos/800/800?random=1',
      location: 'Islandia',
      username: '@nombre_user22',
    },
    {
      url: 'https://picsum.photos/800/800?random=2',
      location: 'España',
      username: '@viajero99',
    },
    {
      url: 'https://picsum.photos/800/800?random=3',
      location: 'Japón',
      username: '@sakura_fan',
    },
    {
      url: 'https://picsum.photos/800/800?random=4',
      location: 'Brasil',
      username: '@aventurero34',
    },
    {
      url: 'https://picsum.photos/800/800?random=5',
      location: 'Canadá',
      username: '@explorador_ca',
    },
    {
      url: 'https://picsum.photos/800/800?random=6',
      location: 'Australia',
      username: '@koala_life',
    },
    {
      url: 'https://picsum.photos/800/800?random=7',
      location: 'Noruega',
      username: '@northern_lights',
    },
    {
      url: 'https://picsum.photos/800/800?random=8',
      location: 'Italia',
      username: '@pizza_lover',
    },
    {
      url: 'https://picsum.photos/800/800?random=9',
      location: 'Tailandia',
      username: '@playa_paraíso',
    },
    {
      url: 'https://picsum.photos/800/800?random=10',
      location: 'México',
      username: '@cultura_mex',
    },
    {
      url: 'https://picsum.photos/800/800?random=11',
      location: 'Egipto',
      username: '@piramides_eg',
    },
    {
      url: 'https://picsum.photos/800/800?random=12',
      location: 'Sudáfrica',
      username: '@safari_adventure',
    },
  ];

  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1,
    },
  ];
}
