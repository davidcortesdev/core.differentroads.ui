import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TourNetService } from '../../core/services/tourNet.service';
import { ReservationService } from '../../core/services/reservation/reservation.service';
import { DepartureService } from '../../core/services/departure/departure.service';
import {
  DeparturePriceSupplementService,
  IDeparturePriceSupplementResponse,
} from '../../core/services/departure/departure-price-supplement.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../core/services/agegroup/age-group.service';
import { MenuItem, MessageService } from 'primeng/api';
import { SelectorRoomComponent } from './components/selector-room/selector-room.component';
import { SelectorTravelerComponent } from './components/selector-traveler/selector-traveler.component';
import { InsuranceComponent } from './components/insurance/insurance.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-checkout-v2',
  standalone: false,
  templateUrl: './checkout-v2.component.html',
  styleUrl: './checkout-v2.component.scss',
})
export class CheckoutV2Component implements OnInit {
  // Referencias a componentes hijos
  @ViewChild('roomSelector') roomSelector!: SelectorRoomComponent;
  @ViewChild('travelerSelector') travelerSelector!: SelectorTravelerComponent;
  @ViewChild('insuranceSelector') insuranceSelector!: InsuranceComponent;

  // Datos del tour
  tourName: string = '';
  departureDate: string = '';
  returnDate: string = '';
  departureId: number | null = null;
  reservationId: number | null = null;
  totalAmount: number = 0;
  loading: boolean = false;
  error: string | null = null;

  // Variables adicionales para mostrar información completa
  tourId: number | null = null;
  itineraryId: number | null = null; // Se obtiene del departure
  totalPassengers: number = 0;

  // Variables para el resumen del pedido
  summary: { qty: number; value: number; description: string }[] = [];
  subtotal: number = 0;
  totalAmountCalculated: number = 0;

  // Datos de precios por grupo de edad
  departurePriceSupplements: IDeparturePriceSupplementResponse[] = [];
  ageGroups: IAgeGroupResponse[] = [];
  pricesByAgeGroup: { [ageGroupName: string]: number } = {};
  reservationData: any = null;

  // Propiedades para seguros
  selectedInsurance: any = null;
  insurancePrice: number = 0;

  // Steps configuration
  items: MenuItem[] = [];
  activeIndex: number = 0;

  // Tour slug para navegación
  tourSlug: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourNetService: TourNetService,
    private reservationService: ReservationService,
    private departureService: DepartureService,
    private departurePriceSupplementService: DeparturePriceSupplementService,
    private ageGroupService: AgeGroupService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Configurar los steps
    this.initializeSteps();

