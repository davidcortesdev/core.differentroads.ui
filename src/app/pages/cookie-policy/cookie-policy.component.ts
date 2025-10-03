import { Component, OnInit } from '@angular/core';
import { ConsentBannerService } from '../../core/services/consent-banner.service';

@Component({
  selector: 'app-cookie-policy',
  templateUrl: './cookie-policy.component.html',
  styleUrls: ['./cookie-policy.component.scss'],
  standalone: false
})
export class CookiePolicyComponent implements OnInit {

  constructor(private consentBannerService: ConsentBannerService) {}

  ngOnInit(): void {
    // Asegurar que el banner no se muestre en esta página
    // y que el sitio no esté bloqueado
    this.consentBannerService.updateBannerState(false, false);
  }

  /**
   * Método para mostrar el banner de consentimiento
   * Este método se puede llamar desde un botón en la página
   */
  showConsentBanner(): void {
    this.consentBannerService.showBanner();
  }

  /**
   * Método para aceptar el consentimiento directamente
   */
  acceptConsent(): void {
    this.consentBannerService.acceptConsent();
  }

  /**
   * Método para rechazar el consentimiento directamente
   */
  rejectConsent(): void {
    this.consentBannerService.rejectConsent();
  }

  /**
   * Verificar si ya hay consentimiento
   */
  hasConsent(): boolean {
    return this.consentBannerService.hasConsent();
  }
}
