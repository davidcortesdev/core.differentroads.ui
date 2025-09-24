import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { PointsService } from '../../../../core/services/points.service';

// Simplified interfaces for points redemption
export interface TravelerData {
  id: string;
  name: string;
  email: string;
  hasEmail: boolean;
  maxPoints: number;
  assignedPoints: number;
}

export interface PointsRedemptionConfig {
  enabled: boolean;
  totalPointsToUse: number;
  pointsPerTraveler: { [travelerId: string]: number };
  maxDiscountPerTraveler: number;
  totalDiscount: number;
}

export interface TravelerPointsSummary {
  travelerId: string;
  currentCategory: string;
  totalPoints: number;
  availablePoints: number;
  usedPoints: number;
  categoryStartDate: Date;
  nextCategory?: string;
  pointsToNextCategory?: number;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  errorType: string;
  details?: string[];
}

export interface PointsDistributionSummary {
  totalPoints: number;
  totalDiscount: number;
  travelersWithPoints: number;
  mainTravelerPoints: number;
}


@Component({
  selector: 'app-points-redemption',
  templateUrl: './points-redemption.component.html',
  standalone: false,
  styleUrl: './points-redemption.component.scss'
})
export class PointsRedemptionComponent implements OnInit, OnDestroy {
  // Inputs
  @Input() reservationId!: number;
  @Input() travelers: TravelerData[] = [];
  @Input() totalPrice: number = 0;
  @Input() depositAmount: number = 0;
  @Input() paymentType: 'complete' | 'deposit' | 'installments' = 'complete';

  // Outputs
  @Output() pointsDiscountChange = new EventEmitter<number>();
  @Output() redemptionEnabledChange = new EventEmitter<boolean>();

  // Points data
  pointsSummary: TravelerPointsSummary | null = null;
  pointsRedemption: PointsRedemptionConfig = {
    enabled: false,
    totalPointsToUse: 0,
    pointsPerTraveler: {},
    maxDiscountPerTraveler: 50, // 50€ máximo por persona
    totalDiscount: 0
  };

  // UI State
  isExpanded: boolean = false;
  isLoading: boolean = false;

