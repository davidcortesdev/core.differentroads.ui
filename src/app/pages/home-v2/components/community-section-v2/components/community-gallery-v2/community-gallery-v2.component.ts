import { Component, Input } from '@angular/core';
import { TravelerCard } from '../../../../../../core/models/blocks/travelers/traveler-card.model';

@Component({
  selector: 'app-community-gallery-v2',
  standalone: false,
  templateUrl: './community-gallery-v2.component.html',
  styleUrls: ['./community-gallery-v2.component.scss'],
})
export class CommunityGalleryV2Component {
  @Input() communityImages: TravelerCard[] = [];
}
