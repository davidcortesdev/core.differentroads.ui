import { Component, Input, OnInit } from '@angular/core';
import { MembershipCard, PointsRecord, TravelerCategory, TravelerPointsSummary } from '../../../../core/models/v2/profile-v2.model';
import { PointsV2Service } from '../../../../core/services/v2/points-v2.service';


@Component({
  selector: 'app-points-section-v2',
  standalone: false,
  templateUrl: './points-section-v2.component.html',
  styleUrls: ['./points-section-v2.component.scss'],
})
export class PointsSectionV2Component implements OnInit {
  @Input() userId: string = '';
  
  points: PointsRecord[] = [];
  showTable: boolean = false;
  totalPoints: number = 0;
  membershipCards: MembershipCard[] = [];
  currentTrips: number = 0;
  currentCategory: TravelerCategory = TravelerCategory.TROTAMUNDOS;
  pointsSummary: TravelerPointsSummary | null = null;
  isLoading: boolean = true;

  constructor(
    private pointsService: PointsV2Service
  ) {
    this.points = [];
  }

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading = true;
    
    // Cargar todos los datos desde la API
    this.pointsService.getLoyaltyBalanceFromAPI(this.userId).subscribe({
      next: (balance) => {
        console.log('Loyalty Balance from API:', balance);
        
        // Cargar tarjetas de membresía
        this.pointsService.getMembershipCardsFromAPI().subscribe({
          next: (cards) => {
            this.membershipCards = cards;
            
            // Cargar transacciones de puntos
            this.pointsService.getLoyaltyTransactionsFromAPI(this.userId).subscribe({
              next: (transactions) => {
                console.log('Loyalty Transactions from API:', transactions);
                
                // Cargar tipos de transacciones
                this.pointsService.getLoyaltyTransactionTypesFromAPI().subscribe({
                  next: (transactionTypes) => {
                    console.log('Loyalty Transaction Types from API:', transactionTypes);
                    
                    // Procesar datos de la API
                    this.processApiData(balance, transactions, transactionTypes);
                    
                    this.isLoading = false;
                  },
                  error: (error) => {
                    console.error('Error loading transaction types:', error);
                    this.processApiData(balance, transactions, []);
                    this.isLoading = false;
                  }
                });
              },
              error: (error) => {
                console.error('Error loading transactions:', error);
                this.processApiData(balance, [], []);
                this.isLoading = false;
              }
            });
          },
          error: (error) => {
            console.error('Error loading membership cards:', error);
            this.processApiData(balance, [], []);
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading loyalty balance:', error);
      }
    });
  }

  private processApiData(balance: any, transactions: any[], transactionTypes: any[]): void {
    // Procesar saldo de puntos
    if (balance) {
      this.totalPoints = balance.totalPoints || balance.balance || 0;
    } else {
      // Fallback a datos mock
      this.totalPoints = this.pointsService.calculateTotalPoints(this.points);
    }

    // Procesar transacciones
    if (transactions && transactions.length > 0) {
      this.points = this.mapApiTransactionsToPoints(transactions);
    }
    
    // Determinar categoría basada en viajes
    this.currentCategory = this.pointsService.determineCategoryByTrips(this.currentTrips);
    
    // Marcar la categoría actual en las tarjetas
    this.updateCurrentCategoryInCards();
    
    // Generar resumen de puntos
    this.generatePointsSummary();
  }

  private mapApiTransactionsToPoints(transactions: any[]): PointsRecord[] {
    return transactions.map(transaction => ({
      booking: transaction.bookingId || transaction.booking || '',
      category: transaction.category || 'General',
      concept: transaction.concept || transaction.description || '',
      tour: transaction.tourName || transaction.tour || '',
      points: transaction.points || transaction.amount || 0,
      type: transaction.type === 'EARNED' || transaction.type === 'ACCRUAL' ? 'Acumular' : 'Canjear',
      amount: transaction.amount || 0,
      date: new Date(transaction.date || transaction.createdAt),
      status: transaction.status || 'Confirmed'
    }));
  }


  private updateCurrentCategoryInCards(): void {
    this.membershipCards = this.membershipCards.map(card => ({
      ...card,
      isCurrent: card.category === this.currentCategory,
      type: card.category === this.currentCategory ? 'Tu categoría actual' : 'Categoría de viajero'
    }));
  }

  private generatePointsSummary(): void {
    const incomePoints = this.points
      .filter(p => p.type === 'income')
      .reduce((total, point) => total + point.points, 0);
    
    const usedPoints = this.points
      .filter(p => p.type === 'redemption')
      .reduce((total, point) => total + point.points, 0);

    // Asegurarnos de que currentTrips esté disponible
    const currentTrips = this.currentTrips;
    const currentCategory = this.currentCategory;
    const nextCategory = this.getNextCategory();
    const pointsToNextCategory = this.calculatePointsToNextCategory();

    this.pointsSummary = {
      travelerId: this.userId,
      currentCategory: currentCategory,
      totalPoints: incomePoints,
      availablePoints: incomePoints - usedPoints,
      usedPoints: usedPoints,
      categoryStartDate: new Date('2024-01-01'), // Mock date
      nextCategory: nextCategory,
      pointsToNextCategory: pointsToNextCategory
    };
  }

  getNextCategory(): TravelerCategory | undefined {
    switch (this.currentCategory) {
      case TravelerCategory.TROTAMUNDOS:
        return TravelerCategory.VIAJERO;
      case TravelerCategory.VIAJERO:
        return TravelerCategory.NOMADA;
      default:
        return undefined;
    }
  }

  private calculatePointsToNextCategory(): number | undefined {
    const nextCategory = this.getNextCategory();
    if (!nextCategory) return undefined;
    
    const currentTrips = this.currentTrips;
    switch (nextCategory) {
      case TravelerCategory.VIAJERO:
        return Math.max(0, 3 - currentTrips);
      case TravelerCategory.NOMADA:
        return Math.max(0, 6 - currentTrips);
      default:
        return undefined;
    }
  }  


  getCardClass(card: MembershipCard): string {
    return this.pointsService.getCardClass(card);
  }

  getRemainingTripsText(card: MembershipCard): string {
    return this.pointsService.getRemainingTripsText(card, this.currentTrips);
  }

  getFormattedPoints(point: PointsRecord): string {
    return this.pointsService.getFormattedPoints(point);
  }

  getPointsClass(type: string): string {
    return this.pointsService.getPointsClass(type);
  }

  toggleTable(): void {
    this.showTable = !this.showTable;
  }

  // ===== MÉTODOS PARA CATEGORÍAS (E4-01) =====
  getCategoryDisplayName(category: TravelerCategory): string {
    return this.pointsService.getCategoryDisplayName(category);
  }

  getCategoryIcon(category: TravelerCategory): string {
    return this.pointsService.getCategoryIcon(category);
  }

  getCategoryBadgeClass(category: TravelerCategory): string {
    return this.pointsService.getCategoryBadgeClass(category);
  }

  // ===== MÉTODOS PARA HISTORIAL (E4-02) =====
  getFormattedDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getActionLabel(type: string): string {
    return type === 'acumular' ? 'Acumulación' : 'Canje';
  }

  getActionIcon(type: string): string {
    return type === 'acumular' ? 'pi pi-plus' : 'pi pi-minus';
  }

  getActionClass(type: string): string {
    return type === 'acumular' ? 'action-income' : 'action-redemption';
  }

  // ===== MÉTODOS PARA BENEFICIOS (E4-03) =====
  getMaxDiscountForCurrentCategory(): number {
    return this.pointsService.getMaxDiscountForCategory(this.currentCategory);
  }

  getNextCategoryFromSummary(): TravelerCategory | undefined {
    return this.pointsSummary?.nextCategory;
  }

  getProgressText(): string {
    const nextCategory = this.getNextCategory();
    if (!nextCategory) return 'Categoría máxima alcanzada';
    
    const tripsNeeded = this.pointsSummary?.pointsToNextCategory || 0;
    const nextCategoryName = this.getCategoryDisplayName(nextCategory);
    
    return `Faltan ${tripsNeeded} viajes para ${nextCategoryName}`;
  }

  getProgressPercentage(): number {
    if (!this.pointsSummary?.nextCategory) return 100;
    
    const currentTrips = this.currentTrips;
    const tripsNeeded = this.pointsSummary.pointsToNextCategory || 0;
    const totalTrips = currentTrips + tripsNeeded;
    
    return totalTrips > 0 ? (currentTrips / totalTrips) * 100 : 0;
  }

  // ===== MÉTODOS PARA TARJETAS DE CATEGORÍA =====
  getCardCategoryName(card: MembershipCard): string {
    // Extraer el nombre de la categoría del título de la tarjeta
    if (card.title.includes('Trotamundos')) return 'TROTAMUNDOS';
    if (card.title.includes('Viajero')) return 'VIAJERO';
    if (card.title.includes('Nómada')) return 'NÓMADA';
    return 'TROTAMUNDOS'; // Default
  }

  getCardCategoryIcon(card: MembershipCard): string {
    const categoryName = this.getCardCategoryName(card);
    switch (categoryName) {
      case 'TROTAMUNDOS': return 'pi pi-compass';
      case 'VIAJERO': return 'pi pi-globe';
      case 'NÓMADA': return 'pi pi-star';
      default: return 'pi pi-compass';
    }
  }

  getCardCategoryBadgeClass(card: MembershipCard): string {
    const categoryName = this.getCardCategoryName(card);
    return `card-category-badge-${categoryName.toLowerCase()}`;
  }
}