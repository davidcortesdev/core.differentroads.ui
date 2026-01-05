import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BookingItem } from '../../../../../../core/models/v2/profile-v2.model';
import { PointsV2Service } from '../../../../../../core/services/v2/points-v2.service';
import { TravelerCategory } from '../../../../../../core/models/v2/profile-v2.model';

@Component({
  selector: 'app-modal-points',
  standalone: false,
  templateUrl: './modal-points.component.html',
  styleUrls: ['./modal-points.component.scss'],
})
export class ModalPointsComponent implements OnInit, OnChanges {
  @Input() visible: boolean = false;
  @Input() bookingItem: BookingItem | null = null;
  @Input() userId: string = '';
  @Input() parentComponent?: any; // Referencia al componente padre para recargar datos
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() pointsApplied = new EventEmitter<void>();

  availablePoints: number = 0;
  pointsToUse: number = 0;
  userCategory: TravelerCategory = TravelerCategory.TROTAMUNDOS;
  maxPointsPerReservation: number = 50;
  maxPointsForCategory: number = 50;
  loadingUserData: boolean = false;
  
  // Propiedades para modal de confirmación
  confirmationModalVisible: boolean = false;

  constructor(
    private messageService: MessageService,
    private pointsService: PointsV2Service
  ) {}

  ngOnInit(): void {
    if (this.visible && this.bookingItem) {
      this.loadUserPointsData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && changes['visible'].currentValue && this.bookingItem) {
      this.pointsToUse = 0;
      this.loadUserPointsData();
    }
  }

