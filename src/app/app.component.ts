import { Component, OnDestroy, OnInit } from '@angular/core';
import { MAIN_NAVIGATION_LINKS } from './shared/constants/seo-links.constants';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'core.differentroads.ui';
  mainNavigationLinks = MAIN_NAVIGATION_LINKS;

  constructor() {}

  ngOnInit(): void {
    if (!environment.production) {
      document.body.classList.add('with-test-banner');
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('with-test-banner');
  }
}
