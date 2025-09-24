import { Component, Input, ChangeDetectionStrategy, OnInit, AfterViewInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';

interface TourData {
  imageUrl: string;
  title: string;
  rating: number;
  isByDr?: boolean;
  tag?: string;
  description: string;
  price: number;
  availableMonths: string[];
  webSlug: string;
  tripType?: string[];
  externalID?: string;
}

enum TripType {
  Single = 'single',
  Grupo = 'grupo',
  Propios = 'propios',
  Fit = 'fit'
}

type TripTypeKey = typeof TripType[keyof typeof TripType];

interface TripTypeInfo {
  label: string;
  class: string;
}

@Component({
  selector: 'app-tour-card',
  standalone: false,
  templateUrl: './tour-card.component.html',
  styleUrls: ['./tour-card.component.scss'],
})
export class TourCardComponent implements OnInit, AfterViewInit {
  @Input() tourData!: TourData;
  @Input() isLargeCard = false;
  @Input() showScalapayPrice = false;

  monthlyPrice = 0;
  scalapayWidgetId = '';
  private originalConsoleWarn: any = null;
  constructor(
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    // Validación más robusta
    if (!this.tourData) {
      console.error('TourData no proporcionado al componente TourCardComponent');
      return;
    }
  
    // Validate that externalID exists and is not undefined or empty
    if (!this.tourData.externalID?.trim()) {
      console.warn('Missing or invalid externalID:', this.tourData);
    }
  
    // Pre-calculate monthly price to avoid recalculation in template
    this.monthlyPrice = this.calculateMonthlyPrice();
    // Generar ID único para el widget de Scalapay
    this.scalapayWidgetId = `scalapay-widget-${Math.random().toString(36).substr(2, 9)}`;
  }

  ngAfterViewInit(): void {
    if (this.showScalapayPrice) {
      // Suprimir warnings específicos de Scalapay en la consola
      this.suppressScalapayWarnings();
     
      // Cargar el script de Scalapay
      this.loadScalapayScript();
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
      if (args[0] && typeof args[0] === 'string' &&
         (args[0].includes('scalapay widget: travel date not found') ||
          args[0].includes('scalapay-widget'))) {
        return; // Suprimir este warning específico
      }
     
      // Para cualquier otro warning, usar la función original
      this.originalConsoleWarn.apply(console, args);
    };
  }
 
  private loadScalapayScript(): void {
    // // Verificar si el script ya está cargado
    // const scriptExists = !!this.document.querySelector('script[src*="scalapay-widget-loader.js"]');
   
    // if (!scriptExists) {
    //   console.log('Cargando script de Scalapay...');
     
    //   // Crear el script
    //   const script = this.document.createElement('script');
    //   script.type = 'module';
    //   script.src = 'https://cdn.scalapay.com/widget/scalapay-widget-loader.js';
     
    //   // Manejar los eventos del script
    //   script.onload = () => {
    //     this.configureScalapayWidget();
    //   };
     
    //   script.onerror = (error) => {
    //     console.error('Error al cargar script de Scalapay:', error);
    //   };
     
    //   // Añadir el script al head
    //   this.document.head.appendChild(script);
    // } else {
 
    //   this.configureScalapayWidget();
    // }
  }
 
  private configureScalapayWidget(): void {
    // Verificar si el objeto Scalapay está disponible en window
    if (!(window as any).ScalapayWidgetUI) {
     
      // Intentar de nuevo después de un tiempo
      setTimeout(() => {
        this.configureScalapayWidget();
      }, 500);
     
      return;
    }
   
    try {
      // Configurar Scalapay con los datos del producto
     
      (window as any).ScalapayWidgetUI.configure({
        amount: this.tourData.price,
        currency: 'EUR',
        numberOfInstallments: 4,
        locale: 'es',
        channel: 'travel',
        environment: 'integration',
        merchantToken: '8KDS3SPEL'
      });
     
      // Disparar evento para recargar widgets
      window.dispatchEvent(new CustomEvent('scalapay-widget-reload'));
 
    } catch (error) {
      console.error('Error al configurar Scalapay:', error);
    }
  }
}