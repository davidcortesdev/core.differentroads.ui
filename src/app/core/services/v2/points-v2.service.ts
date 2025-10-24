import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MembershipCard, PointsRecord, TravelerCategory, CategoryConfig, PointsTransaction, TravelerPointsSummary, TransactionType, TransactionCategory } from '../../models/v2/profile-v2.model';

// Interfaces para canje de puntos
export interface PointsRedemptionConfig {
  enabled: boolean;
  totalPointsToUse: number;
  pointsPerTraveler: { [travelerId: string]: number };
  maxDiscountPerTraveler: number;
  totalDiscount: number;
}

// Interfaces para endpoints reales - ESQUEMA CORRECTO DEL BACKEND
export interface LoyaltyTransactionCreate {
  userId: number;                // ID del usuario en la base de datos
  transactionDate: string;       // Fecha de la transacción en formato ISO
  transactionTypeId: number;     // ID del tipo de transacción (4 = REDEEM_BOOKING para canje)
  points: number;                // Cantidad de puntos (negativo para canje)
  amountBase: number;            // Monto base asociado
  currency: string;              // Código de moneda (EUR, USD, etc.)
  referenceType: string;         // Tipo de referencia ("RESERVATION", etc.)
  referenceId: string;           // ID de la referencia como string
  comment: string;               // Comentario o descripción
}

export interface LoyaltyTransaction {
  id: number;
  travelerId: string;
  points: number;
  transactionType: string;
  transactionCategory: string;
  description: string;
  reservationId: number;
  createdAt: Date;
}

// ✅ Interface actualizada según esquema real del backend
export interface LoyaltyBalance {
  id: number;
  userId: number;                // ID del usuario (numérico)
  pointsAvailable: number;       // ✅ Nombre correcto del campo en el backend
  pointsTotalEarned: number;     // ✅ Nombre correcto del campo
  pointsTotalRedeemed: number;   // ✅ Nombre correcto del campo
  createdAt: string;             // ISO string
  updatedAt: string;             // ISO string
}

export interface UserLoyaltyCategory {
  id: number;
  userId: string;              // cognito:sub
  loyaltyCategoryId: number;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
}

export interface LoyaltyProgramCategory {
  id: number;
  name: string;               // "Trotamundos", "Viajante", "Nómada"
  minPoints: number;          // Puntos mínimos para alcanzar esta categoría
  maxPoints: number;          // Puntos máximos de esta categoría
  maxDiscountPerPurchase: number;  // Límite de canje por compra (50, 75, 100)
  benefits: string[];         // Lista de beneficios
  color: string;              // Color de la tarjeta
  icon: string;               // Icono de la categoría
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
  private readonly AUTH_API_URL = environment.usersApiUrl;
  private readonly RESERVATIONS_API_URL = environment.reservationsApiUrl;

  // ===== CONSTANTES DEL SISTEMA =====
  private readonly POINTS_PERCENTAGE = 0.03; // 3% del PVP
  private readonly POINTS_PER_EURO = 1; // 1 punto = 1 euro
  private readonly MAX_POINTS_PER_PERSON = 50; // Máximo 50€ por persona por reserva

