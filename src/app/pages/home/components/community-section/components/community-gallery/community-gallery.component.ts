import { Component } from '@angular/core';

@Component({
  selector: 'app-community-gallery',
  standalone: false,
  templateUrl: './community-gallery.component.html',
  styleUrls: ['./community-gallery.component.scss']
})
export class CommunityGalleryComponent {
  communityImages = [
    {
      url: 'assets/images/community/1.jpg',
      location: 'Islandia',
      username: '@nombre_user22'
    }
    // Add more images as needed
  ];

  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 3,
      numScroll: 1
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 1
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1
    }
  ];
}
