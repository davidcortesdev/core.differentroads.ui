import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TourNetService } from '../../core/services/tourNet.service';
import { ReservationService } from '../../core/services/reservation/reservation.service';
import { DepartureService } from '../../core/services/departure/departure.service';
import { DeparturePriceSupplementService, IDeparturePriceSupplementResponse } from '../../core/services/departure/departure-price-supplement.service';
import { AgeGroupService, IAgeGroupResponse } from '../../core/services/agegroup/age-group.service';
import { MenuItem } from 'primeng/api';
import { SelectorRoomComponent } from './components/selector-room/selector-room.component';
import { SelectorTravelerComponent } from './components/selector-traveler/selector-traveler.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-checkout-v2',
  standalone: false,
  templateUrl: './checkout-v2.component.html',
  styleUrl: './checkout-v2.component.scss'
})
export class CheckoutV2Component implements OnInit {
  // Referencias a componentes hijos
  @ViewChild('roomSelector') roomSelector!: SelectorRoomComponent;
  @ViewChild('travelerSelector') travelerSelector!: SelectorTravelerComponent;

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
    private ageGroupService: AgeGroupService
  ) {}

  ngOnInit(): void {
    // Configurar los steps
    this.initializeSteps();

    // Obtener el reservationId de la URL
    this.route.paramMap.subscribe(params => {
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
        command: () => this.onActiveIndexChange(0)
      },
      {
        label: 'Vuelos',
        command: () => this.onActiveIndexChange(1)
      },
      {
        label: 'Viajeros',
        command: () => this.onActiveIndexChange(2)
      },
      {
        label: 'Pago',
        command: () => this.onActiveIndexChange(3)
      }
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
        this.error = 'Error al cargar los datos de la reservación. Por favor, inténtalo de nuevo más tarde.';
        this.loading = false;
      }
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
        this.error = 'Error al cargar los datos del tour. Por favor, inténtalo de nuevo más tarde.';
        this.loading = false;
      }
    });
  }

  // Método para cargar datos del departure
  private loadDepartureData(departureId: number): void {
    this.departureService.getById(departureId).subscribe({
      next: (departure) => {
        this.departureDate = departure.departureDate;
        this.returnDate = departure.arrivalDate;
      },
      error: (error) => {
        // Error al cargar los datos del departure - continuando sin fechas
      }
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
      }
    });
  }

  // Método para cargar grupos de edad
  private loadAgeGroups(): void {
    if (!this.departurePriceSupplements || this.departurePriceSupplements.length === 0) {
      return;
    }

    // Obtener IDs únicos de grupos de edad
    const uniqueAgeGroupIds = [...new Set(this.departurePriceSupplements.map(s => s.ageGroupId))];

    const ageGroupRequests = uniqueAgeGroupIds.map(id => this.ageGroupService.getById(id));

    forkJoin(ageGroupRequests).subscribe({
      next: (ageGroups) => {
        this.ageGroups = ageGroups;
        this.mapPricesByAgeGroup();
      },
      error: (error) => {
        // Error al cargar grupos de edad
      }
    });
  }

  // Método para mapear precios por grupo de edad
  private mapPricesByAgeGroup(): void {
    this.pricesByAgeGroup = {};

    this.departurePriceSupplements.forEach(supplement => {
      const ageGroup = this.ageGroups.find(ag => ag.id === supplement.ageGroupId);
      if (ageGroup) {
        const ageGroupName = this.normalizeAgeGroupName(ageGroup.name);
        this.pricesByAgeGroup[ageGroupName] = supplement.basePeriodPrice;
      }
    });
    
    // NUEVO: Inicializar el resumen automáticamente después de cargar precios
    this.initializeOrderSummary();
  }

  // NUEVO: Método para inicializar el resumen automáticamente
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
    } else if (name.includes('child') || name.includes('niño') || name.includes('menor')) {
      return 'Niños';
    } else if (name.includes('baby') || name.includes('bebé') || name.includes('infant')) {
      return 'Bebés';
    }
    
    return ageGroupName; // Devolver original si no se puede mapear
  }

  /**
   * Método llamado cuando cambian los números de viajeros en el selector de travelers
   * Este método actualiza el componente de habitaciones con los nuevos números
   */
  onTravelersNumbersChange(travelersNumbers: { adults: number; childs: number; babies: number }): void {
    // Actualizar el total de pasajeros
    this.totalPassengers = travelersNumbers.adults + travelersNumbers.childs + travelersNumbers.babies;
    
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
    if (this.travelerSelector && Object.keys(this.pricesByAgeGroup).length > 0) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    }
  }

  // NUEVO: Método para verificar si podemos inicializar el resumen
  private checkAndInitializeSummary(): void {
    // Verificar si tenemos todo lo necesario para inicializar
    const hasPrices = Object.keys(this.pricesByAgeGroup).length > 0;
    const hasTravelers = this.travelerSelector && this.travelerSelector.travelersNumbers;
    
    if (hasPrices && hasTravelers) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    } else if (hasPrices && this.totalPassengers > 0) {
      // Si no tenemos travelers específicos, usar los de la reserva
      const fallbackTravelers = {
        adults: Math.max(1, this.totalPassengers),
        childs: 0,
        babies: 0
      };
      this.updateOrderSummary(fallbackTravelers);
    }
  }

  // Método para actualizar el resumen del pedido
  updateOrderSummary(travelersNumbers: { adults: number; childs: number; babies: number }): void {
    this.summary = [];

    // Plan básico - Adultos
    if (travelersNumbers.adults > 0) {
      const adultPrice = this.pricesByAgeGroup['Adultos'] || 0;
      // Solo añadir al summary si el precio es mayor que 0
      if (adultPrice > 0) {
        this.summary.push({
          qty: travelersNumbers.adults,
          value: adultPrice,
          description: 'Plan básico adultos'
        });
      }
    }

    // Plan básico - Niños
    if (travelersNumbers.childs > 0) {
      const childPrice = this.pricesByAgeGroup['Niños'] || 0;
      // Solo añadir al summary si el precio es mayor que 0
      if (childPrice > 0) {
        this.summary.push({
          qty: travelersNumbers.childs,
          value: childPrice,
          description: 'Plan básico niños'
        });
      }
    }

    // Plan básico - Bebés
    if (travelersNumbers.babies > 0) {
      const babyPrice = this.pricesByAgeGroup['Bebés'] || 0;
      // Solo añadir al summary si el precio es mayor que 0
      if (babyPrice > 0) {
        this.summary.push({
          qty: travelersNumbers.babies,
          value: babyPrice,
          description: 'Plan básico bebés'
        });
      }
    }

    // Habitaciones seleccionadas
    if (this.roomSelector && this.roomSelector.selectedRooms) {
      Object.entries(this.roomSelector.selectedRooms).forEach(([tkId, qty]) => {
        if (qty > 0) {
          const room = this.roomSelector.allRoomsAvailability.find(r => r.tkId === tkId);
          if (room) {
            const roomPrice = room.basePrice || 0;
            // Solo añadir habitaciones con precio (pueden ser negativos para descuentos)
            if (roomPrice !== 0) {
              this.summary.push({
                qty: qty,
                value: roomPrice,
                description: `Suplemento hab. ${room.name}`
              });
            }
          }
        }
      });
    }

    // Calcular totales
    this.calculateTotals();

    // Actualizar totalAmount en la reserva si ha cambiado
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
      // Crear objeto de actualización
      const updateData = {
        ...this.reservationData,
        totalAmount: this.totalAmountCalculated,
        updatedAt: new Date().toISOString()
      };

      this.reservationService.update(this.reservationId, updateData).subscribe({
        next: (success) => {
          if (success) {
            this.reservationData.totalAmount = this.totalAmountCalculated;
            this.totalAmount = this.totalAmountCalculated; // Actualizar variable local también
          }
        },
        error: (error) => {
          // Error al actualizar totalAmount en la reserva
        }
      });
    }
  }

  // Método para formatear la fecha
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const dateParts = dateString.split('-'); // Ejemplo: "2025-07-23" -> ["2025", "07", "23"]
      
      if (dateParts.length !== 3) return dateString;
      
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Los meses en JS van de 0-11
      const day = parseInt(dateParts[2]);
      
      // Crear fecha SIN zona horaria para evitar cambios de día
      const date = new Date(year, month, day);
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
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
    // Guardar cambios de travelers y habitaciones antes de continuar
    if (targetStep === 1 && this.travelerSelector && this.roomSelector) {
      let canContinue = true;

      try {
        // 1. Guardar cambios de travelers si hay pendientes (en paralelo)
        const savePromises: Promise<any>[] = [];

        if (this.travelerSelector.hasUnsavedChanges) {
          this.travelerSelector.saveTravelersChanges();
          
          // Esperar solo 500ms en lugar de 2000ms
          savePromises.push(new Promise(resolve => setTimeout(resolve, 500)));
        }

        // 2. Verificar habitaciones seleccionadas inmediatamente
        const hasSelectedRooms = Object.values(this.roomSelector.selectedRooms).some((qty: number) => qty > 0);
        if (!hasSelectedRooms) {
          alert('Por favor, selecciona al menos una habitación antes de continuar.');
          return; // Salir inmediatamente
        }

        // 3. Esperar promesas en paralelo si las hay
        if (savePromises.length > 0) {
          await Promise.all(savePromises);
        }

        // 4. Recargar travelers solo si es necesario
        if (this.travelerSelector.hasUnsavedChanges) {
          await this.roomSelector.loadExistingTravelers();
        }

        // 5. Guardar asignaciones de habitaciones
        const roomsSaved = await this.roomSelector.saveRoomAssignments();
        
        if (!roomsSaved) {
          alert('Hubo un error al guardar las asignaciones de habitaciones. Por favor, inténtalo de nuevo.');
          return; // Salir si hay error
        }

      } catch (error) {
        alert('Hubo un error al guardar los datos. Por favor, inténtalo de nuevo.');
        return; // Salir si hay error
      }
    }

    // Navegar inmediatamente al siguiente paso
    this.onActiveIndexChange(targetStep);
  }
}