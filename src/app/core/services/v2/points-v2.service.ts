import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { MembershipCard, PointsRecord, TravelerCategory, CategoryConfig, PointsTransaction, TravelerPointsSummary, TransactionType, TransactionCategory } from '../../models/v2/profile-v2.model';

// Interfaces para canje de puntos
export interface PointsRedemptionConfig {
  enabled: boolean;
  totalPointsToUse: number;
  pointsPerTraveler: { [travelerId: string]: number };
  maxDiscountPerTraveler: number;
  totalDiscount: number;
}

export interface TravelerData {
  id: string;
  name: string;
  email?: string;
  hasEmail: boolean;
  maxPoints: number;
  assignedPoints: number;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  errorType: 'insufficient_balance' | 'per_person_limit' | 'category_limit' | 'inactive_reservation' | 'distribution_error' | 'none';
  details?: string[];
}

export interface PointsDistributionSummary {
  totalPoints: number;
  travelersWithPoints: number;
  mainTravelerPoints: number;
  distribution: Array<{
    name: string;
    points: number;
    discount: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class PointsV2Service {

  // ===== CONSTANTES DEL SISTEMA =====
  private readonly POINTS_PERCENTAGE = 0.03; // 3% del PVP
  private readonly POINTS_PER_EURO = 1; // 1 punto = 1 euro
  private readonly MAX_POINTS_PER_PERSON = 50; // Máximo 50€ por persona por reserva

  constructor(
    private sanitizer: DomSanitizer,
    private messageService: MessageService
  ) { }

  // ===== CÁLCULOS Y FORMATEO DE PUNTOS =====

  /**
   * Calcula el total de puntos de un array de registros
   * @param points Array de registros de puntos
   * @returns Total de puntos (ingresos - canjes)
   */
  calculateTotalPoints(points: PointsRecord[]): number {
    const incomePoints = points
      .filter(p => p.type === 'Acumular')
      .reduce((total, point) => total + point.points, 0);
    
    const redemptionPoints = points
      .filter(p => p.type === 'Canjear')
      .reduce((total, point) => total + point.points, 0);
    
    return incomePoints - redemptionPoints;
  }

  /**
   * Calcula puntos a generar basado en el importe del viaje (3% del PVP)
   * @param amount Importe del viaje en euros
   * @returns Puntos a generar
   */
  calculatePointsFromAmount(amount: number): number {
    return Math.floor(amount * this.POINTS_PERCENTAGE * this.POINTS_PER_EURO);
  }

  /**
   * Calcula el descuento máximo permitido según la categoría del viajero
   * @param category Categoría del viajero
   * @returns Descuento máximo en euros
   */
  getMaxDiscountForCategory(category: TravelerCategory): number {
    const config = this.getCategoryConfig(category);
    return config.maxDiscountPerPurchase;
  }

  /**
   * Valida si un viajero puede usar la cantidad de puntos especificada
   * @param travelerId ID del viajero
   * @param pointsToUse Puntos que quiere usar
   * @param category Categoría del viajero
   * @returns true si puede usar los puntos
   */
  canUsePoints(travelerId: string, pointsToUse: number, category: TravelerCategory): boolean {
    const maxDiscount = this.getMaxDiscountForCategory(category);
    return pointsToUse <= maxDiscount && pointsToUse <= this.MAX_POINTS_PER_PERSON;
  }

  /**
   * Calcula la distribución de puntos entre miembros del grupo
   * @param totalPoints Puntos totales disponibles
   * @param groupSize Número de personas en el grupo
   * @returns Array con puntos por persona
   */
  distributePointsAmongGroup(totalPoints: number, groupSize: number): number[] {
    const maxPointsPerPerson = this.MAX_POINTS_PER_PERSON;
    const maxTotalForGroup = groupSize * maxPointsPerPerson;
    const pointsToDistribute = Math.min(totalPoints, maxTotalForGroup);
    
    const distribution: number[] = [];
    let remainingPoints = pointsToDistribute;
    
    for (let i = 0; i < groupSize; i++) {
      const pointsForThisPerson = Math.min(remainingPoints, maxPointsPerPerson);
      distribution.push(pointsForThisPerson);
      remainingPoints -= pointsForThisPerson;
      
      if (remainingPoints <= 0) break;
    }
    
    return distribution;
  }

  /**
   * Formatea los puntos con el símbolo + o - según el tipo
   * @param point Registro de puntos
   * @returns String formateado con símbolo
   */
  getFormattedPoints(point: PointsRecord): string {
    if (point.type === 'canjear') {
      return `- ${point.points}`;
    } else {
      return `+ ${point.points}`;
    }
  }

  /**
   * Obtiene la clase CSS según el tipo de punto
   * @param type Tipo de punto (income/redemption)
   * @returns Clase CSS para colorear
   */
  getPointsClass(type: string): string {
    return type === 'canjear' ? 'redemption-points' : 'income-points';
  }

  // ===== GESTIÓN DE CATEGORÍAS DE VIAJERO =====

  /**
   * Obtiene la configuración de una categoría de viajero
   * @param category Categoría del viajero
   * @returns Configuración de la categoría
   */
  getCategoryConfig(category: TravelerCategory): CategoryConfig {
    const configs: Record<TravelerCategory, CategoryConfig> = {
      [TravelerCategory.TROTAMUNDOS]: {
        id: 'trotamundos',
        name: TravelerCategory.TROTAMUNDOS,
        displayName: 'Trotamundos',
        maxDiscountPerPurchase: 50,
        pointsPerEuro: 1,
        benefits: [
          'Descuento del 3% en todos los tours',
          'Acceso prioritario a nuevas rutas',
          'Asistencia 24/7',
          'Canje máximo de 50€ por compra'
        ],
        requirements: 'Nivel inicial para nuevos viajeros',
        color: '#4CAF50',
        icon: 'pi pi-compass'
      },
      [TravelerCategory.VIAJERO]: {
        id: 'viajero',
        name: TravelerCategory.VIAJERO,
        displayName: 'Viajero',
        maxDiscountPerPurchase: 75,
        pointsPerEuro: 1,
        benefits: [
          'Descuento del 3% en todos los tours',
          'Upgrade gratuito de habitación',
          'Tours exclusivos',
          'Prioridad en reservas',
          'Canje máximo de 75€ por compra'
        ],
        requirements: '3-5 viajes completados',
        color: '#2196F3',
        icon: 'pi pi-globe'
      },
      [TravelerCategory.NOMADA]: {
        id: 'nomada',
        name: TravelerCategory.NOMADA,
        displayName: 'Nómada',
        maxDiscountPerPurchase: 100,
        pointsPerEuro: 1,
        benefits: [
          'Descuento del 3% en todos los tours',
          'Suite gratuita en cada viaje',
          'Tours privados',
          'Concierge personal',
          'Acceso VIP a eventos',
          'Canje máximo de 100€ por compra'
        ],
        requirements: '6+ viajes completados',
        color: '#FF9800',
        icon: 'pi pi-star'
      }
    };

    return configs[category];
  }

  /**
   * Obtiene todas las configuraciones de categorías
   * @returns Array con todas las configuraciones
   */
  getAllCategoryConfigs(): CategoryConfig[] {
    return Object.values(TravelerCategory).map(category => this.getCategoryConfig(category));
  }

  /**
   * Determina la categoría de un viajero basada en sus viajes
   * @param tripsCount Número de viajes completados
   * @returns Categoría correspondiente
   */
  determineCategoryByTrips(tripsCount: number): TravelerCategory {
    if (tripsCount >= 6) {
      return TravelerCategory.NOMADA;
    } else if (tripsCount >= 3) {
      return TravelerCategory.VIAJERO;
    } else {
      return TravelerCategory.TROTAMUNDOS;
    }
  }

  // ===== GESTIÓN DE TARJETAS DE MEMBRESÍA =====

  /**
   * Actualiza el estado de las tarjetas basado en la cantidad de viajes
   * @param cards Array de tarjetas a actualizar
   * @param currentTrips Cantidad actual de viajes del usuario
   */
  updateCardsByTripsCount(cards: MembershipCard[], currentTrips: number): void {
    cards.forEach(card => {
      // Una tarjeta está desbloqueada si el usuario tiene suficientes viajes
      card.unlocked = currentTrips >= card.minTrips;
      
      // Una tarjeta es la actual si la cantidad de viajes está dentro de su rango
      card.isCurrent = currentTrips >= card.minTrips && 
                       (card.maxTrips === undefined || currentTrips < card.maxTrips);
      
      // Actualizar el tipo según el estado actual
      if (card.isCurrent) {
        card.type = 'Enhorabuena, ya eres viajero:';
      } else {
        card.type = 'Viajero';
      }
    });
  }

  /**
   * Obtiene el texto de viajes restantes para una tarjeta
   * @param card Tarjeta de membresía
   * @param currentTrips Cantidad actual de viajes
   * @returns Texto descriptivo del estado
   */
  getRemainingTripsText(card: MembershipCard, currentTrips: number): string {
    if (card.unlocked) {
      return 'Desbloqueado';
    } else {
      const requiredTrips = card.minTrips;
      return `${currentTrips} de ${requiredTrips} viajes completados`;
    }
  }

  /**
   * Obtiene la clase CSS para una tarjeta según su estado
   * @param card Tarjeta de membresía
   * @returns Clase CSS para la tarjeta
   */
  getCardClass(card: MembershipCard): string {
    if (!card.unlocked) return 'locked-card';
    return card.isCurrent ? 'current-card' : 'unlocked-card';
  }

  // ===== MÉTODOS AUXILIARES =====

  /**
   * Sanitiza contenido HTML
   * @param content Contenido HTML a sanitizar
   * @returns Contenido HTML sanitizado
   */
  private sanitizeHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  // ===== DATOS MOCK PARA DESARROLLO =====

  /**
   * Genera datos mock de puntos para un usuario
   * @param userId ID del usuario para generar datos únicos
   * @returns Array de registros de puntos
   */
  generateMockPoints(userId: string): PointsRecord[] {
    
    // Simular viajes con diferentes importes para calcular puntos realistas
    const mockBookings = [
      { id: '001', tour: 'Tour por Italia - Roma, Florencia y Venecia', amount: 2500, date: new Date('2024-01-15') },
      { id: '002', tour: 'Aventura en Tailandia', amount: 2000, date: new Date('2024-02-20') },
      { id: '003', tour: 'Escapada a París', amount: 1500, date: new Date('2024-03-10') },
      { id: '004', tour: 'Tour por Grecia', amount: 0, date: new Date('2024-04-05') },
      { id: '005', tour: 'Viaje a Japón', amount: 0, date: new Date('2024-05-12') }
    ];

    const pointsRecords: PointsRecord[] = [];

    // Generar puntos por viajes (3% del importe) - solo para viajes con amount > 0
    mockBookings.forEach(booking => {
      if (booking.amount > 0) {
        const points = this.calculatePointsFromAmount(booking.amount);
        pointsRecords.push({
          booking: booking.id,
          category: 'Viaje',
          concept: 'Puntos por reserva de tour',
          tour: booking.tour,
          points: points,
          type: 'Acumular',
          amount: booking.amount,
          date: booking.date,
          status: 'Confirmed'
        });
      }
    });

    // Simular algunos canjes de puntos
    const redemptions = [
      { id: 'R001', concept: 'Descuento aplicado en reserva', points: 10, amount: 10, date: new Date('2024-03-25') },
      { id: 'R002', concept: 'Descuento en actividad opcional', points: 8, amount: 8, date: new Date('2024-04-15') },
      { id: 'R003', concept: 'Descuento en seguro de viaje', points: 1, amount: 1, date: new Date('2024-05-20') }
    ];

    redemptions.forEach(redemption => {
      pointsRecords.push({
        booking: redemption.id,
        category: 'Canje',
        concept: redemption.concept,
        tour: 'Descuento aplicado',
        points: redemption.points,
        type: 'Canjear',
        amount: redemption.amount,
        date: redemption.date,
        status: 'Confirmed'
      });
    });

    // Ordenar por fecha (más recientes primero)
    return pointsRecords.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }

  /**
   * Genera cantidad mock de viajes para un usuario
   * @param userId ID del usuario
   * @returns Número de viajes completados
   */
  generateMockTripsCount(userId: string): number {
    // Simular cantidad de viajes basada en el userId
    
    
    // Retornar 5 viajes para que le falte 1 para ser Nómada (6 viajes)
    return 5;
  }

  /**
   * Genera datos mock de tarjetas de membresía basadas en el nuevo sistema
   * @param currentCategory Categoría actual del viajero
   * @returns Array de tarjetas de membresía
   */
  generateMockMembershipCards(currentCategory: TravelerCategory = TravelerCategory.TROTAMUNDOS): MembershipCard[] {
    const configs = this.getAllCategoryConfigs();
    
    return configs.map(config => {
      const isCurrent = config.name === currentCategory;
      const isUnlocked = this.isCategoryUnlocked(config.name, currentCategory);
      
      return {
        type: isCurrent ? 'Tu categoría actual' : 'Categoría de viajero',
        title: config.displayName,
        image: `https://picsum.photos/300/200?random=${config.id}`,
        benefits: this.sanitizeHtml(`<p>${config.benefits.map(benefit => `• ${benefit}`).join('<br>')}</p>`),
        unlocked: isUnlocked,
        isCurrent: isCurrent,
        requirement: config.requirements,
        minTrips: this.getMinTripsForCategory(config.name),
        maxTrips: this.getMaxTripsForCategory(config.name),
        remainingTrips: this.getMinTripsForCategory(config.name),
        statusText: isUnlocked ? 'Desbloqueado' : 'Bloqueado',
        // Campos adicionales del nuevo sistema
        category: config.name,
        maxDiscount: config.maxDiscountPerPurchase,
        color: config.color,
        icon: config.icon
      };
    });
  }

  /**
   * Verifica si una categoría está desbloqueada
   * @param category Categoría a verificar
   * @param currentCategory Categoría actual del viajero
   * @returns true si está desbloqueada
   */
  private isCategoryUnlocked(category: TravelerCategory, currentCategory: TravelerCategory): boolean {
    const categoryOrder = [TravelerCategory.TROTAMUNDOS, TravelerCategory.VIAJERO, TravelerCategory.NOMADA];
    const currentIndex = categoryOrder.indexOf(currentCategory);
    const categoryIndex = categoryOrder.indexOf(category);
    
    return categoryIndex <= currentIndex;
  }

  /**
   * Obtiene el número mínimo de viajes para una categoría
   * @param category Categoría del viajero
   * @returns Número mínimo de viajes
   */
  private getMinTripsForCategory(category: TravelerCategory): number {
    switch (category) {
      case TravelerCategory.TROTAMUNDOS: return 0;
      case TravelerCategory.VIAJERO: return 3;
      case TravelerCategory.NOMADA: return 6;
      default: return 0;
    }
  }

  /**
   * Obtiene el número máximo de viajes para una categoría
   * @param category Categoría del viajero
   * @returns Número máximo de viajes (undefined si no hay límite)
   */
  private getMaxTripsForCategory(category: TravelerCategory): number | undefined {
    switch (category) {
      case TravelerCategory.TROTAMUNDOS: return 2;
      case TravelerCategory.VIAJERO: return 5;
      case TravelerCategory.NOMADA: return undefined;
      default: return undefined;
    }
  }

  // ===== MÉTODOS PARA UI =====
  getCategoryDisplayName(category: TravelerCategory): string {
    const config = this.getCategoryConfig(category);
    return config.displayName;
  }

  getCategoryIcon(category: TravelerCategory): string {
    const config = this.getCategoryConfig(category);
    return config.icon;
  }

  getCategoryBadgeClass(category: TravelerCategory): string {
    const config = this.getCategoryConfig(category);
    return `category-badge-${config.id.toLowerCase()}`;
  }

  // ===== MÉTODOS PARA REVERSO POR CANCELACIÓN =====

  /**
   * Crea una transacción de reverso de puntos
   * @param originalTransactionId ID de la transacción original de canje
   * @param travelerId ID del viajero
   * @param pointsToReverse Cantidad de puntos a revertir
   * @param reason Razón del reverso (cancelación, devolución, etc.)
   */
  createPointsReversal(
    originalTransactionId: string, 
    travelerId: string, 
    pointsToReverse: number, 
    reason: 'cancellation' | 'refund' | 'adjustment' = 'cancellation'
  ): PointsTransaction {
    return {
      id: `reversal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      travelerId: travelerId,
      bookingId: `reversal_${originalTransactionId}`,
      type: TransactionType.ACUMULAR, // Los puntos vuelven como ingreso
      category: TransactionCategory.ACTIVIDAD,
      concept: this.getReversalConcept(reason),
      points: pointsToReverse,
      amount: pointsToReverse, // 1 punto = 1 euro
      date: new Date(),
      status: 'confirmed',
      description: `Reverso de canje por ${this.getReversalReasonText(reason)}`,
      tourName: 'Cancelación de reserva'
    };
  }

  /**
   * Obtiene el concepto para la transacción de reverso
   */
  private getReversalConcept(reason: 'cancellation' | 'refund' | 'adjustment'): string {
    switch (reason) {
      case 'cancellation':
        return 'Reverso por cancelación';
      case 'refund':
        return 'Reverso por devolución';
      case 'adjustment':
        return 'Ajuste de puntos';
      default:
        return 'Reverso de puntos';
    }
  }

  /**
   * Obtiene el texto descriptivo de la razón del reverso
   */
  private getReversalReasonText(reason: 'cancellation' | 'refund' | 'adjustment'): string {
    switch (reason) {
      case 'cancellation':
        return 'cancelación de reserva';
      case 'refund':
        return 'devolución';
      case 'adjustment':
        return 'ajuste administrativo';
      default:
        return 'motivo no especificado';
    }
  }

  /**
   * Procesa el reverso de puntos por cancelación de reserva
   * @param reservationId ID de la reserva cancelada
   * @param travelerId ID del viajero
   * @param pointsUsed Puntos que se habían usado en la reserva
   */
  processCancellationReversal(
    reservationId: string, 
    travelerId: string, 
    pointsUsed: number
  ): PointsTransaction[] {
    const reversals: PointsTransaction[] = [];
    
    if (pointsUsed > 0) {
      // Crear transacción de reverso
      const reversal = this.createPointsReversal(
        reservationId,
        travelerId,
        pointsUsed,
        'cancellation'
      );
      
      reversals.push(reversal);

    }
    
    return reversals;
  }

  /**
   * Valida si se puede procesar un reverso de puntos
   * @param travelerId ID del viajero
   * @param pointsToReverse Cantidad de puntos a revertir
   */
  canProcessReversal(travelerId: string, pointsToReverse: number): boolean {
    // Validaciones básicas
    if (!travelerId || pointsToReverse <= 0) {
      return false;
    }
    
    // Validar que la transacción original exista
    // - Que no se haya revertido ya
    // - Que el viajero tenga permisos
    
    return true;
  }

  /**
   * Obtiene el historial de reversos de un viajero
   * @param travelerId ID del viajero
   */
  getReversalHistory(travelerId: string): PointsTransaction[] {
    // Consultar historial de reversos del viajero
    // Por ahora retornamos array vacío
    return [];
  }

  /**
   * Crea una transacción de puntos
   * @param travelerId ID del viajero
   * @param points Cantidad de puntos
   * @param type Tipo de transacción (income, redemption, reversal)
   * @param category Categoría de la transacción
   * @param concept Concepto de la transacción
   * @param referenceId ID de referencia (reserva, etc.)
   * @returns Transacción de puntos creada
   */
  createPointsTransaction(
    travelerId: string,
    points: number,
    type: TransactionType,
    category: TransactionCategory,
    concept: string,
    referenceId?: string
  ): PointsTransaction {
    const now = new Date();
    return {
      id: `transaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      travelerId: travelerId,
      points: points,
      type: type,
      category: category,
      concept: concept,
      date: now,
      status: 'confirmed', // Estado válido según el tipo TransactionStatus
      bookingId: referenceId || '',
      amount: points, // 1 punto = 1 euro
      description: concept,
      tourName: concept,
      // Campos de auditoría según especificaciones
      usuario: 'sistema', // Por defecto, en producción vendrá del contexto de usuario
      sistema: 'frontend-checkout',
      timestamp: now,
      id_reserva: referenceId || '',
      id_viajero: travelerId,
      accion: type,
      saldo_previo: 0, // Se calculará en la API real
      saldo_nuevo: 0   // Se calculará en la API real
    };
  }

  /**
   * Procesa la finalización de un viaje y genera puntos automáticamente
   * 
   * NOTA PARA INTEGRACIÓN CON API:
   * Este método debe ser reemplazado por una llamada al endpoint de cálculo de puntos.
   * El endpoint debe recibir los datos de la reserva y devolver las transacciones generadas.
   * 
   * @param bookingId ID de la reserva
   * @param travelers Array de viajeros con sus datos
   * @param totalAmount Importe total del viaje
   * @param mainTravelerId ID del viajero principal (titular)
   * @returns Promise con el resultado del procesamiento
   */
  async processTripCompletion(
    bookingId: string,
    travelers: { id: string; email: string; amount: number; name: string }[],
    totalAmount: number,
    mainTravelerId: string
  ): Promise<{
    success: boolean;
    transactions: PointsTransaction[];
    message: string;
  }> {
    try {

      const transactions: PointsTransaction[] = [];
      let pointsAssignedToMain = 0;

      // Procesar cada viajero
      for (const traveler of travelers) {
        const points = this.calculatePointsFromAmount(traveler.amount);
        
        if (traveler.email && traveler.email.trim() !== '') {
          // Viajero con email válido - asignar puntos directamente
          const transaction = this.createPointsTransaction(
            traveler.id,
            points,
            TransactionType.ACUMULAR,
            TransactionCategory.VIAJE,
            `Puntos por viaje completado - ${traveler.name}`,
            bookingId
          );
          
          transactions.push(transaction);
        } else {
          // Viajero sin email - asignar puntos al titular
          pointsAssignedToMain += points;
        }
      }

      // Si hay puntos sin asignar, dárselos al titular
      if (pointsAssignedToMain > 0) {
        const mainTravelerTransaction = this.createPointsTransaction(
          mainTravelerId,
          pointsAssignedToMain,
          TransactionType.ACUMULAR,
          TransactionCategory.VIAJE,
          `Puntos por viajeros sin email - Reserva ${bookingId}`,
          bookingId
        );
        
        transactions.push(mainTravelerTransaction);
      }

      // Simular actualización de saldo (en producción esto sería una llamada a la API)
      await this.simulatePointsUpdate(transactions);

      const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);
      const message = `Se generaron ${totalPoints} puntos para ${travelers.length} viajeros en reserva ${bookingId}`;

      return {
        success: true,
        transactions,
        message
      };

    } catch (error) {
      return {
        success: false,
        transactions: [],
        message: `Error procesando finalización de viaje: ${error}`
      };
    }
  }

  /**
   * Simula la actualización de puntos en el sistema
   * 
   * NOTA PARA INTEGRACIÓN CON API:
   * Este método debe ser reemplazado por una llamada al endpoint de actualización de saldo.
   * El endpoint debe procesar las transacciones y actualizar los saldos de los viajeros.
   * 
   * @param transactions Transacciones a procesar
   */
  private async simulatePointsUpdate(transactions: PointsTransaction[]): Promise<void> {
    // Reemplazar con llamada real a la API
    // const response = await this.http.post('/api/points/update-balance', { transactions }).toPromise();
    
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // ===== MÉTODOS DE VALIDACIÓN PARA CANJE DE PUNTOS =====

  /**
   * Valida el saldo de puntos disponible
   * @param pointsToUse Puntos que se quieren usar
   * @param availablePoints Puntos disponibles
   * @returns Objeto con resultado de validación y mensaje
   */
  validatePointsBalance(pointsToUse: number, availablePoints: number): ValidationResult {
    if (pointsToUse > availablePoints) {
      return {
        isValid: false,
        message: `Saldo insuficiente. Tienes ${availablePoints} puntos disponibles.`,
        errorType: 'insufficient_balance'
      };
    }
    
    return {
      isValid: true,
      message: '',
      errorType: 'none'
    };
  }

  /**
   * Valida el límite por persona (50€ máximo por viajero)
   * @param travelerId ID del viajero
   * @param pointsToAssign Puntos a asignar
   * @param maxPointsPerPerson Límite máximo por persona
   * @returns Objeto con resultado de validación y mensaje
   */
  validatePerPersonLimit(travelerId: string, pointsToAssign: number, maxPointsPerPerson: number): ValidationResult {
    if (pointsToAssign > maxPointsPerPerson) {
      return {
        isValid: false,
        message: `Límite por persona excedido. Máximo ${maxPointsPerPerson}€ por viajero.`,
        errorType: 'per_person_limit'
      };
    }
    
    return {
      isValid: true,
      message: '',
      errorType: 'none'
    };
  }

  /**
   * Valida el límite por categoría de viajero
   * @param pointsToUse Puntos totales a usar
   * @param currentCategory Categoría actual del viajero
   * @returns Objeto con resultado de validación y mensaje
   */
  validateCategoryLimit(pointsToUse: number, currentCategory: TravelerCategory): ValidationResult {
    const maxDiscountForCategory = this.getMaxDiscountForCategory(currentCategory);
    
    if (pointsToUse > maxDiscountForCategory) {
      const categoryName = this.getCategoryDisplayName(currentCategory);
      return {
        isValid: false,
        message: `Límite por categoría excedido. Como ${categoryName} puedes usar máximo ${maxDiscountForCategory}€.`,
        errorType: 'category_limit'
      };
    }
    
    return {
      isValid: true,
      message: '',
      errorType: 'none'
    };
  }

  /**
   * Valida la reserva activa y con pago pendiente
   * @param reservationId ID de la reserva
   * @returns Objeto con resultado de validación y mensaje
   */
  validateActiveReservation(reservationId: number): ValidationResult {
    if (!reservationId) {
      return {
        isValid: false,
        message: 'No se encontró una reserva activa.',
        errorType: 'inactive_reservation'
      };
    }
    
    return {
      isValid: true,
      message: '',
      errorType: 'none'
    };
  }

  /**
   * Valida la distribución de puntos entre viajeros
   * @param distribution Distribución de puntos por viajero
   * @param travelers Datos de los viajeros
   * @param availablePoints Puntos disponibles
   * @param currentCategory Categoría actual del viajero
   * @param maxPointsPerPerson Límite máximo por persona
   * @returns Objeto con resultado de validación y mensaje
   */
  validatePointsDistribution(
    distribution: { [travelerId: string]: number },
    travelers: TravelerData[],
    availablePoints: number,
    currentCategory: TravelerCategory,
    maxPointsPerPerson: number
  ): ValidationResult {
    const errors: string[] = [];
    const totalPoints = Object.values(distribution).reduce((sum, points) => sum + points, 0);
    
    // Validar saldo total
    const balanceValidation = this.validatePointsBalance(totalPoints, availablePoints);
    if (!balanceValidation.isValid) {
      errors.push(balanceValidation.message);
    }
    
    // Validar límite por categoría
    const categoryValidation = this.validateCategoryLimit(totalPoints, currentCategory);
    if (!categoryValidation.isValid) {
      errors.push(categoryValidation.message);
    }
    
    // Validar límite por persona para cada viajero
    Object.entries(distribution).forEach(([travelerId, points]) => {
      if (points > 0) {
        const perPersonValidation = this.validatePerPersonLimit(travelerId, points, maxPointsPerPerson);
        if (!perPersonValidation.isValid) {
          const travelerName = this.getTravelerNameForValidation(travelerId, travelers);
          errors.push(`${perPersonValidation.message} (${travelerName})`);
        }
      }
    });
    
    // Validar que no se asignen puntos a viajeros sin email
    Object.entries(distribution).forEach(([travelerId, points]) => {
      if (points > 0 && travelerId !== 'main-traveler') {
        const traveler = travelers.find(t => t.id === travelerId);
        if (traveler && !traveler.hasEmail) {
          errors.push(`No se pueden asignar puntos a ${traveler.name} (sin email)`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? errors[0] : '',
      errorType: errors.length > 0 ? 'distribution_error' : 'none',
      details: errors.length > 1 ? errors.slice(1) : undefined
    };
  }

  /**
   * Valida todos los aspectos del canje de puntos
   * @param pointsToUse Puntos totales a usar
   * @param distribution Distribución de puntos por viajero
   * @param travelers Datos de los viajeros
   * @param availablePoints Puntos disponibles
   * @param currentCategory Categoría actual del viajero
   * @param maxPointsPerPerson Límite máximo por persona
   * @param reservationId ID de la reserva
   * @returns Objeto con resultado de validación completo
   */
  validatePointsRedemption(
    pointsToUse: number,
    distribution: { [travelerId: string]: number },
    travelers: TravelerData[],
    availablePoints: number,
    currentCategory: TravelerCategory,
    maxPointsPerPerson: number,
    reservationId: number
  ): ValidationResult {
    // Validar reserva activa
    const reservationValidation = this.validateActiveReservation(reservationId);
    if (!reservationValidation.isValid) {
      return reservationValidation;
    }
    
    // Validar distribución de puntos
    const distributionValidation = this.validatePointsDistribution(
      distribution,
      travelers,
      availablePoints,
      currentCategory,
      maxPointsPerPerson
    );
    if (!distributionValidation.isValid) {
      return distributionValidation;
    }
    
    return {
      isValid: true,
      message: 'Validación exitosa',
      errorType: 'none'
    };
  }

  // ===== MÉTODOS DE DISTRIBUCIÓN =====

  /**
   * Distribuye puntos automáticamente entre los viajeros disponibles
   * @param totalPoints Puntos totales a distribuir
   * @param travelers Datos de los viajeros
   * @param maxPointsPerPerson Límite máximo por persona
   * @returns Distribución de puntos por viajero
   */
  distributePointsAmongTravelers(
    totalPoints: number,
    travelers: TravelerData[],
    maxPointsPerPerson: number
  ): { [travelerId: string]: number } {
    // Obtener viajeros que pueden recibir puntos (con email)
    const eligibleTravelers = travelers.filter(t => t.hasEmail && t.maxPoints > 0);
    
    if (eligibleTravelers.length === 0) {
      // Si no hay viajeros elegibles, asignar todo al titular
      return {
        'main-traveler': totalPoints
      };
    }

    // Distribuir puntos equitativamente entre viajeros elegibles
    const pointsPerTraveler = Math.floor(totalPoints / eligibleTravelers.length);
    const remainingPoints = totalPoints % eligibleTravelers.length;

    let pointsToDistribute = totalPoints;
    const distribution: { [travelerId: string]: number } = {};

    // Asignar puntos base a cada viajero
    eligibleTravelers.forEach((traveler, index) => {
      let assignedPoints = pointsPerTraveler;
      
      // Asignar puntos restantes a los primeros viajeros
      if (index < remainingPoints) {
        assignedPoints += 1;
      }

      // Respetar el límite máximo por viajero
      assignedPoints = Math.min(assignedPoints, traveler.maxPoints, pointsToDistribute);
      
      distribution[traveler.id] = assignedPoints;
      pointsToDistribute -= assignedPoints;
    });

    // Si quedan puntos sin asignar, asignarlos al titular
    if (pointsToDistribute > 0) {
      distribution['main-traveler'] = (distribution['main-traveler'] || 0) + pointsToDistribute;
    }

    return distribution;
  }

  /**
   * Calcula el máximo de puntos que puede recibir un viajero específico
   * @param travelerId ID del viajero
   * @param travelers Datos de los viajeros
   * @param currentDistribution Distribución actual de puntos
   * @param availablePoints Puntos disponibles
   * @param currentCategory Categoría actual del viajero
   * @returns Máximo de puntos permitidos
   */
  calculateMaxPointsForTraveler(
    travelerId: string,
    travelers: TravelerData[],
    currentDistribution: { [travelerId: string]: number },
    availablePoints: number,
    currentCategory: TravelerCategory
  ): number {
    const traveler = travelers.find(t => t.id === travelerId);
    if (!traveler) return 0;

    // 1. Límite por persona (50€ máximo por viajero)
    const maxPerPerson = traveler.maxPoints;
    
    // 2. Calcular puntos ya asignados a otros viajeros
    const currentTotal = Object.entries(currentDistribution)
      .filter(([id, _]) => id !== travelerId)
      .reduce((sum, [_, assignedPoints]) => sum + assignedPoints, 0);

    // 3. Calcular puntos disponibles restantes
    const maxDiscountForCategory = this.getMaxDiscountForCategory(currentCategory);
    const maxAllowed = Math.min(availablePoints, maxDiscountForCategory);
    const remainingPoints = Math.max(0, maxAllowed - currentTotal);

    // 4. El máximo es el menor entre el límite por persona y los puntos restantes
    return Math.min(maxPerPerson, remainingPoints);
  }

  /**
   * Calcula el máximo de puntos permitidos según las reglas
   */
  calculateMaxAllowedPoints(
    availablePoints: number,
    category: string,
    eligibleTravelersCount: number,
    maxPointsPerPerson: number = 50
  ): number {
    const categoryLimit = this.getMaxDiscountForCategory(category as any);
    const reservationLimit = eligibleTravelersCount * maxPointsPerPerson;
    
    return Math.min(availablePoints, categoryLimit, reservationLimit);
  }

  /**
   * Calcula la distribución de puntos entre viajeros según las reglas del documento
   */
  calculatePointsDistribution(
    subtotal: number,
    travelers: Array<{ id: string; name: string; email?: string; isLeadTraveler?: boolean }>,
    mainTravelerId: string
  ) {
    const totalPoints = this.calculatePointsFromAmount(subtotal);
    const pointsPerTraveler = Math.floor(totalPoints / travelers.length);
    
    const travelersWithEmail: any[] = [];
    const travelersWithoutEmail: any[] = [];
    let mainTravelerPoints = 0;

    travelers.forEach(traveler => {
      const hasEmail = Boolean(traveler.email && traveler.email.trim() !== '');
      const travelerPoints = {
        travelerId: traveler.id,
        travelerName: traveler.name,
        email: traveler.email || '',
        hasEmail,
        points: hasEmail ? pointsPerTraveler : 0,
        assignedToMainTraveler: !hasEmail
      };

      if (hasEmail) {
        travelersWithEmail.push(travelerPoints);
      } else {
        travelersWithoutEmail.push(travelerPoints);
        // Los puntos de viajeros sin email se asignan al titular
        if (traveler.id === mainTravelerId) {
          mainTravelerPoints += pointsPerTraveler;
        }
      }
    });

    // Si el titular no tiene email, también recibe sus propios puntos
    const mainTraveler = travelers.find(t => t.id === mainTravelerId);
    if (mainTraveler && (!mainTraveler.email || mainTraveler.email.trim() === '')) {
      mainTravelerPoints += pointsPerTraveler;
    }

    const distribution = [
      ...travelersWithEmail,
      ...travelersWithoutEmail.map(t => ({
        ...t,
        points: t.travelerId === mainTravelerId ? mainTravelerPoints : 0
      }))
    ];

    return {
      totalPoints,
      mainTravelerPoints,
      travelersWithEmail,
      travelersWithoutEmail,
      distribution
    };
  }

  /**
   * Obtiene un resumen legible de la distribución de puntos
   */
  getPointsDistributionSummary(result: any): string {
    const summary: string[] = [];
    
    summary.push(`Total de puntos generados: ${result.totalPoints}`);
    summary.push(`Puntos del titular: ${result.mainTravelerPoints}`);
    summary.push(`Viajeros con email: ${result.travelersWithEmail.length}`);
    summary.push(`Viajeros sin email: ${result.travelersWithoutEmail.length}`);

    if (result.travelersWithEmail.length > 0) {
      summary.push('\nViajeros con email (puntos individuales):');
      result.travelersWithEmail.forEach((traveler: any) => {
        summary.push(`- ${traveler.travelerName}: ${traveler.points} puntos`);
      });
    }

    if (result.travelersWithoutEmail.length > 0) {
      summary.push('\nViajeros sin email (puntos asignados al titular):');
      result.travelersWithoutEmail.forEach((traveler: any) => {
        summary.push(`- ${traveler.travelerName}: puntos asignados al titular`);
      });
    }

    return summary.join('\n');
  }

  /**
   * Valida la asignación de puntos a un viajero
   * @param travelerId ID del viajero
   * @param points Puntos a asignar
   * @param travelers Datos de los viajeros
   * @param maxPointsPerPerson Límite máximo por persona
   * @returns true si la asignación es válida, false en caso contrario
   */
  validateAndAssignPoints(
    travelerId: string,
    points: number,
    travelers: TravelerData[],
    maxPointsPerPerson: number
  ): boolean {
    // Validar límite por persona
    const perPersonValidation = this.validatePerPersonLimit(travelerId, points, maxPointsPerPerson);
    if (!perPersonValidation.isValid) {
      this.showValidationError(perPersonValidation);
      return false;
    }
    
    // Validar que el viajero pueda recibir puntos
    if (travelerId !== 'main-traveler') {
      const traveler = travelers.find(t => t.id === travelerId);
      if (!traveler || !traveler.hasEmail) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de asignación',
          detail: 'Este viajero no puede recibir puntos (sin email)',
          life: 4000,
        });
        return false;
      }
    }
    
    return true;
  }

  // ===== MÉTODOS DE TRANSACCIONES =====

  /**
   * Procesa el canje de puntos creando las transacciones correspondientes
   * @param reservationId ID de la reserva
   * @param distribution Distribución de puntos por viajero
   * @param travelers Datos de los viajeros
   * @returns Promise<boolean> - true si el canje fue exitoso
   */
  async processPointsRedemption(
    reservationId: number,
    distribution: { [travelerId: string]: number },
    travelers: TravelerData[]
  ): Promise<boolean> {
    try {
      // TODO: Reemplazar con llamada real a la API
      // const result = await this.pointsService.redeemPoints(reservationId, distribution).toPromise();
      
      // TEMPORAL: Simular procesamiento exitoso
      console.log('Procesando canje de puntos:', {
        reservationId,
        distribution,
        travelers: travelers.map(t => ({ id: t.id, name: t.name }))
      });

      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      console.error('Error al procesar canje de puntos:', error);
      return false;
    }
  }

  /**
   * Procesa la reversión de puntos al cancelar una reserva
   * @param reservationId ID de la reserva
   * @returns Promise<boolean> - true si la reversión fue exitosa
   */
  async processPointsReversal(reservationId: number): Promise<boolean> {
    try {
      // TODO: Reemplazar con llamada real a la API
      // const result = await this.pointsService.reversePoints(reservationId).toPromise();
      
      // TEMPORAL: Simular procesamiento exitoso
      console.log('Procesando reversión de puntos para reserva:', reservationId);

      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      console.error('Error al procesar reversión de puntos:', error);
      return false;
    }
  }

  // ===== MÉTODOS DE UTILIDAD =====

  /**
   * Obtiene el nombre de un viajero por su ID
   * @param travelerId ID del viajero
   * @param travelers Datos de los viajeros
   * @returns Nombre del viajero
   */
  private getTravelerNameForValidation(travelerId: string, travelers: TravelerData[]): string {
    if (travelerId === 'main-traveler') {
      return 'Titular de la reserva';
    }
    
    const traveler = travelers.find(t => t.id === travelerId);
    return traveler ? traveler.name : 'Viajero desconocido';
  }

  /**
   * Muestra mensajes de error de validación
   * @param validationResult Resultado de la validación
   */
  private showValidationError(validationResult: ValidationResult): void {
    if (validationResult.isValid) return;
    
    // Mostrar mensaje principal
    this.messageService.add({
      severity: 'error',
      summary: 'Error en validación de puntos',
      detail: validationResult.message,
      life: 5000,
    });
    
    // Mostrar detalles adicionales si existen
    if (validationResult.details && validationResult.details.length > 0) {
      validationResult.details.forEach(detail => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Detalle adicional',
          detail: detail,
          life: 4000,
        });
      });
    }
  }

  /**
   * Genera un resumen de la distribución de puntos
   * @param distribution Distribución de puntos por viajero
   * @param travelers Datos de los viajeros
   * @returns Resumen de la distribución
   */
  generateDistributionSummary(
    distribution: { [travelerId: string]: number },
    travelers: TravelerData[]
  ): PointsDistributionSummary {
    const totalPoints = Object.values(distribution).reduce((sum, points) => sum + points, 0);
    const travelersWithPoints = Object.values(distribution).filter(points => points > 0).length;
    const mainTravelerPoints = distribution['main-traveler'] || 0;

    const distributionArray = Object.entries(distribution)
      .filter(([_, points]) => points > 0)
      .map(([travelerId, points]) => {
        const traveler = travelers.find(t => t.id === travelerId);
        return {
          name: traveler ? traveler.name : (travelerId === 'main-traveler' ? 'Titular' : 'Viajero'),
          points: points,
          discount: points // 1 punto = 1 euro
        };
      });

    return {
      totalPoints,
      travelersWithPoints,
      mainTravelerPoints,
      distribution: distributionArray
    };
  }
}