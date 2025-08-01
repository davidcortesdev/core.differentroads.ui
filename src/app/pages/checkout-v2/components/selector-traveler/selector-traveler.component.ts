import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import { DepartureService } from '../../../../core/services/departure/departure.service';
import { ReservationService } from '../../../../core/services/reservation/reservation.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  DeparturePriceSupplementService,
  IDeparturePriceSupplementResponse,
} from '../../../../core/services/departure/departure-price-supplement.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../../../core/services/agegroup/age-group.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-selector-traveler',
  standalone: false,
  templateUrl: './selector-traveler.component.html',
  styleUrl: './selector-traveler.component.scss',
})
export class SelectorTravelerComponent implements OnInit, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() availableTravelers: string[] = ['Adultos', 'Niños', 'Bebés'];

  // Emitir cambios en el número de viajeros para el componente de habitaciones
  @Output() travelersNumbersChange = new EventEmitter<{
    adults: number;
    childs: number;
    babies: number;
  }>();

  // Emitir eventos de guardado para el componente padre
  @Output() saveStatusChange = new EventEmitter<{
    saving: boolean;
    success?: boolean;
    error?: string;
  }>();

  travelersNumbers: { adults: number; childs: number; babies: number } = {
    adults: 1,
    childs: 0,
    babies: 0,
  };

  // Números originales de la reserva (solo lectura)
  originalTravelersNumbers: { adults: number; childs: number; babies: number } =
    {
      adults: 1,
      childs: 0,
      babies: 0,
    };

  // Conteo real por grupos de edad de la reserva existente
  actualTravelerCounts: { adults: number; childs: number; babies: number } = {
    adults: 0,
    childs: 0,
    babies: 0,
  };

  adultsErrorMsg = '';
  loading: boolean = false;
  error: string | null = null;
  saving: boolean = false; // NUEVO: Estado de guardado

  // Datos del departure y travelers
  departureData: any = null;
  reservationData: any = null;
  existingTravelers: IReservationTravelerResponse[] = [];
  totalExistingTravelers: number = 0;

  // Datos del departure price supplement
  departurePriceSupplements: IDeparturePriceSupplementResponse[] = [];
  loadingSupplements: boolean = false;
  supplementsError: string | null = null;

  // Datos de los grupos de edad
  ageGroups: IAgeGroupResponse[] = [];
  loadingAgeGroups: boolean = false;
  ageGroupsError: string | null = null;
  dynamicAvailableTravelers: string[] = [];

  constructor(
    private departureService: DepartureService,
    private reservationService: ReservationService,
    private reservationTravelerService: ReservationTravelerService,
    private departurePriceSupplementService: DeparturePriceSupplementService,
    private ageGroupService: AgeGroupService
  ) {}

  ngOnInit() {
    // Cargar datos iniciales si ya tenemos los IDs
    if (this.departureId) {
      this.loadDepartureData();
      this.loadDeparturePriceSupplements();
    }

    if (this.reservationId) {
      this.loadExistingTravelers();
      this.loadReservationData();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Detectar cambios en departureId
    if (changes['departureId'] && changes['departureId'].currentValue) {
      this.loadDepartureData();
      this.loadDeparturePriceSupplements();
    }

    // Detectar cambios en reservationId
    if (changes['reservationId'] && changes['reservationId'].currentValue) {
      this.loadExistingTravelers();
      this.loadReservationData();
    }
  }

  private loadReservationData(): void {
    if (!this.reservationId) {
      return;
    }

    this.reservationService.getById(this.reservationId).subscribe({
      next: (reservation) => {
        this.reservationData = reservation;
      },
      error: (error) => {
        console.error('Error al cargar los datos de la reserva:', error);
      },
    });
  }

  private loadDeparturePriceSupplements(): void {
    if (!this.departureId) {
      return;
    }

    this.loadingSupplements = true;
    this.supplementsError = null;

    this.departurePriceSupplementService
      .getByDeparture(this.departureId)
      .subscribe({
        next: (supplements) => {
          this.departurePriceSupplements = supplements || [];
          this.loadingSupplements = false;
          this.loadAgeGroupsFromSupplements();
        },
        error: (error) => {
          this.supplementsError =
            'Error al cargar los suplementos de precio del viaje.';
          this.loadingSupplements = false;
          console.error('Error loading supplements:', error);
        },
      });
  }

  private loadAgeGroupsFromSupplements(): void {
    if (
      !this.departurePriceSupplements ||
      this.departurePriceSupplements.length === 0
    ) {
      return;
    }

    this.loadingAgeGroups = true;
    this.ageGroupsError = null;

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
        this.updateAvailableTravelersFromAgeGroups();
        this.loadingAgeGroups = false;

        // Si ya tenemos viajeros cargados, contar por grupos de edad
        if (this.existingTravelers.length > 0) {
          this.countTravelersByAgeGroup();
        }
      },
      error: (error) => {
        this.ageGroupsError =
          'Error al cargar la información de grupos de edad.';
        this.loadingAgeGroups = false;
        this.dynamicAvailableTravelers = this.availableTravelers;
        console.error('Error loading age groups:', error);
      },
    });
  }

  private updateAvailableTravelersFromAgeGroups(): void {
    if (!this.ageGroups || this.ageGroups.length === 0) {
      this.dynamicAvailableTravelers = this.availableTravelers;
      return;
    }

    const travelers: string[] = [];

    this.ageGroups.forEach((ageGroup) => {
      const name = ageGroup.name.toLowerCase();

      // Mapear nombres de grupos de edad a tipos de viajeros
      if (
        name.includes('adult') ||
        name.includes('adulto') ||
        ageGroup.lowerLimitAge >= 12
      ) {
        if (!travelers.includes('Adultos')) {
          travelers.push('Adultos');
        }
      } else if (
        name.includes('child') ||
        name.includes('niño') ||
        name.includes('menor') ||
        (ageGroup.lowerLimitAge >= 3 && ageGroup.upperLimitAge <= 11)
      ) {
        if (!travelers.includes('Niños')) {
          travelers.push('Niños');
        }
      } else if (
        name.includes('baby') ||
        name.includes('bebé') ||
        name.includes('infant') ||
        ageGroup.upperLimitAge <= 2
      ) {
        if (!travelers.includes('Bebés')) {
          travelers.push('Bebés');
        }
      }
    });

    // Si no se pudo mapear ningún grupo, usar todos por defecto
    if (travelers.length === 0) {
      this.dynamicAvailableTravelers = this.availableTravelers;
    } else {
      this.dynamicAvailableTravelers = travelers;
    }
  }

  private loadExistingTravelers(): void {
    if (!this.reservationId) {
      return;
    }

    this.loading = true;

    this.reservationTravelerService
      .getByReservationOrdered(this.reservationId)
      .subscribe({
        next: (travelers) => {
          this.existingTravelers = travelers;
          this.totalExistingTravelers = travelers.length;

          // Si ya tenemos los grupos de edad cargados, contar inmediatamente
          if (this.ageGroups.length > 0) {
            this.countTravelersByAgeGroup();
          }

          this.loading = false;
        },
        error: (error) => {
          this.error =
            'Error al cargar la información de viajeros. Usando valores por defecto.';
          this.loading = false;
          console.error('Error loading existing travelers:', error);
        },
      });
  }

  private countTravelersByAgeGroup(): void {
    if (!this.reservationId || this.ageGroups.length === 0) {
      return;
    }

    // Resetear contadores
    this.actualTravelerCounts = {
      adults: 0,
      childs: 0,
      babies: 0,
    };

    // Obtener los IDs de grupos de edad para cada tipo
    const adultAgeGroupIds = this.getAgeGroupIdsByType('adults');
    const childAgeGroupIds = this.getAgeGroupIdsByType('childs');
    const babyAgeGroupIds = this.getAgeGroupIdsByType('babies');

    // Contar adultos
    this.countTravelersByAgeGroupIds(adultAgeGroupIds, 'adults');

    // Contar niños
    this.countTravelersByAgeGroupIds(childAgeGroupIds, 'childs');

    // Contar bebés
    this.countTravelersByAgeGroupIds(babyAgeGroupIds, 'babies');
  }

  private getAgeGroupIdsByType(type: 'adults' | 'childs' | 'babies'): number[] {
    return this.ageGroups
      .filter((ageGroup) => {
        const name = ageGroup.name.toLowerCase();

        switch (type) {
          case 'adults':
            return (
              name.includes('adult') ||
              name.includes('adulto') ||
              ageGroup.lowerLimitAge >= 12
            );
          case 'childs':
            return (
              name.includes('child') ||
              name.includes('niño') ||
              name.includes('menor') ||
              (ageGroup.lowerLimitAge >= 3 && ageGroup.upperLimitAge <= 11)
            );
          case 'babies':
            return (
              name.includes('baby') ||
              name.includes('bebé') ||
              name.includes('infant') ||
              ageGroup.upperLimitAge <= 2
            );
          default:
            return false;
        }
      })
      .map((ageGroup) => ageGroup.id);
  }

  private countTravelersByAgeGroupIds(
    ageGroupIds: number[],
    type: 'adults' | 'childs' | 'babies'
  ): void {
    if (ageGroupIds.length === 0) {
      return;
    }

    let totalCount = 0;
    let completedRequests = 0;

    ageGroupIds.forEach((ageGroupId) => {
      this.reservationTravelerService
        .getAll({
          reservationId: this.reservationId!,
          ageGroupId: ageGroupId,
        })
        .subscribe({
          next: (travelers) => {
            totalCount += travelers.length;
            completedRequests++;

            // Cuando se completen todas las requests para este tipo, actualizar el contador
            if (completedRequests === ageGroupIds.length) {
              this.actualTravelerCounts[type] = totalCount;
              this.updateTravelersNumbersFromActualCounts();
            }
          },
          error: (error) => {
            completedRequests++;
            console.error(
              `Error counting travelers for ageGroupId ${ageGroupId}:`,
              error
            );

            // Continuar aunque haya error
            if (completedRequests === ageGroupIds.length) {
              this.actualTravelerCounts[type] = totalCount;
              this.updateTravelersNumbersFromActualCounts();
            }
          },
        });
    });
  }

  private updateTravelersNumbersFromActualCounts(): void {
    this.travelersNumbers = {
      adults: this.actualTravelerCounts.adults,
      childs: this.actualTravelerCounts.childs,
      babies: this.actualTravelerCounts.babies,
    };

    // Asegurar que haya al menos 1 adulto si no hay viajeros
    if (
      this.travelersNumbers.adults === 0 &&
      this.travelersNumbers.childs === 0 &&
      this.travelersNumbers.babies === 0
    ) {
      this.travelersNumbers.adults = 1;
    }

    // Actualizar números originales
    this.originalTravelersNumbers = { ...this.travelersNumbers };

    // Emitir los números al componente de habitaciones
    this.travelersNumbersChange.emit(this.travelersNumbers);
  }

  private loadDepartureData(): void {
    if (!this.departureId) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.departureService.getById(this.departureId).subscribe({
      next: (departure) => {
        this.departureData = departure;
        this.loading = false;
      },
      error: (error) => {
        this.error =
          'Error al cargar la información del viaje. Usando valores por defecto.';
        this.loading = false;
        console.error('Error loading departure data:', error);
      },
    });
  }

  handlePassengers(value: number, type: 'adults' | 'childs' | 'babies'): void {
    if (value < 0) {
      value = 0;
    }

    // Validar que los adultos no sean menos que 1 si es el único tipo con pasajeros
    if (type === 'adults' && value === 0) {
      const totalOthers =
        this.travelersNumbers.childs + this.travelersNumbers.babies;
      if (totalOthers === 0) {
        value = 1; // Forzar al menos 1 adulto si no hay otros pasajeros
      }
    }

    this.travelersNumbers[type] = value;

    // Validar que haya suficientes adultos para los menores
    if (
      this.travelersNumbers.adults <
      this.travelersNumbers.childs + this.travelersNumbers.babies
    ) {
      this.adultsErrorMsg =
        'La cantidad de niños y bebés debe ser menor o igual a la de adultos.';
    } else {
      this.adultsErrorMsg = '';
    }

    // Emitir cambios para el componente de habitaciones
    this.travelersNumbersChange.emit(this.travelersNumbers);

    // NUEVO: Sincronizar automáticamente con la reservación
    if (this.reservationId && !this.adultsErrorMsg) {
      this.syncTravelersWithReservation();
    }
  }

  /**
   * MEJORADO: Método principal para sincronizar travelers con la reservación
   */
  private async syncTravelersWithReservation(): Promise<void> {
    if (!this.reservationId || this.saving) {
      return;
    }

    const newTotal = this.totalPassengers;
    const currentTotal = this.totalExistingTravelers;

    if (newTotal === currentTotal) {
      return;
    }

    this.saving = true;
    this.saveStatusChange.emit({ saving: true });

    try {
      if (newTotal > currentTotal) {
        // Necesitamos crear más travelers
        const travelersToCreate = newTotal - currentTotal;
        await this.createAdditionalTravelers(travelersToCreate);
      } else {
        // Necesitamos eliminar travelers
        const travelersToRemove = currentTotal - newTotal;
        await this.removeExcessTravelers(travelersToRemove);
      }

      // Actualizar el total de pasajeros en la reserva
      await this.updateReservationTotalPassengers();

      // Recargar travelers después de los cambios
      await this.reloadTravelers();

      this.saveStatusChange.emit({ saving: false, success: true });
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      this.saveStatusChange.emit({
        saving: false,
        success: false,
        error: 'Error al sincronizar travelers',
      });
    } finally {
      this.saving = false;
    }
  }

  /**
   * MEJORADO: Crear travelers adicionales con validación
   */
  private async createAdditionalTravelers(count: number): Promise<void> {
    if (!this.reservationId || count <= 0) return;

    const createPromises: Promise<IReservationTravelerResponse>[] = [];

    for (let i = 0; i < count; i++) {
      const promise = new Promise<IReservationTravelerResponse>(
        (resolve, reject) => {
          this.reservationTravelerService
            .createWithAutoTravelerNumber(
              this.reservationId!,
              false, // No es lead traveler por defecto
              '', // tkId vacío por ahora
              this.getDefaultAgeGroupId() // Usar grupo de edad por defecto
            )
            .subscribe({
              next: (newTraveler) => {
                resolve(newTraveler);
              },
              error: (error) => {
                console.error('❌ Error creando traveler:', error);
                reject(error);
              },
            });
        }
      );

      createPromises.push(promise);
    }

    try {
      const newTravelers = await Promise.all(createPromises);
    } catch (error) {
      console.error('❌ Error creando múltiples travelers:', error);
      throw error;
    }
  }

  /**
   * MEJORADO: Eliminar travelers excedentes con validación
   */
  private async removeExcessTravelers(count: number): Promise<void> {
    if (count <= 0) return;

    // Obtener travelers actuales ordenados
    const currentTravelers = await new Promise<IReservationTravelerResponse[]>(
      (resolve, reject) => {
        this.reservationTravelerService
          .getByReservationOrdered(this.reservationId!)
          .subscribe({
            next: resolve,
            error: reject,
          });
      }
    );

    // Filtrar para no eliminar el lead traveler
    const travelersToRemove = currentTravelers
      .filter((t) => !t.isLeadTraveler)
      .slice(-count);

    if (travelersToRemove.length === 0) {
      return;
    }

    const deletePromises = travelersToRemove.map((traveler) => {
      return new Promise<boolean>((resolve, reject) => {
        this.reservationTravelerService.delete(traveler.id).subscribe({
          next: (success) => {
            if (success) {
              resolve(true);
            } else {
              console.error(`❌ Fallo al eliminar traveler: ${traveler.id}`);
              reject(new Error(`Failed to delete traveler ${traveler.id}`));
            }
          },
          error: (error) => {
            console.error(
              `❌ Error eliminando traveler ${traveler.id}:`,
              error
            );
            reject(error);
          },
        });
      });
    });

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('❌ Error eliminando múltiples travelers:', error);
      throw error;
    }
  }

  /**
   * NUEVO: Obtener ID de grupo de edad por defecto
   */
  private getDefaultAgeGroupId(): number {
    if (this.ageGroups.length === 0) {
      return 0;
    }

    // Buscar grupo de adultos por defecto
    const adultGroup = this.ageGroups.find((group) => {
      const name = group.name.toLowerCase();
      return (
        name.includes('adult') ||
        name.includes('adulto') ||
        group.lowerLimitAge >= 12
      );
    });

    return adultGroup ? adultGroup.id : this.ageGroups[0].id;
  }

  /**
   * NUEVO: Actualizar el total de pasajeros en la reserva
   */
  private async updateReservationTotalPassengers(): Promise<void> {
    if (!this.reservationId || !this.reservationData) {
      return;
    }

    const newTotal = this.totalPassengers;

    return new Promise((resolve, reject) => {
      const updateData = {
        ...this.reservationData,
        totalPassengers: newTotal,
        updatedAt: new Date().toISOString(),
      };

      this.reservationService
        .update(this.reservationId!, updateData)
        .subscribe({
          next: (success) => {
            if (success) {
              this.reservationData.totalPassengers = newTotal;
              resolve();
            } else {
              reject(new Error('Failed to update reservation'));
            }
          },
          error: reject,
        });
    });
  }

  /**
   * NUEVO: Recargar travelers después de cambios
   */
  private async reloadTravelers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.reservationTravelerService
        .getByReservationOrdered(this.reservationId!)
        .subscribe({
          next: (travelers) => {
            this.existingTravelers = travelers;
            this.totalExistingTravelers = travelers.length;
            resolve();
          },
          error: reject,
        });
    });
  }

  // Getter para obtener el total de pasajeros
  get totalPassengers(): number {
    return (
      this.travelersNumbers.adults +
      this.travelersNumbers.childs +
      this.travelersNumbers.babies
    );
  }

  /**
   * MEJORADO: Método público para guardar cambios en la base de datos
   */
  async saveTravelersChanges(): Promise<boolean> {
    if (!this.hasUnsavedChanges) {
      return true;
    }

    try {
      await this.syncTravelersWithReservation();
      return true;
    } catch (error) {
      console.error('❌ Error guardando cambios de travelers:', error);
      return false;
    }
  }

  /**
   * NUEVO: Método para resetear a los números originales
   */
  resetTravelersNumbers(): void {
    this.travelersNumbers = { ...this.originalTravelersNumbers };
    this.travelersNumbersChange.emit(this.travelersNumbers);
    this.adultsErrorMsg = '';
  }

  /**
   * NUEVO: Verificar si hay cambios pendientes
   */
  get hasUnsavedChanges(): boolean {
    return (
      JSON.stringify(this.travelersNumbers) !==
      JSON.stringify(this.originalTravelersNumbers)
    );
  }

  // Getters para obtener el conteo real de cada tipo
  get currentAdultsCount(): number {
    return this.actualTravelerCounts.adults;
  }

  get currentChildsCount(): number {
    return this.actualTravelerCounts.childs;
  }

  get currentBabiesCount(): number {
    return this.actualTravelerCounts.babies;
  }

  /**
   * Método para obtener el rango de edad dinámico
   */
  getAgeRangeText(type: 'adults' | 'childs' | 'babies'): string {
    if (!this.ageGroups || this.ageGroups.length === 0) {
      // Fallback a rangos por defecto si no hay grupos de edad
      switch (type) {
        case 'adults':
          return '(Desde 12 años)';
        case 'childs':
          return '(3 a 11 años)';
        case 'babies':
          return '(0 a 2 años)';
        default:
          return '';
      }
    }

    // Encontrar el grupo de edad correspondiente
    const ageGroup = this.ageGroups.find((group) => {
      const name = group.name.toLowerCase();

      switch (type) {
        case 'adults':
          return (
            name.includes('adult') ||
            name.includes('adulto') ||
            group.lowerLimitAge >= 12
          );
        case 'childs':
          return (
            name.includes('child') ||
            name.includes('niño') ||
            name.includes('menor') ||
            (group.lowerLimitAge >= 3 && group.upperLimitAge <= 11)
          );
        case 'babies':
          return (
            name.includes('baby') ||
            name.includes('bebé') ||
            name.includes('infant') ||
            group.upperLimitAge <= 2
          );
        default:
          return false;
      }
    });

    if (!ageGroup) {
      // Si no encuentra el grupo, usar fallback
      return this.getAgeRangeText(type);
    }

    // Formatear el rango de edad
    if (ageGroup.upperLimitAge >= 99) {
      return `(Desde ${ageGroup.lowerLimitAge} años)`;
    }

    if (ageGroup.lowerLimitAge === ageGroup.upperLimitAge) {
      return `(${ageGroup.lowerLimitAge} años)`;
    }

    return `(${ageGroup.lowerLimitAge} a ${ageGroup.upperLimitAge} años)`;
  }
}
