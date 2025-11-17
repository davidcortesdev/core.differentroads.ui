import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  Renderer2,
  OnDestroy,
} from '@angular/core';
import { FOOTER_LINKS } from '../../shared/constants/seo-links.constants';
import {
  CMSFooterColumnService,
  IFooterColumnResponse,
} from '../../core/services/cms/cms-footer-column.service';
import {
  CMSFooterLinkService,
  IFooterLinkResponse,
} from '../../core/services/cms/cms-footer-link.service';
import { Subscription } from 'rxjs';
import { AnalyticsService } from '../../core/services/analytics/analytics.service';
import { AuthenticateService } from '../../core/services/auth/auth-service.service';

// Constants for contact information
const CONTACT_INFO = {
  PHONE: '+34 96 502 71 04',
  EMAIL: 'info@differentroads.es',
} as const;

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: false,
})
export class FooterComponent implements OnInit, AfterViewInit, OnDestroy {
  footerColumns: IFooterColumnResponse[] = [];
  footerLinks: IFooterLinkResponse[] = [];
  private subscription: Subscription = new Subscription();
  private hubspotScriptElement?: HTMLScriptElement;
  
  // Enlaces del footer para SEO
  seoFooterLinks = FOOTER_LINKS;

  // Contact info constants
  readonly contactInfo = CONTACT_INFO;

  constructor(
    private cmsFooterColumnService: CMSFooterColumnService,
    private cmsFooterLinkService: CMSFooterLinkService,
    private renderer: Renderer2,
    private el: ElementRef,
    private analyticsService: AnalyticsService,
    private authService: AuthenticateService
  ) {}

  ngOnInit() {
    this.fetchCMSFooterData();
  }

  ngAfterViewInit() {
    this.loadHubspotScript();
  }

  fetchCMSFooterData() {
    // Obtener las columnas del footer
    this.subscription.add(
      this.cmsFooterColumnService
        .getAllFooterColumns({ isActive: true })
        .subscribe({
          next: (columns: IFooterColumnResponse[]) => {
            this.footerColumns = columns.sort((a, b) => a.orden - b.orden);
            this.fetchFooterLinks();
          },
          error: (error) =>
            console.error('Error fetching footer columns:', error),
        })
    );
  }

  fetchFooterLinks() {
    // Obtener todos los links del footer
    this.subscription.add(
      this.cmsFooterLinkService
        .getAllFooterLinks({ isActive: true })
        .subscribe({
          next: (links: IFooterLinkResponse[]) => {
            this.footerLinks = links.sort((a, b) => a.orden - b.orden);
          },
          error: (error) =>
            console.error('Error fetching footer links:', error),
        })
    );
  }

  getFooterLinksByColumnId(columnId: number): IFooterLinkResponse[] {
    return this.footerLinks.filter((link) => link.footerColumnId === columnId);
  }

  private loadHubspotScript(): void {
    const placeholder = this.el.nativeElement.querySelector('.hs-form-frame');

    if (!placeholder) {
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://js.hsforms.net/forms/embed/48239860.js"]'
    );

    if (existingScript) {
      return;
    }

    this.hubspotScriptElement = this.renderer.createElement('script');
    this.renderer.setAttribute(
      this.hubspotScriptElement,
      'src',
      'https://js.hsforms.net/forms/embed/48239860.js'
    );
    this.renderer.setAttribute(this.hubspotScriptElement, 'defer', 'true');
    this.renderer.setAttribute(this.hubspotScriptElement, 'type', 'text/javascript');

    this.renderer.appendChild(document.body, this.hubspotScriptElement);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();

    if (this.hubspotScriptElement) {
      try {
        this.renderer.removeChild(document.body, this.hubspotScriptElement);
      } catch (error) {
        // Ignore if script was already removed by the browser
      }
    }
  }

  /**
   * Disparar evento footer_interaction cuando el usuario hace clic en elementos del footer
   */
  onFooterInteraction(clickElement: string): void {
    this.analyticsService.footerInteraction(
      clickElement,
      this.getUserData()
    );
  }

  /**
   * Disparar evento click_contact cuando el usuario hace clic en elementos de contacto
   */
  onContactClick(clickElement: string, contactUrl: string): void {
    this.analyticsService.clickContact(
      clickElement,
      contactUrl,
      this.getUserData()
    );
  }

  /**
   * Obtener datos del usuario para analytics
   */
  private getUserData() {
    if (this.authService.isAuthenticatedValue()) {
      return this.analyticsService.getUserData(
        this.authService.getUserEmailValue(),
        undefined, // No tenemos teléfono en el footer
        this.authService.getCognitoIdValue()
      );
    }
    return undefined;
  }

}
