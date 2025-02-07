import { Component } from '@angular/core';

interface Highlight {
  imageUrl: string;
  title: string;
  description: string;
  buttonUrl: string;
}

@Component({
  selector: 'app-highlight-section',
  standalone: false,
  templateUrl: './highlight-section.component.html',
  styleUrls: ['./highlight-section.component.scss'],
})
export class HighlightSectionComponent {
  highlight: Highlight = {
    imageUrl: '/image-highligths.jpg',
    title: 'Descubriendo los misterios de África',
    description:
      'Lorem ipsum dolor sit amet consectetur. Arcu odio et sagittis mattis id et porttitor orci. Elementum amet venenatis nec ac vulputate nullam. Ut pellentesque non a laoreet. Congue risus erat at tortor interdum ipsum massa.',
    buttonUrl: 'tour/view',
  };
}