  /**
   * Carga los datos de puntos del usuario
   */
  private loadUserPointsData(): void {
    this.loadingUserData = true;
    if (!this.userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el ID del usuario',
      });
      this.setDefaultCategory();
      this.loadingUserData = false;
      return;
    }

    // Obtener saldo de puntos del usuario
    this.pointsService.getLoyaltyBalanceFromAPI(this.userId).subscribe({
      next: (balance) => {
        this.availablePoints = balance?.pointsAvailable || balance?.totalPoints || balance?.balance || 0;
        this.loadingUserData = false;
      },
      error: (error: any) => {
        this.availablePoints = 0;
        this.loadingUserData = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se pudieron cargar los puntos del usuario. Usando valor por defecto.',
        });
      }
    });

    // Obtener categoría del usuario
    this.pointsService.getUserLoyaltyCategory(this.userId).then((userCategory: any) => {
      if (userCategory && userCategory.loyaltyCategoryId) {
        this.pointsService.getLoyaltyProgramCategory(userCategory.loyaltyCategoryId).then((category: any) => {
          if (category) {
            this.userCategory = this.mapCategoryNameToEnum(category.name);
            this.maxPointsForCategory = category.maxDiscountPerPurchase || 50;
            this.maxPointsPerReservation = Math.min(50, this.maxPointsForCategory);
          } else {
            this.setDefaultCategory();
          }
        }).catch((error: any) => {
          this.setDefaultCategory();
        });
      } else {
        this.setDefaultCategory();
      }
    }).catch((error: any) => {
      this.setDefaultCategory();
    });
  }

  /**
   * Mapea el nombre de categoría a enum
   */
  private mapCategoryNameToEnum(categoryName: string): TravelerCategory {
    const categoryMap: { [key: string]: TravelerCategory } = {
      'Trotamundos': TravelerCategory.TROTAMUNDOS,
      'Viajero': TravelerCategory.VIAJERO,
      'Nómada': TravelerCategory.NOMADA
    };
    return categoryMap[categoryName] || TravelerCategory.TROTAMUNDOS;
  }

  /**
   * Establece la categoría por defecto
   */
  private setDefaultCategory(): void {
    this.userCategory = TravelerCategory.TROTAMUNDOS;
    this.maxPointsForCategory = 50;
    this.maxPointsPerReservation = 50;
  }

  /**
   * Cierra la modal de descuento de puntos
   */
  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.bookingItem = null;
    this.pointsToUse = 0;
    this.availablePoints = 0;
  }

  /**
   * Obtiene el nombre de la categoría para mostrar
   */
  getCategoryDisplayName(): string {
    return this.pointsService.getCategoryDisplayName(this.userCategory);
  }

  /**
   * Valida y limita el número de dígitos en el input de puntos
   */
  validatePointsInput(): void {
    if (this.pointsToUse) {
      const pointsStr = this.pointsToUse.toString();
      if (pointsStr.length > 5) {
        this.pointsToUse = parseInt(pointsStr.substring(0, 5));
      }
      
      if (this.pointsToUse < 0) {
        this.pointsToUse = 0;
      }
      
      if (this.pointsToUse > this.availablePoints) {
        this.pointsToUse = this.availablePoints;
      }
    }
  }

  /**
   * Verifica si el botón de aplicar descuento debe estar habilitado
   */
  isApplyDiscountButtonEnabled(): boolean {
    if (!this.bookingItem || this.pointsToUse <= 0) {
      return false;
    }

    const validation = this.validatePointsUsage();
    return validation.isValid;
  }

  /**
   * Calcula el precio final después del descuento
   */
  getFinalPrice(): number {
    if (!this.bookingItem || this.pointsToUse <= 0) {
      return this.bookingItem?.price || 0;
    }
    
    const originalPrice = this.bookingItem.price || 0;
    const discount = this.pointsToUse;
    const finalPrice = originalPrice - discount;
    
    return Math.max(0, finalPrice);
  }

  /**
   * Muestra la modal de confirmación antes de aplicar el descuento
   */
  applyPointsDiscount(): void {
    if (!this.bookingItem || this.pointsToUse <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes seleccionar una cantidad de puntos válida',
      });
      return;
    }

    const validation = this.validatePointsUsage();
    
    if (!validation.isValid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de validación',
        detail: validation.message,
      });
      return;
    }

    // Mostrar modal de confirmación
    this.confirmationModalVisible = true;
  }

  /**
   * Cierra la modal de confirmación
   */
  closeConfirmationModal(): void {
    this.confirmationModalVisible = false;
  }

  /**
   * Confirma y aplica el descuento de puntos
   */
  confirmApplyPointsDiscount(): void {
    if (!this.bookingItem || this.pointsToUse <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes seleccionar una cantidad de puntos válida',
      });
      this.closeConfirmationModal();
      return;
    }

    const validation = this.validatePointsUsage();
    
    if (!validation.isValid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de validación',
        detail: validation.message,
      });
      this.closeConfirmationModal();
      return;
    }

    const reservationId = parseInt(this.bookingItem.id, 10);

    if (!this.userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el ID del usuario',
      });
      this.closeConfirmationModal();
      return;
    }

    const userIdNumber = parseInt(this.userId, 10);

    if (isNaN(userIdNumber) || isNaN(reservationId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'IDs inválidos',
      });
      this.closeConfirmationModal();
      return;
    }

    // Cerrar modal de confirmación
    this.closeConfirmationModal();

    this.pointsService.redeemPointsForReservation(reservationId, userIdNumber, this.pointsToUse)
      .then(result => {
        if (result.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Descuento Aplicado',
            detail: result.message,
          });
          
          // Emitir evento para que el componente padre actualice
          this.pointsApplied.emit();
          
          // Recargar la sección de puntos en el componente padre
          if (this.parentComponent && this.parentComponent.reloadPointsSection) {
            this.parentComponent.reloadPointsSection();
          }
          
          // Cerrar modal de descuento
          this.closeModal();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: result.message,
          });
        }
      })
      .catch(error => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al procesar el descuento. Inténtalo de nuevo.',
        });
      });
  }

  /**
   * Valida el uso de puntos según las reglas del documento
   */
  private validatePointsUsage(): { isValid: boolean; message: string } {
    // 1. Validar saldo disponible
    if (this.pointsToUse > this.availablePoints) {
      return {
        isValid: false,
        message: `No tienes suficientes puntos. Disponibles: ${this.availablePoints}`
      };
    }

    // 2. Validar límite por reserva (50€ máximo por reserva según documento)
    if (this.pointsToUse > this.maxPointsPerReservation) {
      return {
        isValid: false,
        message: `Máximo ${this.maxPointsPerReservation} puntos por reserva según las reglas`
      };
    }

    // 3. Validar límite por categoría
    if (this.pointsToUse > this.maxPointsForCategory) {
      const categoryName = this.pointsService.getCategoryDisplayName(this.userCategory);
      return {
        isValid: false,
        message: `Como ${categoryName} puedes usar máximo ${this.maxPointsForCategory} puntos por reserva`
      };
    }

    // 4. Validar que no exceda el precio de la reserva
    if (this.bookingItem && this.pointsToUse > (this.bookingItem.price || 0)) {
      return {
        isValid: false,
        message: 'No puedes canjear más puntos que el precio total de la reserva'
      };
    }

    return { isValid: true, message: '' };
  }
}

