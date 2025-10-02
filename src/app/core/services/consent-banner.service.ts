import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConsentBannerService {
  private showBannerSubject = new BehaviorSubject<boolean>(false);
  public showBanner$: Observable<boolean> = this.showBannerSubject.asObservable();

  private blockWebsiteSubject = new BehaviorSubject<boolean>(true);
  public blockWebsite$: Observable<boolean> = this.blockWebsiteSubject.asObservable();

  constructor() {
    this.checkInitialConsentStatus();
  }

  /**
   * Verifica el estado inicial del consentimiento
   */
  private checkInitialConsentStatus(): void {
    const hasConsent = localStorage.getItem('termly-consent');
    this.updateBannerState(!hasConsent, !hasConsent);
  }

  /**
   * Muestra el banner de consentimiento
   */
  showBanner(): void {
    this.showBannerSubject.next(true);
    this.blockWebsiteSubject.next(true);
  }

  /**
   * Oculta el banner de consentimiento
   */
  hideBanner(): void {
    this.showBannerSubject.next(false);
  }

  /**
   * Bloquea el sitio web
   */
  blockWebsite(): void {
    this.blockWebsiteSubject.next(true);
  }

  /**
   * Desbloquea el sitio web
   */
  unblockWebsite(): void {
    this.blockWebsiteSubject.next(false);
  }

  /**
   * Actualiza el estado del banner y bloqueo
   */
  updateBannerState(showBanner: boolean, blockWebsite: boolean): void {
    this.showBannerSubject.next(showBanner);
    this.blockWebsiteSubject.next(blockWebsite);
  }

  /**
   * Verifica si hay consentimiento guardado
   */
  hasConsent(): boolean {
    return !!localStorage.getItem('termly-consent');
  }

  /**
   * Obtiene el estado actual del bloqueo
   */
  isWebsiteBlocked(): boolean {
    return this.blockWebsiteSubject.value;
  }

  /**
   * Obtiene el estado actual del banner
   */
  isBannerVisible(): boolean {
    return this.showBannerSubject.value;
  }

  /**
   * Marca el consentimiento como aceptado
   */
  acceptConsent(): void {
    localStorage.setItem('termly-consent', 'accepted');
    localStorage.setItem('termly-consent-date', new Date().toISOString());
    this.updateBannerState(false, false);
  }

  /**
   * Marca el consentimiento como rechazado
   */
  rejectConsent(): void {
    localStorage.setItem('termly-consent', 'rejected');
    localStorage.setItem('termly-consent-date', new Date().toISOString());
    this.updateBannerState(false, false);
  }

  /**
   * Resetea el consentimiento (útil para testing o cambio de políticas)
   */
  resetConsent(): void {
    localStorage.removeItem('termly-consent');
    localStorage.removeItem('termly-consent-date');
    this.updateBannerState(true, true);
  }
}
