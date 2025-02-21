import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-banner',
  standalone: false,
  
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss']
})

export class BannerComponent {
  @Input() imageUrl: string = '';
  @Input() title: string = '';
  @Input() subtitle?: string;
  @Input() hideSubtitle: boolean = true; 


   // Variables para el componente TitleAndQuill
   @Input() bannerTitle: string = 'Título por defecto';
   @Input() bannerDescription: string = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum';

   @Input() pageType: 'collection' | 'landing' = 'landing';
 }
