import { Component, Input } from '@angular/core';
import { TravelerCard } from '../../../../../../core/models/home/travelers/traveler-card.model';

@Component({
  selector: 'app-community-gallery',
  standalone: false,
  templateUrl: './community-gallery.component.html',
  styleUrls: ['./community-gallery.component.scss'],
})
export class CommunityGalleryComponent {
  @Input() communityImages: TravelerCard[] = [];

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
