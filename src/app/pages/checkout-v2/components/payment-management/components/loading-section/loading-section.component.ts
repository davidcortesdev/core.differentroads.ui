import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-section',
  standalone: false,
  
  templateUrl: './loading-section.component.html',
  styleUrl: './loading-section.component.scss'
})
export class LoadingSectionComponent {
  @Input() isLoading: boolean = false;
  @Input() paymentType: string = '';
}