    // Obtener el reservationId de la URL
    this.route.paramMap.subscribe((params) => {
      const reservationIdParam = params.get('reservationId');
      if (reservationIdParam) {
        this.reservationId = +reservationIdParam;

        // Cargar datos de la reservación desde el backend
        this.loadReservationData(this.reservationId);
      } else {
        this.error = 'No se proporcionó un ID de reservación válido';
      }
    });
  }

  // Inicializar los pasos del checkout
  private initializeSteps(): void {
    this.items = [
      {
        label: 'Personalizar viaje',
        command: () => this.onActiveIndexChange(0),
      },
      {
        label: 'Vuelos',
        command: () => this.onActiveIndexChange(1),
      },
      {
        label: 'Viajeros',
        command: () => this.onActiveIndexChange(2),
      },
      {
        label: 'Pago',
        command: () => this.onActiveIndexChange(3),
      },
    ];
  }

  // Método para cargar datos de la reservación
  private loadReservationData(reservationId: number): void {
    this.loading = true;
    this.error = null;

    this.reservationService.getById(reservationId).subscribe({
      next: (reservation) => {
        // Extraer datos de la reservación
        this.departureId = reservation.departureId;
        this.totalAmount = reservation.totalAmount;
        this.tourId = reservation.tourId;
        this.totalPassengers = reservation.totalPassengers;
        this.reservationData = reservation; // Guardar datos completos de la reserva

        // Cargar datos del tour usando reservation.tourId
        this.loadTourData(reservation.tourId);

        // Cargar datos del departure usando reservation.departureId
        this.loadDepartureData(reservation.departureId);

        // Cargar precios del departure
        this.loadDeparturePrices(reservation.departureId);
      },
      error: (error) => {
        this.error =
          'Error al cargar los datos de la reservación. Por favor, inténtalo de nuevo más tarde.';
        this.loading = false;
      },
    });
  }

  // Método para cargar datos del tour
  private loadTourData(tourId: number): void {
    this.tourNetService.getTourById(tourId).subscribe({
      next: (tour) => {
        this.tourName = tour.name || '';
        this.tourSlug = this.generateTourSlug(this.tourName);

        this.loading = false;
      },
      error: (error) => {
        this.error =
          'Error al cargar los datos del tour. Por favor, inténtalo de nuevo más tarde.';
        this.loading = false;
      },
    });
  }

  // Método para cargar datos del departure - aquí se obtiene el itineraryId
  private loadDepartureData(departureId: number): void {
    this.departureService.getById(departureId).subscribe({
      next: (departure) => {
        this.departureDate = departure.departureDate ?? '';
        this.returnDate = departure.arrivalDate ?? '';

        // Asignar el itineraryId desde el departure
        this.itineraryId = departure.itineraryId;
      },
      error: (error) => {
        // Error al cargar los datos del departure - continuando sin fechas
      },
    });
  }

  // Método para cargar precios del departure
  private loadDeparturePrices(departureId: number): void {
    this.departurePriceSupplementService.getByDeparture(departureId).subscribe({
      next: (supplements) => {
        this.departurePriceSupplements = supplements;
        this.loadAgeGroups();
      },
      error: (error) => {
        // Error al cargar price supplements
      },
    });
  }

  // Método para cargar grupos de edad
  private loadAgeGroups(): void {
    if (
      !this.departurePriceSupplements ||
      this.departurePriceSupplements.length === 0
    ) {
      return;
    }

    // Obtener IDs únicos de grupos de edad
    const uniqueAgeGroupIds = [
      ...new Set(this.departurePriceSupplements.map((s) => s.ageGroupId)),
    ];

    const ageGroupRequests = uniqueAgeGroupIds.map((id) =>
      this.ageGroupService.getById(id)
    );

    forkJoin(ageGroupRequests).subscribe({
      next: (ageGroups) => {
        this.ageGroups = ageGroups;
        this.mapPricesByAgeGroup();
      },
      error: (error) => {
        // Error al cargar grupos de edad
      },
    });
  }

  // Método para mapear precios por grupo de edad
  private mapPricesByAgeGroup(): void {
    this.pricesByAgeGroup = {};

    this.departurePriceSupplements.forEach((supplement) => {
      const ageGroup = this.ageGroups.find(
        (ag) => ag.id === supplement.ageGroupId
      );
      if (ageGroup) {
        const ageGroupName = this.normalizeAgeGroupName(ageGroup.name);
        this.pricesByAgeGroup[ageGroupName] = supplement.basePeriodPrice;
      }
    });

    // Inicializar el resumen automáticamente después de cargar precios
    this.initializeOrderSummary();
  }

  // Método para inicializar el resumen automáticamente
  private initializeOrderSummary(): void {
    // Verificar inmediatamente
    this.checkAndInitializeSummary();

    // También verificar después de un delay para asegurar que los componentes estén listos
    setTimeout(() => {
      this.checkAndInitializeSummary();
    }, 1500);

    // Y una verificación final después de más tiempo
    setTimeout(() => {
      if (this.summary.length === 0) {
        this.checkAndInitializeSummary();
      }
    }, 3000);
  }

  // Método para normalizar nombres de grupos de edad
  private normalizeAgeGroupName(ageGroupName: string): string {
    const name = ageGroupName.toLowerCase();

    if (name.includes('adult') || name.includes('adulto')) {
      return 'Adultos';
    } else if (
      name.includes('child') ||
      name.includes('niño') ||
      name.includes('menor')
    ) {
      return 'Niños';
    } else if (
      name.includes('baby') ||
      name.includes('bebé') ||
      name.includes('infant')
    ) {
      return 'Bebés';
    }

    return ageGroupName; // Devolver original si no se puede mapear
  }

  /**
   * Método llamado cuando cambian los números de viajeros en el selector de travelers
   * Este método actualiza el componente de habitaciones con los nuevos números
   */
  onTravelersNumbersChange(travelersNumbers: {
    adults: number;
    childs: number;
    babies: number;
  }): void {
    // Actualizar el total de pasajeros
    this.totalPassengers =
      travelersNumbers.adults +
      travelersNumbers.childs +
      travelersNumbers.babies;

    // Comunicar el cambio al componente de habitaciones
    if (this.roomSelector) {
      this.roomSelector.updateTravelersNumbers(travelersNumbers);
    }

    // Actualizar el resumen del pedido (solo si ya tenemos precios cargados)
    if (Object.keys(this.pricesByAgeGroup).length > 0) {
      this.updateOrderSummary(travelersNumbers);
    }
  }

  /**
   * Método llamado cuando cambian las habitaciones seleccionadas
   */
  onRoomsSelectionChange(selectedRooms: { [tkId: string]: number }): void {
    // Recalcular el resumen con los datos actuales de travelers (solo si ya tenemos precios)
    if (
      this.travelerSelector &&
      Object.keys(this.pricesByAgeGroup).length > 0
    ) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    }
  }

  /**
   * Método llamado cuando cambia la selección de seguro
   */
  onInsuranceSelectionChange(insuranceData: {
    selectedInsurance: any;
    price: number;
  }): void {
    this.selectedInsurance = insuranceData.selectedInsurance;
    this.insurancePrice = insuranceData.price;

    // Recalcular el resumen del pedido (sin afectar la lógica existente)
    if (
      this.travelerSelector &&
      Object.keys(this.pricesByAgeGroup).length > 0
    ) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    }
  }

  // Método para verificar si podemos inicializar el resumen
  private checkAndInitializeSummary(): void {
    // Verificar si tenemos todo lo necesario para inicializar
    const hasPrices = Object.keys(this.pricesByAgeGroup).length > 0;
    const hasTravelers =
      this.travelerSelector && this.travelerSelector.travelersNumbers;

    if (hasPrices && hasTravelers) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    } else if (hasPrices && this.totalPassengers > 0) {
      // Si no tenemos travelers específicos, usar los de la reserva
      const fallbackTravelers = {
        adults: Math.max(1, this.totalPassengers),
        childs: 0,
        babies: 0,
      };
      this.updateOrderSummary(fallbackTravelers);
    }
  }

  // Método para actualizar el resumen del pedido
  updateOrderSummary(travelersNumbers: {
    adults: number;
    childs: number;
    babies: number;
  }): void {
    this.summary = [];

    // Plan básico - Adultos
    if (travelersNumbers.adults > 0) {
      const adultPrice = this.pricesByAgeGroup['Adultos'] || 0;
      if (adultPrice > 0) {
        this.summary.push({
          qty: travelersNumbers.adults,
          value: adultPrice,
          description: 'Plan básico adultos',
        });
      }
    }

    // Plan básico - Niños
    if (travelersNumbers.childs > 0) {
      const childPrice = this.pricesByAgeGroup['Niños'] || 0;
      if (childPrice > 0) {
        this.summary.push({
          qty: travelersNumbers.childs,
          value: childPrice,
          description: 'Plan básico niños',
        });
      }
    }

    // Plan básico - Bebés
    if (travelersNumbers.babies > 0) {
      const babyPrice = this.pricesByAgeGroup['Bebés'] || 0;
      if (babyPrice > 0) {
        this.summary.push({
          qty: travelersNumbers.babies,
          value: babyPrice,
          description: 'Plan básico bebés',
        });
      }
    }

    // Habitaciones seleccionadas
    if (this.roomSelector && this.roomSelector.selectedRooms) {
      Object.entries(this.roomSelector.selectedRooms).forEach(([tkId, qty]) => {
        if (qty > 0) {
          const room = this.roomSelector.allRoomsAvailability.find(
            (r) => r.tkId === tkId
          );
          if (room) {
            const roomPrice = room.basePrice || 0;
            if (roomPrice !== 0) {
              this.summary.push({
                qty: qty,
                value: roomPrice,
                description: `Suplemento hab. ${room.name}`,
              });
            }
          }
        }
      });
    }

    // Seguro seleccionado
    if (this.selectedInsurance && this.insurancePrice > 0) {
      const totalTravelers =
        travelersNumbers.adults +
        travelersNumbers.childs +
        travelersNumbers.babies;
      this.summary.push({
        qty: totalTravelers,
        value: this.insurancePrice,
        description: `Seguro ${this.selectedInsurance.name}`,
      });
    }

    // Calcular totales
    this.calculateTotals();

    // Actualizar totales en la reserva (solo localmente, no en BD)
    this.updateReservationTotalAmount();
  }

  // Método para calcular totales
  calculateTotals(): void {
    // Calcular subtotal (solo valores positivos)
    this.subtotal = this.summary.reduce((acc, item) => {
      if (item.value >= 0) {
        return acc + item.value * item.qty;
      }
      return acc;
    }, 0);

    // Calcular total (todos los valores, incluyendo negativos)
    this.totalAmountCalculated = this.summary.reduce((acc, item) => {
      return acc + item.value * item.qty;
    }, 0);
  }

  // Método para actualizar totalAmount en la reserva
  private updateReservationTotalAmount(): void {
    if (!this.reservationId || !this.reservationData) {
      return;
    }

    // Solo actualizar si el monto ha cambiado
    if (this.totalAmountCalculated !== this.reservationData.totalAmount) {
      // Actualizar las variables locales inmediatamente para evitar conflictos
      this.reservationData.totalAmount = this.totalAmountCalculated;
      this.totalAmount = this.totalAmountCalculated;
    }
  }

  // Método para formatear la fecha
  formatDate(dateString: string): string {
    if (!dateString) return '';

    try {
      const dateParts = dateString.split('-');

      if (dateParts.length !== 3) return dateString;

      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);

      const date = new Date(year, month, day);

      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  // Generar fechas formateadas para el subtítulo
  get tourDates(): string {
    if (!this.departureDate && !this.returnDate) return '';

    const departure = this.formatDate(this.departureDate);
    const returnFormatted = this.formatDate(this.returnDate);

    if (departure && returnFormatted) {
      return `${departure} - ${returnFormatted}`;
    } else if (departure) {
      return `Salida: ${departure}`;
    } else if (returnFormatted) {
      return `Regreso: ${returnFormatted}`;
    }

    return '';
  }

  // Generar slug del tour para navegación
  private generateTourSlug(tourName: string): string {
    if (!tourName) return '';

    return tourName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Manejar cambio de paso activo
  onActiveIndexChange(index: number): void {
    this.activeIndex = index;
  }

  // Método para navegar al siguiente paso con validación
  async nextStepWithValidation(targetStep: number): Promise<void> {
    // Guardar cambios de travelers, habitaciones y seguros antes de continuar
    if (
      targetStep === 1 &&
      this.travelerSelector &&
      this.roomSelector &&
      this.insuranceSelector
    ) {
      try {
        // 1. Guardar cambios de travelers si hay pendientes
        if (this.travelerSelector.hasUnsavedChanges) {
          this.travelerSelector.saveTravelersChanges();
          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        // 2. Verificar habitaciones seleccionadas inmediatamente
        const hasSelectedRooms = Object.values(
          this.roomSelector.selectedRooms
        ).some((qty: number) => qty > 0);
        if (!hasSelectedRooms) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Habitación requerida',
            detail:
              'Por favor, selecciona al menos una habitación antes de continuar.',
            life: 5000,
          });
          return;
        }

        // 3. Validar que las habitaciones seleccionadas puedan acomodar a todos los pasajeros
        const currentTravelers = this.travelerSelector.travelersNumbers;
        const totalPassengers =
          currentTravelers.adults +
          currentTravelers.childs +
          currentTravelers.babies;

        // Calcular la capacidad total de las habitaciones seleccionadas
        let totalCapacity = 0;
        Object.entries(this.roomSelector.selectedRooms).forEach(
          ([tkId, qty]) => {
            if (qty > 0) {
              const room = this.roomSelector.allRoomsAvailability.find(
                (r) => r.tkId === tkId
              );
              if (room) {
                const roomCapacity = room.isShared ? 1 : room.capacity || 1;
                totalCapacity += roomCapacity * qty;
              }
            }
          }
        );

        // Validar que la capacidad sea suficiente
        if (totalCapacity < totalPassengers) {
          this.messageService.add({
            severity: 'error',
            summary: 'Capacidad insuficiente',
            detail: `Las habitaciones seleccionadas tienen capacidad para ${totalCapacity} personas, pero tienes ${totalPassengers} viajeros. Por favor, selecciona más habitaciones o habitaciones de mayor capacidad.`,
            life: 7000,
          });
          return;
        }

        // Validar que la capacidad no sea excesiva (más del 150% necesario)
        if (totalCapacity > totalPassengers * 1.5) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Capacidad excesiva',
            detail: `Las habitaciones seleccionadas tienen capacidad para ${totalCapacity} personas, pero solo tienes ${totalPassengers} viajeros. Esto puede generar costos innecesarios.`,
            life: 6000,
          });
          // No retornamos aquí, solo advertimos pero permitimos continuar
        }

        // 4. Recargar travelers después de guardar cambios
        await this.roomSelector.loadExistingTravelers();
        this.insuranceSelector.loadExistingTravelers();

        // 5. Actualizar el número de pasajeros total y recalcular resumen
        this.totalPassengers = totalPassengers;
        this.updateOrderSummary(currentTravelers);
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 6. Guardar asignaciones de habitaciones y seguros EN PARALELO
        const [roomsSaved, insuranceSaved] = await Promise.all([
          this.roomSelector.saveRoomAssignments(),
          this.insuranceSelector.saveInsuranceAssignments(),
        ]);

        if (!roomsSaved) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar habitaciones',
            detail:
              'Hubo un error al guardar las asignaciones de habitaciones. Por favor, inténtalo de nuevo.',
            life: 5000,
          });
          return;
        }

        if (!insuranceSaved) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar seguro',
            detail:
              'Hubo un error al guardar las asignaciones de seguro. Por favor, inténtalo de nuevo.',
            life: 5000,
          });
          return;
        }

        // 7. Actualizar el totalPassengers en la reserva
        if (this.reservationId && this.reservationData) {
          const reservationUpdateData = {
            ...this.reservationData,
            totalPassengers: this.totalPassengers,
            totalAmount: this.totalAmountCalculated,
            updatedAt: new Date().toISOString(),
          };

          await new Promise((resolve, reject) => {
            this.reservationService
              .update(this.reservationId!, reservationUpdateData)
              .subscribe({
                next: (success) => {
                  if (success) {
                    this.reservationData.totalPassengers = this.totalPassengers;
                    this.reservationData.totalAmount =
                      this.totalAmountCalculated;
                    this.totalAmount = this.totalAmountCalculated;

                    // Mostrar toast de éxito
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Guardado exitoso',
                      detail: `Datos guardados correctamente para ${this.totalPassengers} viajeros.`,
                      life: 3000,
                    });

                    resolve(success);
                  } else {
                    reject(new Error('Error al actualizar la reserva'));
                  }
                },
                error: (error) => {
                  reject(error);
                },
              });
          });
        }
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error inesperado',
          detail:
            'Hubo un error al guardar los datos. Por favor, inténtalo de nuevo.',
          life: 5000,
        });
        return;
      }
    }

    // Navegar al siguiente paso
    this.onActiveIndexChange(targetStep);
  }
}
