import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnInit,
  AfterViewInit,
  Inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { TourDataV2 } from './tour-card-v2.model';

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

  monthlyPrice = 0;
  private originalConsoleWarn: any = null;
  private scalapayInitAttempts = 0;
  private maxScalapayInitAttempts = 3;
  constructor(
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    // Validación más robusta
    if (!this.tourData) {
      console.error(
        'TourData no proporcionado al componente TourCardComponent'
      );
      return;
    }

    // Validate that externalID exists and is not undefined or empty
    if (!this.tourData.externalID?.trim()) {
      console.warn('Missing or invalid externalID:', this.tourData);
    }

    // Pre-calculate monthly price to avoid recalculation in template
    this.monthlyPrice = this.calculateMonthlyPrice();
  }

  ngAfterViewInit(): void {
    if (this.showScalapayPrice) {
      // Suprimir warnings específicos de Scalapay en la consola
      this.suppressScalapayWarnings();

      // Primero cargar el script de ScalaPay
      this.initializeScalapayScript();
    }
  }

  ngOnDestroy(): void {
    // Restaurar la función original de console.warn
    if (this.originalConsoleWarn) {
      console.warn = this.originalConsoleWarn;
    }
  }

  handleTourClick(): void {
    this.router.navigate(['/tour', this.tourData.webSlug]);
  }

  private calculateMonthlyPrice(): number {
    return this.tourData.price / 4;
  }

  private suppressScalapayWarnings(): void {
    // Guardar la función original para restaurarla más tarde
    this.originalConsoleWarn = console.warn;

    // Reemplazar console.warn con una versión filtrada
    console.warn = (...args: any[]) => {
      // Verificar si el mensaje contiene el texto específico que queremos suprimir
      if (
        args[0] &&
        typeof args[0] === 'string' &&
        (args[0].includes('scalapay widget: travel date not found') ||
          args[0].includes('scalapay-widget'))
      ) {
        return; // Suprimir este warning específico
      }

      // Para cualquier otro warning, usar la función original
      this.originalConsoleWarn.apply(console, args);
    };
  }

  /**
   * Inicializa el script de Scalapay
   */
  private initializeScalapayScript(): void {
    if (this.isScalapayScriptLoaded()) {
      // Si el script ya existe, inicializar el widget directamente
      setTimeout(() => {
        this.initializeScalapayWidget();
      }, 100);
      return;
    }

    const script = this.document.createElement('script');
    script.type = 'module';
    script.src = 'https://cdn.scalapay.com/widget/scalapay-widget-loader.js?version=V5';
    
    script.onload = () => {
      // Inicializar el widget después de que se cargue el script
      setTimeout(() => {
        this.initializeScalapayWidget();
      }, 500);
    };
    
    script.onerror = (error) => {
      console.error('Error al cargar widget de Scalapay:', error);
    };
    
    this.document.head.appendChild(script);
  }

  /**
   * Verifica si el script de Scalapay ya está cargado
   */
  private isScalapayScriptLoaded(): boolean {
    return !!this.document.querySelector('script[src*="scalapay-widget-loader.js?version=V5"]');
  }

  /**
   * Inicializa el widget de Scalapay después de que esté cargado el script
   */
  private initializeScalapayWidget(): void {
    this.scalapayInitAttempts++;

    if (!this.tourData.price) {
      if (this.scalapayInitAttempts < this.maxScalapayInitAttempts) {
        setTimeout(() => {
          this.initializeScalapayWidget();
        }, 500);
      }
      return;
    }
    
    // Dar tiempo para que el DOM se actualice antes de disparar el evento
    setTimeout(() => {
      this.dispatchScalapayReloadEvent();
      
      // Verificar si el widget se inicializó correctamente después de un tiempo
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
    const widget = this.document.querySelector('scalapay-widget');
    
    if (!widget) {
      console.error('Widget de Scalapay no encontrado');
      return;
    }
    
    const isVisible = this.isScalapayWidgetVisible();
    
    if (!isVisible) {
      setTimeout(() => {
        this.forceScalapayReload();
      }, 1000);
    }
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
    // Disparar los eventos necesarios
    setTimeout(() => {
      this.dispatchScalapayReloadEvent();
      
      // Si no funciona, intentar inicializar de nuevo
      setTimeout(() => {
        if (!this.isScalapayWidgetVisible()) {
          this.initializeScalapayWidget();
        }
      }, 1000);
    }, 100);
  }
}
