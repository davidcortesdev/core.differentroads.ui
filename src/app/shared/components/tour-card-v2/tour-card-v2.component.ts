import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  Inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { TourDataV2 } from './tour-card-v2.model';
import { AnalyticsService } from '../../../core/services/analytics/analytics.service';
import { AuthenticateService } from '../../../core/services/auth/auth-service.service';

@Component({
  selector: 'app-tour-card-v2',
  standalone: false,
  templateUrl: './tour-card-v2.component.html',
  styleUrls: ['./tour-card-v2.component.scss'],
})
export class TourCardV2Component implements OnInit, AfterViewInit {
  @Input() tourData!: TourDataV2;
  @Input() isLargeCard = false;
  @Input() showScalapayPrice = false;
  @Input() itemListId?: string; // ID de la lista para analytics
  @Input() itemListName?: string; // Nombre de la lista para analytics
  @Input() index?: number; // Índice del item en la lista

  monthlyPrice = 0;
  private scalapayInitAttempts = 0;
  private maxScalapayInitAttempts = 3;
  private scalapayReloadAttempts = 0;
  private maxScalapayReloadAttempts = 2;
  private scalapayReadyListener?: () => void;
  
  constructor(
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    private analyticsService: AnalyticsService,
    private authService: AuthenticateService
  ) {}

  ngOnInit(): void {
    // Validación más robusta
    if (!this.tourData) {
      return;
    }

    // Validate that externalID exists and is not undefined or empty
    if (!this.tourData.externalID?.trim()) {
    }

    // Pre-calculate monthly price to avoid recalculation in template
    this.monthlyPrice = this.calculateMonthlyPrice();
  }

  ngAfterViewInit(): void {
    if (this.showScalapayPrice) {
      this.scalapayReadyListener = () => {
        this.initializeScalapayWidget();
      };
      window.addEventListener('scalapay-ready', this.scalapayReadyListener);

      this.initializeScalapayScript();
    }
  }

  ngOnDestroy(): void {
    // Remover el listener de scalapay-ready
    if (this.scalapayReadyListener) {
      window.removeEventListener('scalapay-ready', this.scalapayReadyListener);
    }
  }

  handleTourClick(): void {
    // Disparar evento select_item si tenemos información de la lista
    if (this.itemListId && this.itemListName) {
      this.analyticsService.getCurrentUserData().subscribe(userData => {
        // Usar el método helper para construir el item de forma consistente
        const item = this.analyticsService.convertTourToEcommerceItem(
          this.tourData,
          this.itemListId!,
          this.itemListName!,
          this.index || 0
        );
        
        this.analyticsService.selectItem(
          this.itemListId!,
          this.itemListName!,
          item,
          userData
        );
      });
    }
    
    // Navegar pasando los datos a través del state (sin modificar la URL visible)
    if (this.itemListId && this.itemListName) {
      this.router.navigate(['/tour', this.tourData.webSlug], {
        state: {
          listId: this.itemListId, // Pasar el ID real de la lista directamente
          listName: this.itemListName
        }
      });
    } else {
      this.router.navigate(['/tour', this.tourData.webSlug]);
    }
  }

  private calculateMonthlyPrice(): number {
    return this.tourData.price / 4;
  }

  /**
   * Obtener datos del usuario actual si está logueado
   */
  private getUserData() {
    if (this.authService.isAuthenticatedValue()) {
      const email = this.authService.getUserEmailValue();
      const userId = this.authService.getCognitoIdValue();
      const phone = '';
      
      return this.analyticsService.getUserData(
        email,
        phone,
        userId
      );
    }
    return undefined;
  }

  /**
   * Inicializa el script de Scalapay
   */
  private initializeScalapayScript(): void {
    const customElementDefined = customElements.get('scalapay-widget') !== undefined;
    
    if (customElementDefined) {
      setTimeout(() => {
        this.initializeScalapayWidget();
      }, 100);
    } else {
      this.scalapayInitAttempts++;
      if (this.scalapayInitAttempts < 5) {
        setTimeout(() => {
          this.initializeScalapayScript();
        }, 500);
      }
    }
  }

  /**
   * Verifica si el script de Scalapay ya está cargado
   */
  private isScalapayScriptLoaded(): boolean {
    return customElements.get('scalapay-widget') !== undefined;
  }

  /**
   * Inicializa el widget de Scalapay después de que esté cargado el script
   */
  private initializeScalapayWidget(): void {
    if (!this.tourData.price) {
      this.scalapayInitAttempts++;
      if (this.scalapayInitAttempts < this.maxScalapayInitAttempts) {
        setTimeout(() => {
          this.initializeScalapayWidget();
        }, 500);
      }
      return;
    }
    
    setTimeout(() => {
      this.dispatchScalapayReloadEvent();
      
      setTimeout(() => {
        this.verifyWidgetInitialization();
      }, 2000);
    }, 200);
  }

  /**
   * Dispara el evento de recarga de Scalapay
   */
  private dispatchScalapayReloadEvent(): void {
    const event = new CustomEvent('scalapay-widget-reload');
    window.dispatchEvent(event);
  }

  /**
   * Verifica que el widget se haya inicializado correctamente
   */
  private verifyWidgetInitialization(): void {
    setTimeout(() => {
      const widget = this.document.querySelector('scalapay-widget');
      
      if (!widget) return;
      
      const isVisible = this.isScalapayWidgetVisible();
      
      if (!isVisible) {
        this.forceScalapayReload();
      }
    }, 500);
  }

  /**
   * Verifica si el widget de Scalapay está visible
   */
  private isScalapayWidgetVisible(): boolean {
    const widget = this.document.querySelector('scalapay-widget');
    if (!widget) return false;
    
    const hasContent = widget.children.length > 0 || 
                      (widget.textContent?.trim().length || 0) > 0 || 
                      ((widget as HTMLElement).innerHTML?.trim().length || 0) > 0;
    
    return hasContent;
  }

  /**
   * Fuerza la recarga completa del widget de Scalapay
   */
  private forceScalapayReload(): void {
    this.scalapayReloadAttempts++;
    
    if (this.scalapayReloadAttempts > this.maxScalapayReloadAttempts) {
      return;
    }
    
    setTimeout(() => {
      this.dispatchScalapayReloadEvent();
    }, 100);
  }
}
