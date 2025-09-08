import { Component } from '@angular/core';

@Component({
  selector: 'app-standalone',
  standalone: false,
  template: '<router-outlet></router-outlet>',
  styleUrl: './standalone.component.scss'
})
export class StandaloneComponent {
}
