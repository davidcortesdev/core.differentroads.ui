import { Component } from '@angular/core';

@Component({
  selector: 'app-partners-section',
  standalone: false,
  templateUrl: './partners-section.component.html',
  styleUrl: './partners-section.component.scss',
})
export class PartnersSectionComponent {
  partners = [
    {
      alt: 'Ethan',
      url: 'https://picsum.photos/280/70?random=1',
    },
    {
      alt: '∏Essie',
      url: 'https://picsum.photos/280/70?random=2',
    },
    {
      alt: 'Bertie',
      url: 'https://picsum.photos/280/70?random=3',
    },
    {
      alt: 'LeonEthan',
      url: 'https://picsum.photos/280/70?random=4',
    },
  ];
}
