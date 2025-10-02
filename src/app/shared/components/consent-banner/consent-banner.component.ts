import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ConsentBannerService } from '../../../core/services/consent-banner.service';

@Component({
  selector: 'app-consent-banner',
  templateUrl: './consent-banner.component.html',
  styleUrls: ['./consent-banner.component.scss'],
  standalone: false
})
export class ConsentBannerComponent implements OnInit, OnDestroy {
  showBanner: boolean = false;
  blockWebsite: boolean = true;
  private termlyScript: any;
  private currentRoute: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private consentBannerService: ConsentBannerService
  ) {}

  ngOnInit(): void {
    this.setupServiceSubscriptions();
    this.checkConsentStatus();
    this.setupTermlyListeners();
    this.setupRouteListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.termlyScript) {
      this.termlyScript.removeEventListener('consentChanged', this.onConsentChanged);
    }
  }

  private setupServiceSubscriptions(): void {
    // Suscribirse a cambios en el estado del banner
    this.consentBannerService.showBanner$
      .pipe(takeUntil(this.destroy$))
      .subscribe((show: boolean) => this.showBanner = show);

    this.consentBannerService.blockWebsite$
      .pipe(takeUntil(this.destroy$))
      .subscribe((block: boolean) => this.blockWebsite = block);
  }

  private setupRouteListener(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.updateBannerVisibility();
      });
  }

  private checkConsentStatus(): void {
    // Verificar si ya hay consentimiento guardado
    const hasConsent = localStorage.getItem('termly-consent');
    this.updateBannerVisibility();
  }

  private updateBannerVisibility(): void {
    const hasConsent = this.consentBannerService.hasConsent();
    const isCookiePolicyPage = this.currentRoute.includes('politica-de-cookies') || 
                               this.currentRoute.includes('cookie-policy') ||
                               this.currentRoute.includes('privacy-policy');
    
    if (hasConsent) {
      // Si ya hay consentimiento, no mostrar banner y no bloquear
      this.consentBannerService.updateBannerState(false, false);
    } else if (isCookiePolicyPage) {
      // Si está en página de política de cookies, no mostrar banner pero permitir navegación
      this.consentBannerService.updateBannerState(false, false);
    } else {
      // En cualquier otra página sin consentimiento, mostrar banner y bloquear
      this.consentBannerService.updateBannerState(true, true);
    }
  }

  private setupTermlyListeners(): void {
    // Esperar a que Termly esté disponible
    if (typeof window !== 'undefined' && (window as any).Termly) {
      this.termlyScript = (window as any).Termly;
      this.termlyScript.addEventListener('consentChanged', this.onConsentChanged.bind(this));
    } else {
      // Si Termly no está disponible aún, intentar de nuevo en 100ms
      setTimeout(() => this.setupTermlyListeners(), 100);
    }
  }

  private onConsentChanged(event: any): void {
    console.log('Consent changed:', event);
    if (event.detail && event.detail.consent) {
      this.acceptConsent();
    }
  }

  acceptConsent(): void {
    this.consentBannerService.acceptConsent();
    
    // Notificar a Termly que se aceptó el consentimiento
    if (this.termlyScript && this.termlyScript.acceptAll) {
      this.termlyScript.acceptAll();
    }
  }

  rejectConsent(): void {
    this.consentBannerService.rejectConsent();
    
    // Notificar a Termly que se rechazó el consentimiento
    if (this.termlyScript && this.termlyScript.rejectAll) {
      this.termlyScript.rejectAll();
    }
  }

  // Método público para mostrar el banner desde páginas externas
  showConsentBanner(): void {
    this.consentBannerService.showBanner();
  }

  // Método público para ocultar el banner
  hideConsentBanner(): void {
    this.consentBannerService.hideBanner();
  }

  // Método para obtener el estado del bloqueo
  isWebsiteBlocked(): boolean {
    return this.consentBannerService.isWebsiteBlocked();
  }
}
