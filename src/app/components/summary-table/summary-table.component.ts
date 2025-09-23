import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageModule } from 'primeng/message';
import { PointsCalculatorService } from '../../core/services/checkout/points-calculator.service';
import { ReservationService, IReservationSummaryResponse } from '../../core/services/reservation/reservation.service';
import { MessageService } from 'primeng/api';
import { Subject, EMPTY } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

export interface SummaryItem {
  description?: string;
  qty?: number;
  value?: number | null;
  isDiscount?: boolean;
}

@Component({
  selector: 'app-summary-table',
  standalone: false,
  templateUrl: './summary-table.component.html',
  styleUrls: ['./summary-table.component.scss'],
})
export class SummaryTableComponent implements OnInit, OnDestroy, OnChanges {
  // NUEVO: Input para reservationId
  @Input() reservationId: number | undefined;
  
  // NUEVO: Input para escuchar actualizaciones
  @Input() refreshTrigger: any = null;
  
  @Input() summary: SummaryItem[] = [];
  @Input() currency: string = 'EUR';
  @Input() customClass: string = '';

  // Mapping properties
  @Input() descriptionField: string = 'description';
  @Input() qtyField: string = 'qty';
  @Input() valueField: string = 'value';
  @Input() isDiscountField: string = 'isDiscount';
  @Input() isDiscountFn: (item: any) => boolean = (item) =>
    item[this.isDiscountField] ||
    (item[this.descriptionField] &&
      item[this.descriptionField].toLowerCase().includes('descuento'));

  // Display control
  @Input() showTitle: boolean = true;
  @Input() title: string = 'Resumen del pedido';
  @Input() showPointsSection: boolean = true;
  @Input() showTotalSection: boolean = true;
  @Input() showFlightSection: boolean = true;
  @Input() totalLabel: string = 'TOTAL';

  // Data for calculations
  @Input() subtotal: number = 0;
  @Input() total: number = 0;
  @Input() isAuthenticated: boolean = false;
  @Input() selectedFlight: any = null;

  // NUEVO: Propiedades para gestión de datos
  private destroy$: Subject<void> = new Subject<void>();
  loading: boolean = false;
  error: boolean = false;
  reservationSummary: IReservationSummaryResponse | undefined;

  // NUEVO: Inyectar servicios necesarios
  constructor(
    private pointsCalculator: PointsCalculatorService,
    private reservationService: ReservationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    if (this.reservationId) {
      this.loadReservationSummary();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // NUEVO: Escuchar cambios en refreshTrigger
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationId'] && this.reservationId) {
      this.loadReservationSummary();
    }
    
    if (changes['refreshTrigger'] && this.refreshTrigger) {
      this.refreshSummary();
    }
  }

  // NUEVO: Cargar información del backend
  private loadReservationSummary(): void {
    if (!this.reservationId) return;

    this.loading = true;
    this.error = false;

    this.reservationService
      .getSummary(this.reservationId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error = true;
          this.loading = false;
          console.error('Error fetching reservation summary:', err);
          return EMPTY;
        })
      )
      .subscribe({
        next: (summary: IReservationSummaryResponse) => {
          this.reservationSummary = summary;
          this.updateSummaryData(summary);
          this.loading = false;
        },
      });
  }

  // NUEVO: Transformar datos del backend al formato del componente
  private updateSummaryData(summary: IReservationSummaryResponse): void {
    this.summary = summary.items?.map(item => ({
      description: item.description,
      qty: item.quantity,
      value: item.amount,
      isDiscount: item.description?.toLowerCase().includes('descuento') || false,
      // NUEVO: Agregar flag para identificar seguros básicos incluidos
      isBasicInsuranceIncluded: 
        item.description?.toLowerCase().includes('seguro básico') &&
        item.amount === 0 &&
        item.included === true
    })) || [];

    // Usar el totalAmount que viene del backend en lugar de calcularlo
    this.subtotal = summary.totalAmount;
    this.total = summary.totalAmount;
  }

  // NUEVO: Método para recargar información
  refreshSummary(): void {
    if (this.reservationId) {
      console.log('🔄 Actualizando resumen del pedido...');
      this.loadReservationSummary();
    }
  }

  getDescription(item: any): string {
    return item[this.descriptionField] || '';
  }

  getQuantity(item: any): number {
    return item[this.qtyField] || 1;
  }

  getValue(item: any): number | undefined {
    return item[this.valueField] !== undefined
      ? item[this.valueField]
      : undefined;
  }

  isDiscount(item: any): boolean {
    return this.isDiscountFn(item);
  }

  // NUEVO: Verificar si es seguro básico incluido
  isBasicInsuranceIncluded(item: any): boolean {
    return item.isBasicInsuranceIncluded || false;
  }

  calculateTotal(item: any): number {
    const qty = this.getQuantity(item);
    const value = this.getValue(item);
    return value !== null && value !== undefined ? value * qty : 0;
  }

  getEarnedPoints(): number {
    return this.pointsCalculator.calculateEarnedPoints(this.subtotal);
  }
}
