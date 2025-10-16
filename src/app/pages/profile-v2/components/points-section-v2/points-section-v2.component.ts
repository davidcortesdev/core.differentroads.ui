import { Component, Input, OnInit } from '@angular/core';
import { MembershipCard, PointsRecord, TravelerCategory, TravelerPointsSummary } from '../../../../core/models/v2/profile-v2.model';
import { PointsV2Service } from '../../../../core/services/v2/points-v2.service';
import { BookingsServiceV2 } from '../../../../core/services/v2/bookings-v2.service';


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
    private pointsService: PointsV2Service,
    private bookingsService: BookingsServiceV2
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
        // Cargar tarjetas de membresía
        this.pointsService.getMembershipCardsFromAPI().subscribe({
          next: (cards) => {
            this.membershipCards = cards;
            
            // Cargar transacciones de puntos
            this.pointsService.getLoyaltyTransactionsFromAPI(this.userId).subscribe({
              next: (transactions) => {
                // Cargar tipos de transacciones
                this.pointsService.getLoyaltyTransactionTypesFromAPI().subscribe({
                  next: (transactionTypes) => {
                    // Cargar historial de viajes completados
                    this.bookingsService.getTravelHistory(parseInt(this.userId)).subscribe({
                      next: (travelHistory) => {
                        // Procesar datos de la API
                        this.processApiData(balance, transactions, transactionTypes, travelHistory);
                        this.isLoading = false;
                      },
                      error: (error) => {
                        console.error('Error loading travel history:', error);
                        this.processApiData(balance, transactions, transactionTypes, []);
                        this.isLoading = false;
                      }
                    });
                  },
                  error: (error) => {
                    console.error('Error loading transaction types:', error);
                    this.processApiData(balance, transactions, [], []);
                    this.isLoading = false;
                  }
                });
              },
              error: (error) => {
                console.error('Error loading transactions:', error);
                this.processApiData(balance, [], [], []);
                this.isLoading = false;
              }
            });
          },
          error: (error) => {
            console.error('Error loading membership cards:', error);
            this.processApiData(balance, [], [], []);
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading loyalty balance:', error);
        this.isLoading = false;
      }
    });
  }

  private processApiData(balance: any, transactions: any[], transactionTypes: any[], travelHistory: any[]): void {
    // Procesar saldo de puntos
    this.totalPoints = balance?.pointsAvailable || balance?.totalPoints || balance?.balance || 0;

    // Procesar transacciones
    this.points = transactions && transactions.length > 0 
      ? this.mapApiTransactionsToPoints(transactions) 
      : [];

    // Procesar historial de viajes
    this.currentTrips = travelHistory && travelHistory.length > 0 
      ? this.calculateCompletedTrips(travelHistory) 
      : 0;
    
    // Determinar categoría basada en viajes reales
    this.currentCategory = this.pointsService.determineCategoryByTrips(this.currentTrips);
    
    // Marcar la categoría actual en las tarjetas
    this.updateCurrentCategoryInCards();
  }

  private calculateCompletedTrips(travelHistory: any[]): number {
    // Contar solo viajes completados (status 7 = PAID)
    return travelHistory.filter(trip => trip.reservationStatusId === 7).length;
  }

  private mapApiTransactionsToPoints(transactions: any[]): PointsRecord[] {
    return transactions.map(transaction => {
      // Determinar el tipo basado en transactionTypeId (1=EARNED, 2=REDEEMED)
      const isEarned = transaction.transactionTypeId === 1 || 
                       transaction.type === 'EARNED' || 
                       transaction.type === 'ACCRUAL' ||
                       transaction.points > 0;
      
      return {
        booking: transaction.referenceId || transaction.bookingId || transaction.booking || 'N/A',
        category: transaction.category || transaction.referenceType || 'General',
        concept: transaction.comment || transaction.concept || transaction.description || 'Sin concepto',
        tour: transaction.tourName || transaction.tour || transaction.comment || 'Tour no especificado',
        points: Math.abs(transaction.points || 0),
        type: isEarned ? 'Acumular' : 'Canjear',
        amount: transaction.amountBase || transaction.amount || 0,
        date: new Date(transaction.transactionDate || transaction.date || transaction.createdAt),
        status: transaction.status || 'Confirmed'
      };
    });
  }


  private updateCurrentCategoryInCards(): void {
    this.membershipCards = this.membershipCards.map(card => {
      // Verificar si la categoría está desbloqueada basándose en viajes completados
      const isUnlocked = this.currentTrips >= (card.minTrips || 0);
      const isCurrent = card.category === this.currentCategory;
      
      return {
        ...card,
        unlocked: isUnlocked,
        isCurrent: isCurrent,
        type: isCurrent ? 'Tu categoría actual' : 'Categoría de viajero'
      };
    });
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

  // ===== MÉTODOS PARA HISTORIAL =====
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