  constructor(
    private readonly pointsService: PointsService,
    private readonly messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.loadUserPoints();
    this.loadTravelersData();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Carga los puntos del usuario autenticado
   * 
   * NOTA PARA INTEGRACIÓN CON API:
   * Este método debe ser reemplazado por una llamada al endpoint de saldo de puntos.
   */
  private loadUserPoints(): void {
    this.isLoading = true;
    
    try {
      // TODO: Reemplazar con llamada real a la API
      // const balance = await this.pointsService.getUserBalance(this.reservationId).toPromise();
      // this.pointsSummary = balance;
      
      // TEMPORAL: Usar datos mock para desarrollo
      const userId = 'mock-user-id';
      
      // Datos mock simplificados
      this.pointsSummary = {
        travelerId: userId,
        currentCategory: 'VIAJERO',
        totalPoints: 1500,
        availablePoints: 1200,
        usedPoints: 300,
        categoryStartDate: new Date('2024-01-01'),
        nextCategory: 'NOMADA',
        pointsToNextCategory: 2
      };

      console.log('✅ Puntos del usuario cargados:', this.pointsSummary);
      
    } catch (error) {
      console.error('❌ Error al cargar puntos del usuario:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error al cargar puntos',
        detail: 'No se pudieron cargar los puntos del usuario. Inténtelo más tarde.',
        life: 5000,
      });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Carga los datos de los viajeros para la distribución de puntos
   * 
   * NOTA PARA INTEGRACIÓN CON API:
   * Este método debe ser reemplazado por una llamada al endpoint de viajeros de la reserva.
   */
  private loadTravelersData(): void {
    try {
      // TODO: Reemplazar con llamada real a la API
      // const travelers = await this.reservationService.getTravelers(this.reservationId).toPromise();
      
      // TEMPORAL: Usar datos mock si no se proporcionaron viajeros
      if (!this.travelers || this.travelers.length === 0) {
        this.travelers = [
          {
            id: 'traveler-1',
            name: 'Juan Pérez',
            email: 'juan@example.com',
            hasEmail: true,
            maxPoints: 50,
            assignedPoints: 0
          },
          {
            id: 'traveler-2',
            name: 'María García',
            email: 'maria@example.com',
            hasEmail: true,
            maxPoints: 50,
            assignedPoints: 0
          },
          {
            id: 'traveler-3',
            name: 'Carlos López',
            email: '',
            hasEmail: false,
            maxPoints: 0,
            assignedPoints: 0
          }
        ];
      }

      console.log('✅ Datos de viajeros cargados:', this.travelers);
      
    } catch (error) {
      console.error('❌ Error al cargar datos de viajeros:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error al cargar viajeros',
        detail: 'No se pudieron cargar los datos de los viajeros.',
        life: 5000,
      });
    }
  }

  /**
   * Obtiene la siguiente categoría de viajero
   */
  private getNextCategory(currentCategory: string): string | undefined {
    switch (currentCategory) {
      case 'TROTAMUNDOS':
        return 'VIAJERO';
      case 'VIAJERO':
        return 'NOMADA';
      default:
        return undefined;
    }
  }

  /**
   * Calcula los puntos necesarios para la siguiente categoría
   */
  private calculatePointsToNextCategory(currentTrips: number, currentCategory: string): number | undefined {
    const nextCategory = this.getNextCategory(currentCategory);
    if (!nextCategory) return undefined;
    
    switch (nextCategory) {
      case 'VIAJERO':
        return Math.max(0, 3 - currentTrips);
      case 'NOMADA':
        return Math.max(0, 6 - currentTrips);
      default:
        return undefined;
    }
  }

  /**
   * Maneja el cambio del checkbox de canje de puntos
   */
  onPointsRedemptionChange(event: any): void {
    this.pointsRedemption.enabled = event.checked;
    this.redemptionEnabledChange.emit(this.pointsRedemption.enabled);
    
    if (!this.pointsRedemption.enabled) {
      this.resetPointsRedemption();
    } else {
      this.updatePointsToUse(0);
    }
  }

  /**
   * Resetea la configuración de canje de puntos
   */
  private resetPointsRedemption(): void {
    this.pointsRedemption.totalPointsToUse = 0;
    this.pointsRedemption.pointsPerTraveler = {};
    this.pointsRedemption.totalDiscount = 0;
    this.pointsDiscountChange.emit(0);
  }

  /**
   * Obtiene el saldo de puntos disponible
   */
  getAvailablePoints(): number {
    return this.pointsSummary?.availablePoints || 0;
  }

  /**
   * Obtiene el descuento máximo disponible según la categoría
   */
  getMaxDiscountForCategory(): number {
    if (!this.pointsSummary) return 0;
    
    // Lógica simplificada para obtener el descuento máximo por categoría
    switch (this.pointsSummary.currentCategory) {
      case 'TROTAMUNDOS':
        return 100; // 100€ máximo
      case 'VIAJERO':
        return 200; // 200€ máximo
      case 'NOMADA':
        return 500; // 500€ máximo
      default:
        return 50; // 50€ por defecto
    }
  }

  /**
   * Obtiene el máximo de puntos permitidos (menor entre disponibles y límite de categoría)
   */
  getMaxAllowedPoints(): number {
    return Math.min(this.getAvailablePoints(), this.getMaxDiscountForCategory());
  }

  /**
   * Actualiza la cantidad de puntos a usar con validaciones estrictas
   */
  updatePointsToUse(pointsToUse: number): void {
    if (pointsToUse < 0) pointsToUse = 0;
    
    const maxAllowed = this.getMaxAllowedPoints();
    
    if (pointsToUse > maxAllowed) {
      pointsToUse = maxAllowed;
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite aplicado',
        detail: `Se ha limitado a ${maxAllowed} puntos (máximo disponible)`,
        life: 3000,
      });
    }
    
    this.pointsRedemption.totalPointsToUse = pointsToUse;
    this.pointsRedemption.totalDiscount = pointsToUse; // 1 punto = 1 euro
    