  constructor(
    private http: HttpClient,
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



  /**
   * Obtiene el saldo de puntos desde la API
   * @param travelerId ID del viajero
   * @returns Observable con el saldo de puntos
   */
  getLoyaltyBalanceFromAPI(travelerId: string): Observable<any> {
    const url = `${this.AUTH_API_URL}/LoyaltyBalance?userId=${travelerId}`;
    
    return this.http.get<any>(url).pipe(
      map(balance => {
        // Si la API devuelve un array, tomar el primer elemento
        if (Array.isArray(balance) && balance.length > 0) {
          return balance[0];
        }
        return balance;
      }),
      catchError(error => {
        console.error('Error loading loyalty balance from API:', error);
        return of(null);
      })
    );
  }

  /**
   * Obtiene las transacciones de puntos desde la API
   * @param travelerId ID del viajero
   * @returns Observable con las transacciones
   */
  getLoyaltyTransactionsFromAPI(travelerId: string): Observable<any[]> {
    const url = `${this.AUTH_API_URL}/LoyaltyTransaction?userId=${travelerId}`;
    
    return this.http.get<any[]>(url).pipe(
      map(transactions => {
        // Si la API devuelve un objeto en lugar de array, convertirlo a array
        if (transactions && !Array.isArray(transactions)) {
          return [transactions];
        }
        return transactions || [];
      }),
      catchError(error => {
        console.error('Error loading loyalty transactions from API:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene los tipos de transacciones desde la API
   * @returns Observable con los tipos de transacciones
   */
  getLoyaltyTransactionTypesFromAPI(): Observable<any[]> {
    return this.http.get<any[]>(`${this.AUTH_API_URL}/LoyaltyTransactionType`).pipe(
      catchError(error => {
        console.error('Error loading loyalty transaction types from API:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene las categorías de membresía desde la API
   * @returns Observable con las tarjetas de membresía
   */
  getMembershipCardsFromAPI(): Observable<MembershipCard[]> {
    return this.http.get<any[]>(`${this.AUTH_API_URL}/LoyaltyProgramCategory`).pipe(
      map(apiCategories => apiCategories.map(category => this.mapApiCategoryToMembershipCard(category))),
      catchError(error => {
        console.error('Error loading membership categories from API:', error);
        return of([]);
      })
    );
  }

  /**
   * Carga todos los datos de puntos desde la API
   * @param travelerId ID del viajero
   * @returns Observable con todos los datos
   */
  loadAllPointsDataFromAPI(travelerId: string): Observable<{
    balance: any;
    transactions: any[];
    transactionTypes: any[];
    membershipCards: MembershipCard[];
  }> {
    return this.http.get<any>(`${this.AUTH_API_URL}/LoyaltyBalance/${travelerId}`).pipe(
      map(balance => ({
        balance,
        transactions: [], // Se puede implementar si hay endpoint específico
        transactionTypes: [], // Se puede implementar si hay endpoint específico
        membershipCards: [] // Se cargará por separado
      })),
      catchError(error => {
        console.error('Error loading all points data from API:', error);
        return of({
          balance: null,
          transactions: [],
          transactionTypes: [],
          membershipCards: []
        });
      })
    );
  }

  /**
   * Convierte una categoría del API a MembershipCard
   * @param apiCategory Categoría desde el API
   * @returns MembershipCard
   */
  private mapApiCategoryToMembershipCard(apiCategory: any): MembershipCard {
    // Mapear el nombre de la categoría a TravelerCategory
    const categoryMap: { [key: string]: TravelerCategory } = {
      'Trotamundos': TravelerCategory.TROTAMUNDOS,
      'Viajero': TravelerCategory.VIAJERO,
      'Nómada': TravelerCategory.NOMADA
    };

    const category = categoryMap[apiCategory.name] || TravelerCategory.TROTAMUNDOS;

    return {
      type: 'Categoría de viajero',
      title: apiCategory.name,
      image: apiCategory.imageUrl || null,
      benefits: this.sanitizeHtml(this.generateBenefitsFromCategory(apiCategory)),
      unlocked: true, // Todas las categorías están desbloqueadas para mostrar
      isCurrent: false, // Se determinará en el componente
      requirement: this.generateRequirementFromCategory(apiCategory),
      minTrips: this.getMinTripsForCategory(category),
      maxTrips: this.getMaxTripsForCategory(category),
      remainingTrips: 0,
      statusText: 'Desbloqueado',
      category: category,
      maxDiscount: apiCategory.redeemCapPerBookingAmount || 0,
      color: this.getCategoryColor(category),
      icon: this.getCategoryIcon(category)
    };
  }

  /**
   * Genera beneficios basados en la categoría del API
   */
  private generateBenefitsFromCategory(apiCategory: any): string {
    const benefits = [
      `Descuento del ${apiCategory.accrualRatePercent}% en todos los tours`,
      'Acceso prioritario a nuevas rutas',
      'Asistencia 24/7'
    ];

    // Agregar beneficios específicos según la categoría
    if (apiCategory.name === 'Viajero') {
      benefits.push('Upgrade gratuito de habitación', 'Tours exclusivos', 'Prioridad en reservas');
    } else if (apiCategory.name === 'Nómada') {
      benefits.push('Suite gratuita en cada viaje', 'Tours privados', 'Concierge personal', 'Acceso VIP a eventos');
    }

    benefits.push(`Canje máximo de ${apiCategory.redeemCapPerBookingAmount}€ por compra`);

    return benefits.map(benefit => `• ${benefit}`).join('<br>');
  }

  /**
   * Genera requisitos basados en la categoría del API
   */
  private generateRequirementFromCategory(apiCategory: any): string {
    const minTrips = this.getMinTripsForCategory(this.mapNameToCategory(apiCategory.name));
    return `Completar ${minTrips} viajes para desbloquear`;
  }

  /**
   * Mapea el nombre de la categoría a TravelerCategory
   */
  private mapNameToCategory(name: string): TravelerCategory {
    const categoryMap: { [key: string]: TravelerCategory } = {
      'Trotamundos': TravelerCategory.TROTAMUNDOS,
      'Viajero': TravelerCategory.VIAJERO,
      'Nómada': TravelerCategory.NOMADA
    };
    return categoryMap[name] || TravelerCategory.TROTAMUNDOS;
  }

  /**
   * Obtiene el color por defecto para una categoría
   */
  private getCategoryColor(category: TravelerCategory): string {
    const colors: { [key in TravelerCategory]: string } = {
      [TravelerCategory.TROTAMUNDOS]: '#4A90E2',
      [TravelerCategory.VIAJERO]: '#7B68EE',
      [TravelerCategory.NOMADA]: '#FFD700'
    };
    return colors[category] || '#4A90E2';
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

  // ===== MÉTODOS PARA ENDPOINTS REALES =====

  /**
   * ✅ Canjea puntos de un usuario en una reserva específica
   * @param reservationId ID de la reserva
   * @param userId ID numérico del usuario en la base de datos
   * @param pointsToUse Puntos a canjear
   * @returns Resultado de la operación
   */
  async redeemPointsForReservation(
    reservationId: number,
    userId: number,
    pointsToUse: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Iniciando canje de puntos:', { reservationId, userId, pointsToUse });

      // 1. Validar estado de pago
      console.log('1️⃣ Validando estado de pago...');
      const isPaid = await this.checkReservationPaymentStatus(reservationId);
      console.log('   ✅ Estado de pago verificado:', isPaid ? 'PAGADA' : 'NO PAGADA');
      
      if (isPaid) {
        return { 
          success: false, 
          message: 'Esta reserva ya ha sido pagada. No puedes canjear puntos.' 
        };
      }

      // 2. Validar saldo disponible
      console.log('2️⃣ Validando saldo disponible...');
      const balance = await this.getLoyaltyBalance(userId.toString());
      console.log('   ✅ Saldo obtenido:', balance);
      
      if (balance.pointsAvailable < pointsToUse) {
        return { 
          success: false, 
          message: `No tienes suficientes puntos disponibles. Tienes ${balance.pointsAvailable} puntos.` 
        };
      }

      // 3. Validar límites (máximo 50€ por reserva)
      console.log('3️⃣ Validando límites...');
      if (pointsToUse > 50) {
        return { 
          success: false, 
          message: 'El máximo de puntos que puedes canjear por reserva es 50.' 
        };
      }

      // 4. Crear transacción de canje con esquema correcto del backend
      console.log('4️⃣ Creando transacción de canje...');
      const transaction: LoyaltyTransactionCreate = {
        userId: userId,                              // ✅ ID numérico del usuario
        transactionDate: new Date().toISOString(),   // ✅ Fecha actual en ISO
        transactionTypeId: 4,                        // ✅ 4 = REDEEM_BOOKING (Canje por reserva)
        points: -pointsToUse,                        // ✅ Negativo para restar puntos
        amountBase: pointsToUse,                     // ✅ 1 punto = 1 euro
        currency: 'EUR',                             // ✅ Moneda
        referenceType: 'RESERVATION',                // ✅ Tipo de referencia
        referenceId: reservationId.toString(),       // ✅ ID de reserva como string
        comment: `Descuento de ${pointsToUse} puntos en reserva #${reservationId}` // ✅ Comentario
      };
      console.log('   📦 Payload de transacción:', transaction);

      const createdTransaction = await this.createLoyaltyTransaction(transaction);
      console.log('   ✅ Transacción creada exitosamente:', createdTransaction);

      // 5. Actualizar total de la reserva
      console.log('5️⃣ Actualizando total de la reserva...');
      await this.updateReservationTotalAmount(reservationId, pointsToUse);
      console.log('   ✅ Total de reserva actualizado');

      console.log('✅ Canje de puntos completado exitosamente');

      return { 
        success: true, 
        message: `Se han aplicado ${pointsToUse} puntos correctamente. El descuento se ha aplicado a tu reserva.` 
      };

    } catch (error: any) {
      console.error('❌ Error en canje de puntos:', error);
      console.error('   Status:', error?.status);
      console.error('   Error del servidor:', error?.error);
      
      // Mensaje de error más específico
      let errorMessage = 'Error al procesar el canje de puntos. Por favor, inténtalo de nuevo.';
      if (error?.error?.errors) {
        const errors = Object.values(error.error.errors).flat();
        errorMessage = `Error de validación: ${errors.join(', ')}`;
      }
      
      return { 
        success: false, 
        message: errorMessage
      };
    }
  }

  /**
   * Valida el estado de pago de una reserva
   * @param reservationId ID de la reserva
   * @returns true si está pagada, false si no
   */
  async checkReservationPaymentStatus(reservationId: number): Promise<boolean> {
    try {
      const url = `${this.RESERVATIONS_API_URL}/ReservationPayment/summary/${reservationId}`;
      const summary = await this.http.get<any>(url).toPromise();
      return summary.paymentPercentage >= 100;
    } catch (error) {
      console.error('Error verificando estado de pago:', error);
      return false;
    }
  }

  /**
   * Obtiene el saldo de puntos de un usuario
   * @param travelerId cognito:sub del usuario
   * @returns Saldo de puntos
   */
  /**
   * ✅ Obtiene el saldo de puntos de un usuario
   * @param userId ID del usuario (como string o número)
   * @returns Saldo de puntos
   */
  async getLoyaltyBalance(userId: string): Promise<LoyaltyBalance> {
    try {
      const url = `${this.AUTH_API_URL}/LoyaltyBalance?userId=${userId}`;
      console.log('   📡 GET a:', url);
      
      const response = await this.http.get<any>(url).toPromise();
      console.log('   📦 Respuesta:', response);
      
      // Si la API devuelve un array, tomar el primer elemento
      if (Array.isArray(response) && response.length > 0) {
        return response[0];
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo saldo de puntos:', error);
      return {
        id: 0,
        userId: parseInt(userId),
        pointsAvailable: 0,
        pointsTotalEarned: 0,
        pointsTotalRedeemed: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Valida si un usuario puede canjear la cantidad de puntos especificada
   * @param travelerId cognito:sub del usuario
   * @param pointsToUse Puntos que quiere usar
   * @param reservationId ID de la reserva
   * @returns Resultado de la validación
   */
  async validatePointsRedemption(
    travelerId: string,
    pointsToUse: number,
    reservationId: number
  ): Promise<ValidationResult> {
    try {
      // Validar límite de 50 puntos por persona
      if (pointsToUse > this.MAX_POINTS_PER_PERSON) {
        return {
          isValid: false,
          message: `No puedes canjear más de ${this.MAX_POINTS_PER_PERSON} puntos por reserva.`,
          errorType: 'per_person_limit'
        };
      }

      // Obtener categoría del usuario para validar límites adicionales
      const userCategory = await this.getUserLoyaltyCategory(travelerId);
      if (userCategory) {
        const category = await this.getLoyaltyProgramCategory(userCategory.loyaltyCategoryId);
        if (category && pointsToUse > category.maxDiscountPerPurchase) {
          return {
            isValid: false,
            message: `Según tu categoría (${category.name}), puedes canjear máximo ${category.maxDiscountPerPurchase} puntos por reserva.`,
            errorType: 'category_limit'
          };
        }
      }

      // Obtener datos de la reserva para validar que no exceda el total
      const reservation = await this.getReservation(reservationId);
      if (reservation && pointsToUse > reservation.totalAmount) {
        return {
          isValid: false,
          message: `No puedes canjear más puntos que el total de la reserva (${reservation.totalAmount}€).`,
          errorType: 'per_person_limit'
        };
      }

      return {
        isValid: true,
        message: 'Validación exitosa',
        errorType: 'none'
      };

    } catch (error) {
      console.error('Error validando canje de puntos:', error);
      return {
        isValid: false,
        message: 'Error al validar el canje de puntos',
        errorType: 'none'
      };
    }
  }

  /**
   * ✅ Crea una transacción de puntos
   * @param transaction Datos de la transacción
   * @returns Transacción creada
   */
  async createLoyaltyTransaction(transaction: LoyaltyTransactionCreate): Promise<LoyaltyTransaction> {
    try {
      const url = `${this.AUTH_API_URL}/LoyaltyTransaction`;
      console.log('   📡 POST a:', url);
      console.log('   📦 Payload:', JSON.stringify(transaction, null, 2));
      
      const result = await this.http.post<LoyaltyTransaction>(url, transaction).toPromise();
      
      if (!result) {
        throw new Error('No se recibió respuesta del servidor');
      }
      
      console.log('   ✅ Respuesta del servidor:', result);
      return result;
    } catch (error: any) {
      console.error('   ❌ Error en createLoyaltyTransaction:', error);
      console.error('   Status:', error?.status);
      console.error('   Errores de validación:', error?.error?.errors);
      throw error;
    }
  }

  /**
   * ✅ Actualiza el total de una reserva restando el descuento de puntos
   * @param reservationId ID de la reserva
   * @param pointsDiscount Descuento en puntos a aplicar
   */
  async updateReservationTotalAmount(reservationId: number, pointsDiscount: number): Promise<void> {
    try {
      // 1. Obtener datos actuales de la reserva
      console.log('   📡 Obteniendo datos de la reserva...');
      const reservation = await this.getReservation(reservationId);
      
      if (!reservation) {
        throw new Error('No se pudo obtener los datos de la reserva');
      }
      
      console.log('   📦 Reserva actual:', reservation);
      
      // 2. Calcular nuevo total
      const newTotalAmount = reservation.totalAmount - pointsDiscount;
      console.log('   💰 Total actual:', reservation.totalAmount);
      console.log('   💰 Descuento:', pointsDiscount);
      console.log('   💰 Nuevo total:', newTotalAmount);
      
      // 3. Actualizar la reserva con el nuevo total
      const updateData = {
        tkId: reservation.tkId || null,
        reservationStatusId: reservation.reservationStatusId,
        retailerId: reservation.retailerId,
        tourId: reservation.tourId,
        departureId: reservation.departureId,
        userId: reservation.userId,
        totalPassengers: reservation.totalPassengers,
        totalAmount: newTotalAmount  // ✅ Nuevo total con descuento aplicado
      };
      
      const url = `${this.RESERVATIONS_API_URL}/Reservation/${reservationId}`;
      console.log('   📡 PUT a:', url);
      console.log('   📦 Payload:', updateData);
      
      await this.http.put(url, updateData).toPromise();
      console.log('   ✅ Reserva actualizada exitosamente');
      
    } catch (error: any) {
      console.error('❌ Error actualizando total de reserva:', error);
      console.error('   Status:', error?.status);
      console.error('   Error:', error?.error);
      throw error;
    }
  }

  /**
   * Obtiene los datos de una reserva
   * @param reservationId ID de la reserva
   * @returns Datos de la reserva
   */
  async getReservation(reservationId: number): Promise<any> {
    try {
      const url = `${this.RESERVATIONS_API_URL}/Reservation/${reservationId}`;
      return await this.http.get<any>(url).toPromise();
    } catch (error) {
      console.error('Error obteniendo reserva:', error);
      return null;
    }
  }

  /**
   * Obtiene la categoría de lealtad de un usuario
   * @param travelerId cognito:sub del usuario
   * @returns Categoría del usuario
   */
  async getUserLoyaltyCategory(travelerId: string): Promise<UserLoyaltyCategory | null> {
    try {
      const url = `${this.AUTH_API_URL}/UserLoyaltyCategory?userId=${travelerId}`;
      const response = await this.http.get<any[]>(url).toPromise();
      
      if (response && response.length > 0) {
        // Buscar la categoría activa (sin endDate)
        const activeCategory = response.find(cat => cat.isActive && !cat.endDate);
        return activeCategory || response[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo categoría del usuario:', error);
      return null;
    }
  }

  /**
   * Obtiene los detalles de una categoría de lealtad
   * @param categoryId ID de la categoría
   * @returns Detalles de la categoría
   */
  async getLoyaltyProgramCategory(categoryId: number): Promise<LoyaltyProgramCategory | null> {
    try {
      const url = `${this.AUTH_API_URL}/LoyaltyProgramCategory/${categoryId}`;
      const result = await this.http.get<LoyaltyProgramCategory>(url).toPromise();
      return result || null;
    } catch (error) {
      console.error('Error obteniendo categoría:', error);
      return null;
    }
  }

  /**
   * Obtiene el userId por email
   * @param email Email del usuario
   * @returns cognito:sub del usuario o null
   */
  async getUserIdByEmail(email: string): Promise<string | null> {
    try {
      const url = `${this.AUTH_API_URL}/User?Email=${email}`;
      const response = await this.http.get<any[]>(url).toPromise();
      
      if (response && response.length > 0) {
        return response[0].cognitoSub;
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo usuario por email:', error);
      return null;
    }
  }
}