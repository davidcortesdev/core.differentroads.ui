import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { PointsV2Service } from '../../core/services/v2/points-v2.service';
import { ReservationService, IReservationSummaryResponse } from '../../core/services/reservation/reservation.service';
import { MessageService } from 'primeng/api';
import { Subject, EMPTY, timer, of, throwError } from 'rxjs';
import { takeUntil, catchError, switchMap, tap, retry, delay, retryWhen, take, concatMap } from 'rxjs/operators';

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
  @Input() pointsDiscount: number = 0;

  // NUEVO: Output para emitir cambios en el total
  @Output() totalChanged = new EventEmitter<number>();

  // NUEVO: Propiedades para gestión de datos
  private destroy$: Subject<void> = new Subject<void>();
  loading: boolean = false;
  error: boolean = false;
  reservationSummary: IReservationSummaryResponse | undefined;
  private retryAttempts: number = 0;
  private readonly MAX_RETRY_ATTEMPTS: number = 5;
  private readonly RETRY_DELAY: number = 1000; // 1 segundo
  private isRetrying: boolean = false;
  // NUEVO: Subject para gestionar las peticiones de carga con switchMap
  private loadSummary$: Subject<number> = new Subject<number>();
  // NUEVO: Flag para rastrear si es la primera carga
  private isFirstLoad: boolean = true;

  // NUEVO: Inyectar servicios necesarios
  constructor(
    private pointsV2Service: PointsV2Service,
    private reservationService: ReservationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Configurar el stream de carga con switchMap para cancelar automáticamente peticiones anteriores
    this.loadSummary$
      .pipe(
        // switchMap cancela automáticamente la petición anterior cuando llega una nueva
        switchMap((reservationId: number) => {
          if (!reservationId) {
            return EMPTY;
          }

          // Solo mostrar spinner en la primera carga
          if (this.isFirstLoad) {
            this.loading = true;
          }
          this.error = false;
          this.retryAttempts = 0;
          this.isRetrying = false;

          return this.reservationService.getSummary(reservationId).pipe(
            retryWhen(errors =>
              errors.pipe(
                concatMap((err, index) => {
                  this.retryAttempts = index + 1;
                  if (this.retryAttempts >= this.MAX_RETRY_ATTEMPTS) {
                    this.error = true;
                    // Solo ocultar spinner si estaba visible (primera carga)
                    if (this.isFirstLoad) {
                      this.loading = false;
                    }
                    this.isRetrying = false;
                    console.error(`Error fetching reservation summary after ${this.retryAttempts} attempts:`, err);
                    return throwError(() => err);
                  }
                  this.isRetrying = true;

                  return timer(this.RETRY_DELAY);
                })
              )
            ),
            catchError((err) => {
              this.error = true;
              // Solo ocultar spinner si estaba visible (primera carga)
              if (this.isFirstLoad) {
                this.loading = false;
              }
              this.isRetrying = false;
              console.error('Error fetching reservation summary:', err);
              return EMPTY;
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (summary: IReservationSummaryResponse) => {
          this.reservationSummary = summary;
          this.updateSummaryData(summary);
          // Ocultar spinner solo si era la primera carga
          if (this.isFirstLoad) {
            this.loading = false;
            this.isFirstLoad = false; // Marcar que ya no es la primera carga
          }
          this.error = false;
          this.retryAttempts = 0;
          this.isRetrying = false;
        },
      });

    // Cargar inicialmente si hay reservationId
    if (this.reservationId) {
      this.loadReservationSummary();
    }
  }

  ngOnDestroy(): void {
    // Completar el Subject para cancelar cualquier petición en curso
    this.loadSummary$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // NUEVO: Escuchar cambios en refreshTrigger
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationId'] && this.reservationId) {
      // Si cambia el reservationId, resetear el flag de primera carga
      this.isFirstLoad = true;
      this.loadReservationSummary();
    }
    
    if (changes['refreshTrigger'] && this.refreshTrigger) {
      this.refreshSummary();
    }
    
    // Actualizar descuento por puntos cuando cambie
    if (changes['pointsDiscount'] && this.reservationSummary) {
      this.updatePointsDiscount();
    }
  }

  // NUEVO: Cargar información del backend
  private loadReservationSummary(): void {
    if (!this.reservationId) return;
    // Emitir al Subject - switchMap cancelará automáticamente la petición anterior
    this.loadSummary$.next(this.reservationId);
  }

  // NUEVO: Transformar datos del backend al formato del componente
  private updateSummaryData(summary: IReservationSummaryResponse): void {
    this.summary = summary.items
      ?.map(item => ({
        description: item.description || undefined,
        qty: item.quantity,
        value: item.amount,
        isDiscount: item.description?.toLowerCase().includes('descuento') || false,
        // NUEVO: Agregar flag para identificar seguros básicos incluidos
        isBasicInsuranceIncluded: 
          item.description?.toLowerCase().includes('seguro básico') &&
          item.amount === 0 &&
          item.included === true
      }))
      // Filtrar items con cantidad 0 (excepto seguros básicos incluidos y descuentos)
      .filter(item => {
        // Mantener seguros básicos incluidos aunque tengan cantidad 0
        if (item.isBasicInsuranceIncluded) {
          return true;
        }
        // Mantener descuentos aunque tengan valores especiales
        if (item.isDiscount) {
          return true;
        }
        // Filtrar items con cantidad 0 o menor
        return item.qty && item.qty > 0;
      }) || [];

    // Agregar descuento por puntos si existe
    if (this.pointsDiscount > 0) {
      this.summary.push({
        description: `Descuento por puntos ${this.pointsDiscount}€`,
        qty: 1,
        value: -this.pointsDiscount, // Valor negativo para descuento
        isDiscount: true
      });
    }

    // Usar el totalAmount que viene del backend y restar los descuentos
    this.subtotal = summary.totalAmount;
    this.total = summary.totalAmount - this.pointsDiscount;

    // Emitir el cambio de total para que el componente padre pueda actualizarse
    this.totalChanged.emit(this.total);
  }

  // NUEVO: Método para recargar información
  refreshSummary(): void {
    if (this.reservationId) {
      // Emitir al Subject - switchMap cancelará automáticamente la petición anterior
      this.loadReservationSummary();
    }
  }

  // NUEVO: Actualizar descuento por puntos
  private updatePointsDiscount(): void {
    if (!this.reservationSummary) return;

    // Filtrar descuentos de puntos existentes
    this.summary = this.summary.filter(item => 
      !item.description?.toLowerCase().includes('descuento por puntos')
    );
    
    // Agregar nuevo descuento si existe
    if (this.pointsDiscount > 0) {
      this.summary.push({
        description: `Descuento por puntos ${this.pointsDiscount}€`,
        qty: 1,
        value: -this.pointsDiscount, // Valor negativo para descuento
        isDiscount: true
      });
    }
    
    // Recalcular total
    this.total = this.reservationSummary.totalAmount - this.pointsDiscount;
    // Emitir el cambio de total por actualización de descuento
    this.totalChanged.emit(this.total);
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
    return this.pointsV2Service.calculatePointsFromAmount(this.subtotal);
  }
}