    this.distributePointsAmongTravelers(pointsToUse);
    this.pointsDiscountChange.emit(this.pointsRedemption.totalDiscount);
  }

  /**
   * Establece el máximo de puntos disponibles
   */
  setMaximumPoints(): void {
    const maximumPoints = this.getMaxAllowedPoints();
    this.updatePointsToUse(maximumPoints);
  }

  /**
   * Distribuye puntos automáticamente entre los viajeros disponibles
   */
  private distributePointsAmongTravelers(totalPoints: number): void {
    // Resetear asignaciones
    this.travelers.forEach(traveler => {
      traveler.assignedPoints = 0;
    });

    const maxPointsPerPerson = this.pointsRedemption.maxDiscountPerTraveler;
    let remainingPoints = totalPoints;
    const eligibleTravelers = this.travelers.filter(t => t.hasEmail);
    const pointsPerEligibleTraveler = eligibleTravelers.length > 0 ? Math.floor(totalPoints / eligibleTravelers.length) : 0;

    eligibleTravelers.forEach(traveler => {
      let pointsToAssign = Math.min(pointsPerEligibleTraveler, maxPointsPerPerson);
      if (remainingPoints > 0) {
        pointsToAssign = Math.min(pointsToAssign, remainingPoints);
        traveler.assignedPoints = pointsToAssign;
        this.pointsRedemption.pointsPerTraveler[traveler.id] = pointsToAssign;
        remainingPoints -= pointsToAssign;
      }
    });

    // Distribute any remaining points to the first eligible traveler
    if (remainingPoints > 0 && eligibleTravelers.length > 0) {
      const firstTraveler = eligibleTravelers[0];
      const currentAssigned = firstTraveler.assignedPoints || 0;
      const canAssignMore = maxPointsPerPerson - currentAssigned;
      const pointsToAdd = Math.min(remainingPoints, canAssignMore);
      firstTraveler.assignedPoints = currentAssigned + pointsToAdd;
      this.pointsRedemption.pointsPerTraveler[firstTraveler.id] = firstTraveler.assignedPoints;
    }
  }

  /**
   * Asigna puntos manualmente a un viajero específico
   */
  assignPointsToTraveler(travelerId: string, points: number): void {
    const traveler = this.travelers.find(t => t.id === travelerId);
    if (!traveler) return;

    if (travelerId !== 'main-traveler' && !traveler.hasEmail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de asignación',
        detail: 'Este viajero no puede recibir puntos (sin email)',
        life: 4000,
      });
      return;
    }

    const maxForThisTraveler = this.calculateMaxPointsForTraveler(travelerId);
    const originalPoints = points;
    points = Math.max(0, Math.min(points, maxForThisTraveler));

    if (originalPoints !== points) {
      this.showLimitAppliedMessage(originalPoints, points, travelerId, maxForThisTraveler);
    }

    traveler.assignedPoints = points;
    this.pointsRedemption.pointsPerTraveler[travelerId] = points;
    this.recalculatePointsTotals();
  }

  /**
   * Calcula el máximo de puntos que puede recibir un viajero específico
   */
  private calculateMaxPointsForTraveler(travelerId: string): number {
    const maxPointsPerPerson = this.pointsRedemption.maxDiscountPerTraveler;
    const availablePoints = this.getAvailablePoints();
    const maxDiscount = this.getMaxDiscountForCategory();
    
    // El máximo es el menor entre el límite por persona y los puntos disponibles
    return Math.min(maxPointsPerPerson, availablePoints, maxDiscount);
  }

  /**
   * Muestra mensaje cuando se aplica un límite
   */
  private showLimitAppliedMessage(originalPoints: number, finalPoints: number, travelerId: string, maxAllowed: number): void {
    const traveler = this.travelers.find(t => t.id === travelerId);
    const travelerName = traveler ? traveler.name : 'Viajero';
    
    let reason = '';
    if (originalPoints > (traveler?.maxPoints || 0)) {
      reason = `límite por persona (${traveler?.maxPoints || 0}€)`;
    } else {
      reason = `límite total disponible (${maxAllowed}€)`;
    }

    this.messageService.add({
      severity: 'warn',
      summary: 'Límite aplicado',
      detail: `${travelerName}: Se limitó a ${finalPoints}€ por ${reason}`,
      life: 3000,
    });
  }

  /**
   * Recalcula los totales de puntos después de cambios manuales
   */
  private recalculatePointsTotals(): void {
    const totalAssigned = Object.values(this.pointsRedemption.pointsPerTraveler)
      .reduce((sum, points) => sum + points, 0);

    this.pointsRedemption.totalPointsToUse = totalAssigned;
    this.pointsRedemption.totalDiscount = totalAssigned;
    this.pointsDiscountChange.emit(this.pointsRedemption.totalDiscount);
  }

  /**
   * Obtiene el total de puntos asignados a un viajero
   */
  getTravelerAssignedPoints(travelerId: string): number {
    return this.pointsRedemption.pointsPerTraveler[travelerId] || 0;
  }

  /**
   * Obtiene el máximo de puntos que puede recibir un viajero
   */
  getTravelerMaxPoints(travelerId: string): number {
    return this.calculateMaxPointsForTraveler(travelerId);
  }

  /**
   * Obtiene el máximo fijo de puntos por persona para mostrar en la UI
   */
  getTravelerMaxPointsDisplay(travelerId: string): number {
    const traveler = this.travelers.find(t => t.id === travelerId);
    if (!traveler) return 0;
    return traveler.maxPoints;
  }

  /**
   * Valida si se puede asignar la cantidad de puntos especificada a un viajero
   */
  canAssignPointsToTraveler(travelerId: string, points: number): boolean {
    const traveler = this.travelers.find(t => t.id === travelerId);
    if (!traveler || (travelerId !== 'main-traveler' && !traveler.hasEmail)) return false;

    const maxForThisTraveler = this.calculateMaxPointsForTraveler(travelerId);
    return points >= 0 && points <= maxForThisTraveler;
  }

  /**
   * Distribuye puntos automáticamente de forma equitativa
   */
  distributePointsEqually(): void {
    const totalPoints = this.pointsRedemption.totalPointsToUse;
    this.distributePointsAmongTravelers(totalPoints);
  }

  /**
   * Obtiene el resumen de distribución de puntos
   */
  getPointsDistributionSummary(): {
    totalPoints: number;
    totalDiscount: number;
    travelersWithPoints: number;
    mainTravelerPoints: number;
  } {
    const travelersWithPoints = this.travelers.filter(t => t.assignedPoints > 0).length;
    const mainTravelerPoints = this.pointsRedemption.pointsPerTraveler['main-traveler'] || 0;

    return {
      totalPoints: this.pointsRedemption.totalPointsToUse,
      totalDiscount: this.pointsRedemption.totalDiscount,
      travelersWithPoints,
      mainTravelerPoints
    };
  }

  /**
   * Obtiene el precio final después de aplicar descuentos de puntos
   */
  getFinalPrice(): number {
    const basePrice = this.paymentType === 'deposit' ? this.depositAmount : this.totalPrice;
    return Math.max(0, basePrice - this.pointsRedemption.totalDiscount);
  }

  /**
   * Obtiene el nombre de la categoría para mostrar
   */
  getCategoryDisplayName(): string {
    if (!this.pointsSummary) return '';
    return this.pointsSummary.currentCategory; // Simplified
  }

  /**
   * Obtiene el icono de la categoría
   */
  getCategoryIcon(): string {
    if (!this.pointsSummary) return '';
    // Simplified mock logic
    switch (this.pointsSummary.currentCategory) {
      case 'TROTAMUNDOS': return 'pi pi-leaf';
      case 'VIAJERO': return 'pi pi-send';
      case 'NOMADA': return 'pi pi-globe';
      default: return 'pi pi-star';
    }
  }

  /**
   * Obtiene la clase CSS para el badge de categoría
   */
  getCategoryBadgeClass(): string {
    if (!this.pointsSummary) return '';
    // Simplified mock logic
    switch (this.pointsSummary.currentCategory) {
      case 'TROTAMUNDOS': return 'category-trotamundos';
      case 'VIAJERO': return 'category-viajero';
      case 'NOMADA': return 'category-nomada';
      default: return '';
    }
  }

  /**
   * Obtiene el texto de progreso hacia la siguiente categoría
   */
  getProgressText(): string {
    if (!this.pointsSummary || !this.pointsSummary.nextCategory) return '';
    
    const nextCategoryName = this.pointsSummary.nextCategory;
    const tripsNeeded = this.pointsSummary.pointsToNextCategory || 0;
    
    if (tripsNeeded <= 0) {
      return `¡Felicidades! Has alcanzado el nivel ${nextCategoryName}`;
    }
    
    return `Te faltan ${tripsNeeded} viaje${tripsNeeded > 1 ? 's' : ''} para ser ${nextCategoryName}`;
  }

  /**
   * Obtiene el porcentaje de progreso hacia la siguiente categoría
   */
  getProgressPercentage(): number {
    if (!this.pointsSummary || !this.pointsSummary.pointsToNextCategory) return 100;
    
    // Simplified mock logic
    const currentTrips = 1; // Mock value
    const totalTripsNeeded = 3; // Mock value for VIAJERO
    
    return Math.min(100, (currentTrips / totalTripsNeeded) * 100);
  }

  /**
   * Obtiene el resumen de canje para mostrar en la confirmación
   */
  getRedemptionSummary(): PointsDistributionSummary {
    const travelersWithPoints = this.travelers.filter(t => t.assignedPoints > 0).length;
    const mainTravelerPoints = this.pointsRedemption.pointsPerTraveler['main-traveler'] || 0;

    return {
      totalPoints: this.pointsRedemption.totalPointsToUse,
      totalDiscount: this.pointsRedemption.totalDiscount,
      travelersWithPoints,
      mainTravelerPoints
    };
  }

  /**
   * Verifica si el total de puntos asignados excede el máximo permitido
   */
  isTotalExceeded(): boolean {
    return this.getPointsDistributionSummary().totalPoints > this.getMaxAllowedPoints();
  }

  /**
   * Valida todos los aspectos del canje de puntos
   */
  validatePointsRedemption(
    pointsToUse: number, 
    distribution: { [travelerId: string]: number }
  ): ValidationResult {
    if (!this.pointsSummary) {
      return {
        isValid: false,
        message: 'No se pudo validar el canje de puntos.',
        errorType: 'distribution_error'
      };
    }

    const availablePoints = this.getAvailablePoints();
    const maxDiscount = this.getMaxDiscountForCategory();
    
    if (pointsToUse > availablePoints) {
      return {
        isValid: false,
        message: 'No tienes suficientes puntos disponibles.',
        errorType: 'insufficient_points'
      };
    }
    
    if (pointsToUse > maxDiscount) {
      return {
        isValid: false,
        message: 'Excedes el límite de descuento para tu categoría.',
        errorType: 'category_limit'
      };
    }

    return {
      isValid: true,
      message: 'Validación exitosa',
      errorType: 'success'
    };
  }

  /**
   * Procesa el canje de puntos completo
   */
  async processPointsRedemption(): Promise<boolean> {
    if (!this.pointsRedemption.enabled || this.pointsRedemption.totalPointsToUse <= 0) {
      return true;
    }
    
    try {
      // TODO: Implementar llamada real a la API
      console.log(`Processing points redemption for reservation ${this.reservationId}`);
      
      // Simular éxito
      const success = true;
      
      if (success) {
        this.updateUserPointsAfterRedemption(this.pointsRedemption.totalPointsToUse);
        this.showRedemptionConfirmation();
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Error al procesar canje de puntos:', error);
      
      this.messageService.add({
        severity: 'error',
        summary: 'Error en canje de puntos',
        detail: 'No se pudo procesar el canje de puntos. El pago continuará sin descuento.',
        life: 5000,
      });
      
      return false;
    }
  }

  /**
   * Actualiza el saldo de puntos del usuario después del canje
   */
  private updateUserPointsAfterRedemption(pointsUsed: number): void {
    if (this.pointsSummary) {
      this.pointsSummary.availablePoints -= pointsUsed;
      this.pointsSummary.usedPoints += pointsUsed;
    }
  }

  /**
   * Muestra la confirmación de canje de puntos al usuario
   */
  private showRedemptionConfirmation(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Canje de puntos exitoso',
      detail: `Se han canjeado ${this.pointsRedemption.totalPointsToUse} puntos por ${this.pointsRedemption.totalDiscount.toFixed(2)}€ de descuento.`,
      life: 6000,
    });
  }

  /**
   * Toggle para expandir/colapsar la sección
   */
  toggleExpansion(): void {
    this.isExpanded = !this.isExpanded;
  }
}
