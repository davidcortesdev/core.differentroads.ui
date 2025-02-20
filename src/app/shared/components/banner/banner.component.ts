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
}
