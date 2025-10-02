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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthenticateService } from '../../core/services/auth-service.service';

// Constants for contact information
const CONTACT_INFO = {
  PHONE: '+34 91 123 45 67',
  EMAIL: 'info@differentroads.com',
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
  isSubscribed = false;
  formLoaded = false;
  private scriptLoaded = false;
  emailForm: FormGroup;
  private subscription: Subscription = new Subscription();
  
  // Enlaces del footer para SEO
  seoFooterLinks = FOOTER_LINKS;

  // Contact info constants
  readonly contactInfo = CONTACT_INFO;

  constructor(
    private cmsFooterColumnService: CMSFooterColumnService,
    private cmsFooterLinkService: CMSFooterLinkService,
    private renderer: Renderer2,
    private el: ElementRef,
    private fb: FormBuilder,
    private analyticsService: AnalyticsService,
    private authService: AuthenticateService
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit() {
    this.fetchCMSFooterData();
  }

  ngAfterViewInit() {
    this.loadMailerLiteScript();
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

  // Optimize script loading with better error handling and performance
  loadMailerLiteScript(): void {
    // Verificar si el script ya está cargado
    if (document.getElementById('mailer-lite-script')) {
      this.scriptLoaded = true;
      this.setupFormListener();
      return;
    }

    // Usar un timeout para evitar bloqueos
    const timeoutId = setTimeout(() => {
      console.error('Timeout loading MailerLite script');
    }, 10000); // 10 segundos de timeout

    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(script, 'id', 'mailer-lite-script');
    this.renderer.setAttribute(
      script,
      'src',
      'https://static.mailerlite.com/js/w/webforms.min.js?vd4de52e171e8eb9c47c0c20caf367ddf'
    );
    this.renderer.setAttribute(script, 'type', 'text/javascript');
    this.renderer.setAttribute(script, 'async', 'true');
    this.renderer.setAttribute(script, 'defer', 'true');

    // Mejorar los event listeners para la carga del script
    this.renderer.listen(script, 'load', () => {
      clearTimeout(timeoutId);
      this.scriptLoaded = true;
      this.setupFormListener();
    });

    this.renderer.listen(script, 'error', (event) => {
      clearTimeout(timeoutId);
      console.error('Failed to load MailerLite script:', event);
      // Implementar una estrategia de fallback si es necesario
    });

    this.renderer.appendChild(document.body, script);
  }

  private setupFormListener(): void {
    // Usar un enfoque más robusto para encontrar el formulario
    const maxRetries = 5;
    let retries = 0;

    const findAndSetupForm = () => {
      const form = this.el.nativeElement.querySelector('.ml-block-form');
      if (form) {
        this.renderer.listen(form, 'submit', (event) =>
          this.handleFormSubmit(event)
        );
        this.formLoaded = true;
        return true;
      }
      return false;
    };

    // Intentar encontrar el formulario inmediatamente
    if (findAndSetupForm()) {
      return;
    }

    // Si no se encuentra, intentar con un intervalo
    const intervalId = setInterval(() => {
      retries++;
      if (findAndSetupForm() || retries >= maxRetries) {
        clearInterval(intervalId);
        if (retries >= maxRetries && !this.formLoaded) {
          console.warn(
            'No se pudo encontrar el formulario después de varios intentos'
          );
        }
      }
    }, 300);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();

    if (this.emailForm.invalid) {
      return;
    }

    const submitBtn = this.el.nativeElement.querySelector(
      '.ml-subscribe-form-6075553 button[type="submit"]'
    );
    const loadingBtn = this.el.nativeElement.querySelector(
      '.ml-subscribe-form-6075553 button.loading'
    );

    if (submitBtn && loadingBtn) {
      this.renderer.setStyle(submitBtn, 'display', 'none');
      this.renderer.setStyle(loadingBtn, 'display', 'inline-block');
    }

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = this.emailForm.get('email')?.value;

    // Aquí normalmente enviarías los datos a tu API
    // Por ahora, simulamos una respuesta exitosa
    setTimeout(() => {
      const formElement = this.el.nativeElement.querySelector(
        '.ml-subscribe-form-6075553 .row-form'
      );
      const successElement = this.el.nativeElement.querySelector(
        '.ml-subscribe-form-6075553 .row-success'
      );
      const titleElement = this.el.nativeElement.querySelector(
        '.newsletter .title.inicial'
      );

      if (formElement) this.renderer.setStyle(formElement, 'display', 'none');
      if (successElement)
        this.renderer.setStyle(successElement, 'display', 'block');
      if (titleElement) this.renderer.setStyle(titleElement, 'display', 'none');

      this.isSubscribed = true;
    }, 2000);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Disparar evento footer_interaction cuando el usuario hace clic en elementos del footer
   */
  onFooterInteraction(clickElement: string): void {
    // Enviar evento inmediatamente al dataLayer ANTES de navegar
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: 'footer_interaction',
      clic_element: clickElement,
      user_data: this.getUserData()
    });
    
    this.analyticsService.footerInteraction(
      clickElement,
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
