import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-consent-banner',
  templateUrl: './consent-banner.component.html',
  styleUrls: ['./consent-banner.component.scss'],
  standalone: false
})
export class ConsentBannerComponent implements OnInit, OnDestroy {
  showBanner: boolean = false;
  private termlyScript: any;

  ngOnInit(): void {
    this.checkConsentStatus();
    this.setupTermlyListeners();
  }

  ngOnDestroy(): void {
    if (this.termlyScript) {
      this.termlyScript.removeEventListener('consentChanged', this.onConsentChanged);
    }
  }

  private checkConsentStatus(): void {
    // Verificar si ya hay consentimiento guardado
    const hasConsent = localStorage.getItem('termly-consent');
    if (!hasConsent) {
      this.showBanner = true;
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
    this.showBanner = false;
    localStorage.setItem('termly-consent', 'accepted');
    localStorage.setItem('termly-consent-date', new Date().toISOString());
    
    // Notificar a Termly que se aceptó el consentimiento
    if (this.termlyScript && this.termlyScript.acceptAll) {
      this.termlyScript.acceptAll();
    }
  }

  rejectConsent(): void {
    this.showBanner = false;
    localStorage.setItem('termly-consent', 'rejected');
    localStorage.setItem('termly-consent-date', new Date().toISOString());
    
    // Notificar a Termly que se rechazó el consentimiento
    if (this.termlyScript && this.termlyScript.rejectAll) {
      this.termlyScript.rejectAll();
    }
  }

  showConsentBanner(): void {
    this.showBanner = true;
  }

  hideConsentBanner(): void {
    this.showBanner = false;
  }
}
