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
      this.loadScalapayScript();
    }
  }

  handleTourClick(): void {
    this.router.navigate(['/tour', this.tourData.webSlug]);
  }

  private calculateMonthlyPrice(): number {
    return this.tourData.price / 4;
  }

  // Método para cargar el script de Scalapay
  private loadScalapayScript(): void {
    // Carga el script si no existe
    if (!this.document.querySelector('script[src*="scalapay-widget-loader.js"]')) {
      const script = this.document.createElement('script');
      script.type = 'module';
      script.src = 'https://cdn.scalapay.com/widget/scalapay-widget-loader.js';
      
      // Usar el evento onload en lugar de setTimeout
      script.onload = () => this.configureScalapayWidget();
      this.document.head.appendChild(script);
    } else {
      // Si el script ya está cargado, configurar el widget directamente
      this.configureScalapayWidget();
    }
  }

  private configureScalapayWidget(): void {
    const priceContainerId = `price-container-${this.scalapayWidgetId}`;
    const priceContainer = this.document.getElementById(priceContainerId);
    if (priceContainer) {
      priceContainer.textContent = `€ ${this.tourData.price.toFixed(2)}`;
      
      // Lanzar evento para que el widget de Scalapay se actualice
      const event = new CustomEvent('scalapay-widget-reload');
      window.dispatchEvent(event);
    }
  }
}