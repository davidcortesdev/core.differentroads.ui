import { Component, Input } from '@angular/core';
import { TravelerCard } from '../../../../../../core/models/blocks/travelers/traveler-card.model';

@Component({
  selector: 'app-community-gallery',
  standalone: false,
  templateUrl: './community-gallery.component.html',
  styleUrls: ['./community-gallery.component.scss'],
})
export class CommunityGalleryComponent {
  @Input() communityImages: TravelerCard[] = [];
}
