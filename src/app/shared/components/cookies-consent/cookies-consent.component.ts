import { Component } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-cookies-consent',
  standalone: false,

  templateUrl: './cookies-consent.component.html',
  styleUrls: ['./cookies-consent.component.scss'],
})
export class CookiesConsentComponent {
  cookiesAccepted = false;
  showOptions = false;

  essentialCookies = true; // Always enabled
  necessaryCookies = false;
  advertisingCookies = false;
  analyticsCookies = false;

  constructor(private cookieService: CookieService) {}

  ngOnInit(): void {
    this.cookiesAccepted = this.cookieService.check('cookiesAccepted');
    this.necessaryCookies = this.cookieService.check('necessaryCookies');
    this.advertisingCookies = this.cookieService.check('advertisingCookies');
    this.analyticsCookies = this.cookieService.check('analyticsCookies');
  }

  acceptAllCookies(): void {
    this.cookieService.set('cookiesAccepted', 'true', 365); // Expira en 1 año
    this.cookieService.set('necessaryCookies', 'true', 365);
    this.cookieService.set('advertisingCookies', 'true', 365);
    this.cookieService.set('analyticsCookies', 'true', 365);
    this.cookiesAccepted = true;
  }

  rejectAllCookies(): void {
    this.cookieService.set('cookiesAccepted', 'false', 365);
    this.cookieService.delete('necessaryCookies');
    this.cookieService.delete('advertisingCookies');
    this.cookieService.delete('analyticsCookies');
    this.cookiesAccepted = true;
  }

  showMoreOptions(): void {
    this.showOptions = true;
  }

  toggleNecessaryCookies(): void {
    this.necessaryCookies = !this.necessaryCookies;
  }

  toggleAdvertisingCookies(): void {
    this.advertisingCookies = !this.advertisingCookies;
  }

  toggleAnalyticsCookies(): void {
    this.analyticsCookies = !this.analyticsCookies;
  }

  confirmCookiePreferences(): void {
    this.cookieService.set('cookiesAccepted', 'true', 365);
    this.cookieService.set(
      'necessaryCookies',
      this.necessaryCookies.toString(),
      365
    );
    this.cookieService.set(
      'advertisingCookies',
      this.advertisingCookies.toString(),
      365
    );
    this.cookieService.set(
      'analyticsCookies',
      this.analyticsCookies.toString(),
      365
    );
    this.cookiesAccepted = true;
    this.showOptions = false;
  }
}
