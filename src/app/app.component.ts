import { Component } from '@angular/core';
import { MAIN_NAVIGATION_LINKS } from './shared/constants/seo-links.constants';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'core.differentroads.ui';
  mainNavigationLinks = MAIN_NAVIGATION_LINKS;
}
