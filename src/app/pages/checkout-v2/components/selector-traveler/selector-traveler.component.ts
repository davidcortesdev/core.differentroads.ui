import {
  Component,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { DepartureService } from '../../../../core/services/departure/departure.service';
import { ReservationService } from '../../../../core/services/reservation/reservation.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
  ReservationTravelerCreate,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  DeparturePriceSupplementService,
  IDeparturePriceSupplementResponse,
} from '../../../../core/services/departure/departure-price-supplement.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../../../core/services/agegroup/age-group.service';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-selector-traveler',
  standalone: false,
  templateUrl: './selector-traveler.component.html',
  styleUrl: './selector-traveler.component.scss',
})
export class SelectorTravelerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() availableTravelers: string[] = [];

  // Emitir cambios en el conteo por grupo de edad (dinámico)
  @Output() ageGroupCountsChange = new EventEmitter<{
    [ageGroupId: number]: number;
  }>();

  // Emitir eventos de guardado para el componente padre
  @Output() saveStatusChange = new EventEmitter<{
    saving: boolean;
    success?: boolean;
    error?: string;
  }>();

  // NUEVO: Output para notificar guardado exitoso al componente padre
  @Output() saveCompleted = new EventEmitter<{
    component: 'selector-traveler';
    success: boolean;
    data?: any;
    error?: string;
  }>();

  // Conteos dinámicos por grupo de edad
  ageGroupCounts: { [ageGroupId: number]: number } = {};
  originalAgeGroupCounts: { [ageGroupId: number]: number } = {};
  actualAgeGroupCounts: { [ageGroupId: number]: number } = {};

  adultsErrorMsg = '';
  loading: boolean = false;
  error: string | null = null;
  saving: boolean = false; // NUEVO: Estado de guardado
  needsDataReload: boolean = false; // NUEVO: Control de recarga de datos
  private saveTimeout: any = null; // NUEVO: Timeout para debounce
  private pendingSave: boolean = false; // NUEVO: Indica si hay un guardado pendiente

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

  // Nueva propiedad: mantener ageGroups ordenados para UI
  orderedAgeGroups: IAgeGroupResponse[] = [];

  constructor(
    private departureService: DepartureService,
    private reservationService: ReservationService,
    private reservationTravelerService: ReservationTravelerService,
    private departurePriceSupplementService: DeparturePriceSupplementService,
    private ageGroupService: AgeGroupService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // Cargar todos los datos en paralelo si ya tenemos los IDs
    if (this.departureId && this.reservationId) {
      this.loadAllDataInParallel();
    } else if (this.departureId) {
      this.loadDepartureData();
      this.loadDeparturePriceSupplements();
    } else if (this.reservationId) {
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

  private loadAllDataInParallel(): void {
    this.loading = true;

    const requests = [
      this.departureService.getById(this.departureId!),
      this.reservationService.getById(this.reservationId!),
      this.reservationTravelerService.getByReservationOrdered(
        this.reservationId!
      ),
      this.departurePriceSupplementService.getByDeparture(this.departureId!),
    ];

    forkJoin(requests).subscribe({
      next: (results) => {
        const [departure, reservation, travelers, supplements] = results as [
          any,
          any,
          IReservationTravelerResponse[],
          IDeparturePriceSupplementResponse[]
        ];
        this.departureData = departure;
        this.reservationData = reservation;
        this.existingTravelers = travelers;
        this.totalExistingTravelers = travelers.length;
        this.departurePriceSupplements = supplements || [];

        // Cargar AgeGroups y procesar todo
        this.loadAgeGroupsFromSupplements();

        // OPTIMIZADO: Optimizar carga inicial de datos
        this.optimizeInitialDataLoad();

        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar los datos iniciales.';
        this.loading = false;
        console.error('Error loading initial data:', error);
      },
    });
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
        this.orderedAgeGroups = [...ageGroups].sort(
          (a, b) => a.displayOrder - b.displayOrder
        );
        // Inicializar mapas de conteo si están vacíos
        if (Object.keys(this.ageGroupCounts).length === 0) {
          this.orderedAgeGroups.forEach(
            (ag) => (this.ageGroupCounts[ag.id] = 0)
          );
          // Por defecto, forzar 1 en el primer grupo (generalmente adultos)
          if (this.orderedAgeGroups.length > 0) {
            this.ageGroupCounts[this.orderedAgeGroups[0].id] = 1;
          }
          this.originalAgeGroupCounts = { ...this.ageGroupCounts };
          this.actualAgeGroupCounts = { ...this.ageGroupCounts };
          this.ageGroupCountsChange.emit({ ...this.ageGroupCounts });
        }
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
        this.orderedAgeGroups = [];
        console.error('Error loading age groups:', error);
      },
    });
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

    // Solo actualizar conteos si no estamos en proceso de guardado
    if (this.saving) {
      return;
    }

    // Resetear contadores
    this.actualAgeGroupCounts = {};
    this.ageGroups.forEach((ag) => (this.actualAgeGroupCounts[ag.id] = 0));

    // Crear array de observables para cada grupo de edad
    const ageGroupRequests = this.ageGroups.map((ageGroup) =>
      this.reservationTravelerService
        .getAll({ reservationId: this.reservationId!, ageGroupId: ageGroup.id })
        .pipe(
          map((travelers) => ({
            ageGroupId: ageGroup.id,
            count: travelers.length,
          })),
          catchError(() => of({ ageGroupId: ageGroup.id, count: 0 }))
        )
    );

    // Ejecutar todas las consultas en paralelo
    forkJoin(ageGroupRequests).subscribe({
      next: (results) => {
        // Actualizar conteos con los resultados
        results.forEach((result) => {
          this.actualAgeGroupCounts[result.ageGroupId] = result.count;
        });

        // Solo actualizar si no estamos guardando
        if (!this.saving) {
          this.updateCountsFromActual();
        }
      },
      error: (error) => {
        console.error('Error counting travelers by age group:', error);
        // En caso de error, actualizar con valores por defecto
        if (!this.saving) {
          this.updateCountsFromActual();
        }
      },
    });
  }

  private updateCountsFromActual(): void {
    if (this.saving) {
      return;
    }
    // Copiar actual como valores actuales visibles
    this.ageGroupCounts = { ...this.actualAgeGroupCounts };

    // Si todos son 0, forzar 1 en el primer grupo disponible
    const total = Object.values(this.ageGroupCounts).reduce((a, b) => a + b, 0);
    if (total === 0 && this.orderedAgeGroups.length > 0) {
      this.ageGroupCounts[this.orderedAgeGroups[0].id] = 1;
    }

    // Sincronizar originales
    this.originalAgeGroupCounts = { ...this.ageGroupCounts };

    // Emitir cambios para notificar al componente padre
    this.ageGroupCountsChange.emit({ ...this.ageGroupCounts });

    console.log('🔄 Conteos actualizados desde BD:', this.ageGroupCounts);
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

  handlePassengersForAgeGroup(ageGroupId: number, value: number): void {
    // Validación inmediata básica
    if (value < 0) {
      value = 0;
    }

    // Validar límites dinámicos por grupo de edad
    if (!this.validateAgeGroupLimits(ageGroupId, value)) {
      // Si el valor está fuera de los límites, ajustarlo automáticamente
      const ageGroup = this.ageGroups.find((ag) => ag.id === ageGroupId);
      if (ageGroup) {
        const min = this.getMinForAgeGroup(ageGroupId);
        const max = this.getMaxForAgeGroup(ageGroupId);
        if (value < min) {
          value = min;
        } else if (value > max) {
          value = max;
        }
      }
    }

    // Validar que el primer grupo (generalmente adultos) tenga al menos 1 si hay otros pasajeros
    if (this.isFirstAgeGroup(ageGroupId) && value === 0) {
      const totalOthers = this.getTotalOtherAgeGroups();
      if (totalOthers === 0) {
        value = 1; // Forzar al menos 1 en el primer grupo si no hay otros pasajeros
      }
    }

    this.ageGroupCounts[ageGroupId] = value;

    // Usar validación robusta de adultos mínimos
    const isValid = this.validateAdultsMinimum();

    // Emitir cambios para el componente de habitaciones
    this.ageGroupCountsChange.emit({ ...this.ageGroupCounts });

    // Guardar con debounce para cambios rápidos
    if (this.reservationId && isValid) {
      this.scheduleSave();
    } else if (!isValid) {
      // Mostrar toast de validación si hay error
      this.showValidationToast();
    }
  }

  /**
   * Validar límites dinámicos por grupo de edad
   */
  private validateAgeGroupLimits(ageGroupId: number, value: number): boolean {
    const min = this.getMinForAgeGroup(ageGroupId);
    const max = this.getMaxForAgeGroup(ageGroupId);

    // Validar límites min/max
    if (value < min) {
      return false;
    }

    if (value > max) {
      return false;
    }

    // Validaciones específicas por tipo
    if (this.isFirstAgeGroup(ageGroupId)) {
      // El primer grupo debe ser al menos 1 si hay otros pasajeros
      const totalOthers = this.getTotalOtherAgeGroups();
      if (value === 0 && totalOthers > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Obtener el mínimo para un grupo de edad (público para template)
   */
  getMinForAgeGroup(ageGroupId: number): number {
    if (this.isFirstAgeGroup(ageGroupId)) {
      return 1; // Mínimo 1 adulto
    }
    return 0;
  }

  /**
   * Obtener el máximo para un grupo de edad (público para template)
   */
  getMaxForAgeGroup(ageGroupId: number): number {
    const ageGroup = this.ageGroups.find((ag) => ag.id === ageGroupId);
    if (!ageGroup) return 20;

    const name = ageGroup.name.toLowerCase();

    if (name.includes('adult') || name.includes('adulto')) {
      return 20; // Máximo razonable para adultos
    } else if (
      name.includes('child') ||
      name.includes('niño') ||
      name.includes('menor')
    ) {
      return 15; // Máximo razonable para niños
    } else if (
      name.includes('baby') ||
      name.includes('bebé') ||
      name.includes('infant')
    ) {
      return 10; // Máximo razonable para bebés
    }

    return 20; // Default
  }

  /**
   * Verificar si es el primer grupo de edad (generalmente adultos)
   */
  private isFirstAgeGroup(ageGroupId: number): boolean {
    if (this.orderedAgeGroups.length === 0) return false;
    return this.orderedAgeGroups[0].id === ageGroupId;
  }

  /**
   * Obtener el total de otros grupos de edad (excluyendo el primero)
   */
  private getTotalOtherAgeGroups(): number {
    let total = 0;
    this.orderedAgeGroups.slice(1).forEach((ag) => {
      total += this.ageGroupCounts[ag.id] || 0;
    });
    return total;
  }

  /**
   * Validar que los adultos mínimos estén presentes
   */
  private validateAdultsMinimum(): boolean {
    if (this.orderedAgeGroups.length === 0) return true;

    const firstGroupId = this.orderedAgeGroups[0].id;
    const firstGroupCount = this.ageGroupCounts[firstGroupId] || 0;
    const totalOthers = this.getTotalOtherAgeGroups();

    if (firstGroupCount === 0 && totalOthers > 0) {
      this.adultsErrorMsg =
        'Debe haber al menos 1 adulto para acompañar a los menores.';
      return false;
    }

    if (firstGroupCount < totalOthers) {
      this.adultsErrorMsg =
        'La cantidad de adultos debe ser mayor o igual a la de menores.';
      return false;
    }

    this.adultsErrorMsg = '';
    return true;
  }

  /**
   * MEJORADO: Programar guardado con debounce inteligente
   * Evita múltiples llamadas simultáneas al guardado y permite cambios rápidos
   */
  private scheduleSave(): void {
    // Cancelar timeout anterior si existe
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Marcar que hay un guardado pendiente
    this.pendingSave = true;

    // Programar guardado con debounce de 1 segundo
    // Esto permite que el usuario haga cambios rápidos sin guardar cada uno
    this.saveTimeout = setTimeout(() => {
      this.executePendingSave();
    }, 1000);
  }

  /**
   * NUEVO: Ejecutar guardado pendiente
   * Solo ejecuta si hay cambios pendientes y no hay otra operación en curso
   */
  private async executePendingSave(): Promise<void> {
    if (!this.pendingSave || this.saving) {
      return;
    }

    this.pendingSave = false;
    this.saveTimeout = null;

    await this.syncTravelersWithReservation();
  }

  /**
   * NUEVO: Forzar guardado inmediato
   * Útil para casos donde se necesita guardar inmediatamente sin debounce
   */
  public async forceSave(): Promise<void> {
    // Cancelar cualquier guardado pendiente
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    this.pendingSave = false;

    // Ejecutar guardado inmediatamente
    await this.syncTravelersWithReservation();
  }

  /**
   * MEJORADO: Validación robusta de adultos mínimos
   * Valida en tiempo real con feedback visual mejorado
   */
  // Eliminadas validaciones específicas por tipo para soportar dinámica por grupos de edad

  /**
   * OPTIMIZADO: Método principal para sincronizar travelers con la reservación
   * Construye todos los travelers antes de enviarlos al API para evitar problemas de concurrencia
   */
  private async syncTravelersWithReservation(): Promise<void> {
    if (!this.reservationId || this.saving) {
      return;
    }

    const newTotal = this.totalPassengers;
    const existingTotal = this.totalExistingTravelers;

    // Solo sincronizar si hay cambios reales
    if (newTotal === existingTotal && this.areValuesInSync()) {
      return;
    }

    // Capturar los valores actuales para evitar cambios durante el guardado
    const currentCounts = { ...this.ageGroupCounts };
    const currentTotal = this.totalPassengers;

    this.saving = true;
    this.saveStatusChange.emit({ saving: true });

    // Mostrar toast de proceso de guardado
    this.showSavingToast();

    try {
      // Lógica de sincronización optimizada usando valores capturados
      if (currentTotal > this.totalExistingTravelers) {
        const travelersToCreate = currentTotal - this.totalExistingTravelers;
        await this.createTravelersToMatchCounts(
          currentCounts,
          travelersToCreate
        );
        this.needsDataReload = true; // Marcar que necesitamos recargar
      } else if (currentTotal < this.totalExistingTravelers) {
        const travelersToRemove = this.totalExistingTravelers - currentTotal;
        await this.removeTravelersToMatchCounts(
          currentCounts,
          travelersToRemove
        );
        this.needsDataReload = true; // Marcar que necesitamos recargar
      }
      // Eliminado el caso else - no necesitamos rebalanceo complejo

      // Actualizar solo los datos necesarios
      await this.updateReservationTotalPassengers();

      // Recargar solo si es necesario
      if (this.needsDataReload) {
        await this.reloadTravelers();
        this.needsDataReload = false;
      }

      // Actualizar números originales después del guardado exitoso usando valores capturados
      this.originalAgeGroupCounts = { ...currentCounts };

      // Mostrar toast de éxito
      this.showSuccessToast();
      this.saveStatusChange.emit({ saving: false, success: true });

      // NUEVO: Emitir evento de guardado exitoso al componente padre
      this.saveCompleted.emit({
        component: 'selector-traveler',
        success: true,
        data: {
          ageGroupCounts: currentCounts,
          totalPassengers: currentTotal,
          existingTravelers: this.existingTravelers,
        },
      });
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      // Mostrar toast de error
      this.showErrorToast();
      this.saveStatusChange.emit({
        saving: false,
        success: false,
        error: 'Error al sincronizar travelers',
      });

      // NUEVO: Emitir evento de error al componente padre
      this.saveCompleted.emit({
        component: 'selector-traveler',
        success: false,
        error: (error as Error).message || 'Error al sincronizar travelers',
      });
    } finally {
      this.saving = false;
    }
  }

  /**
   * Crear travelers para igualar los conteos por grupo de edad requeridos
   */
  private async createTravelersToMatchCounts(
    targetCounts: { [ageGroupId: number]: number },
    count: number
  ): Promise<void> {
    if (!this.reservationId || count <= 0) return;

    // CORREGIDO: Calcular el siguiente número de viajero basado en los existentes
    const nextTravelerNumber = this.getNextAvailableTravelerNumberSafe();

    const travelersToCreate: ReservationTravelerCreate[] = [];
    let currentTravelerNumber = nextTravelerNumber;

    // Para cada age group, crear los faltantes
    this.ageGroups.forEach((ag) => {
      const existingCount = this.existingTravelers.filter(
        (t) => t.ageGroupId === ag.id
      ).length;
      const needed = (targetCounts[ag.id] || 0) - existingCount;
      for (let i = 0; i < needed && travelersToCreate.length < count; i++) {
        travelersToCreate.push({
          reservationId: this.reservationId!,
          travelerNumber: currentTravelerNumber,
          isLeadTraveler: false,
          tkId: '',
          ageGroupId: ag.id,
        });
        currentTravelerNumber++;
      }
    });

    // Si aún necesitamos más, usar primer grupo disponible
    while (travelersToCreate.length < count && this.ageGroups.length > 0) {
      const fallbackAgId = this.getDefaultAgeGroupId();
      travelersToCreate.push({
        reservationId: this.reservationId!,
        travelerNumber: currentTravelerNumber,
        isLeadTraveler: false,
        tkId: '',
        ageGroupId: fallbackAgId,
      });
      currentTravelerNumber++;
    }

    // Crear todos los travelers en paralelo con timeout optimizado
    const createPromises = travelersToCreate.map(
      (travelerData) =>
        new Promise<IReservationTravelerResponse>((resolve, reject) => {
          this.reservationTravelerService.create(travelerData).subscribe({
            next: (newTraveler) => resolve(newTraveler),
            error: (error) => {
              console.error('❌ Error creando traveler:', error);
              reject(error);
            },
          });
        })
    );

    try {
      const newTravelers = await Promise.all(createPromises);
      console.log(`✅ Creados ${newTravelers.length} travelers exitosamente`);

      // CORREGIDO: Actualizar lista local de travelers para evitar conflictos futuros
      this.existingTravelers.push(...newTravelers);
      this.totalExistingTravelers += newTravelers.length;

      console.log(
        `📊 Total travelers actualizado: ${this.totalExistingTravelers}`
      );
    } catch (error) {
      console.error('❌ Error creando múltiples travelers:', error);
      throw error;
    }
  }

  /**
   * CORREGIDO: Obtener el siguiente número de viajero disponible
   * Calcula basándose en los travelers existentes en memoria
   */
  private getNextAvailableTravelerNumber(): number {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      return 1; // Primer viajero
    }

    // Encontrar el número más alto de viajero existente
    const maxTravelerNumber = Math.max(
      ...this.existingTravelers.map((t) => t.travelerNumber)
    );

    return maxTravelerNumber + 1;
  }

  /**
   * NUEVO: Verificar si un número de viajero ya existe
   * Previene conflictos de números duplicados
   */
  private isTravelerNumberAvailable(travelerNumber: number): boolean {
    return !this.existingTravelers.some(
      (t) => t.travelerNumber === travelerNumber
    );
  }

  /**
   * NUEVO: Obtener el siguiente número de viajero disponible con verificación
   * Asegura que el número no esté en uso
   */
  private getNextAvailableTravelerNumberSafe(): number {
    let candidateNumber = this.getNextAvailableTravelerNumber();

    // Buscar el siguiente número disponible si el candidato ya existe
    while (!this.isTravelerNumberAvailable(candidateNumber)) {
      candidateNumber++;
    }

    return candidateNumber;
  }

  /**
   * RESPALDO: Obtener el siguiente número de viajero desde el API
   * Solo se usa si hay problemas con el cálculo local
   */
  private async getNextAvailableTravelerNumberFromAPI(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.reservationTravelerService
        .getByReservationOrdered(this.reservationId!)
        .subscribe({
          next: (travelers) => {
            if (travelers.length === 0) {
              resolve(1);
            } else {
              const maxTravelerNumber = Math.max(
                ...travelers.map((t) => t.travelerNumber)
              );
              resolve(maxTravelerNumber + 1);
            }
          },
          error: reject,
        });
    });
  }

  /**
   * NUEVO: Obtener el conteo de viajeros existentes por tipo
   */
  private getExistingCountForAgeGroup(ageGroupId: number): number {
    return this.existingTravelers.filter((t) => t.ageGroupId === ageGroupId)
      .length;
  }

  /**
   * MEJORADO: Eliminar travelers excedentes por grupo de edad
   * Elimina travelers del grupo de edad específico en lugar de los últimos
   */
  private async removeTravelersToMatchCounts(
    targetCounts: { [ageGroupId: number]: number },
    count: number
  ): Promise<void> {
    if (count <= 0) return;

    const travelersToRemove: IReservationTravelerResponse[] = [];
    let remainingToRemove = count;

    // Determinar exceso por grupo
    this.ageGroups
      .slice()
      .reverse()
      .forEach((ag) => {
        if (remainingToRemove <= 0) return;
        const existingCount = this.getExistingCountForAgeGroup(ag.id);
        const desired = targetCounts[ag.id] || 0;
        const excess = existingCount - desired;
        if (excess > 0) {
          const toRemoveFromThis = Math.min(excess, remainingToRemove);
          const removeCandidates = this.getTravelersToRemoveFromMemory(
            ag.id,
            toRemoveFromThis
          );
          travelersToRemove.push(...removeCandidates);
          remainingToRemove -= removeCandidates.length;
        }
      });

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
      console.log(
        `✅ Eliminados ${travelersToRemove.length} travelers exitosamente`
      );

      // CORREGIDO: Actualizar lista local de travelers para mantener consistencia
      const removedIds = travelersToRemove.map((t) => t.id);
      this.existingTravelers = this.existingTravelers.filter(
        (t) => !removedIds.includes(t.id)
      );
      this.totalExistingTravelers -= travelersToRemove.length;

      console.log(
        `📊 Total travelers actualizado: ${this.totalExistingTravelers}`
      );
    } catch (error) {
      console.error('❌ Error eliminando múltiples travelers:', error);
      throw error;
    }
  }

  /**
   * ULTRA-OPTIMIZADO: Obtener travelers para eliminar usando datos en memoria
   * Evita llamadas innecesarias al API
   */
  private getTravelersToRemoveFromMemory(
    ageGroupId: number,
    count: number
  ): IReservationTravelerResponse[] {
    // Usar travelers existentes en memoria
    const travelersOfThisType = this.existingTravelers
      .filter((t) => t.ageGroupId === ageGroupId && !t.isLeadTraveler)
      .sort((a, b) => a.travelerNumber - b.travelerNumber)
      .slice(0, count); // Tomar los primeros (más antiguos)

    return travelersOfThisType;
  }

  /**
   * NUEVO: Obtener travelers para eliminar por grupo de edad (método original como fallback)
   */
  private async getTravelersToRemoveByAgeGroup(
    ageGroupId: number,
    count: number
  ): Promise<IReservationTravelerResponse[]> {
    return new Promise((resolve, reject) => {
      this.reservationTravelerService
        .getAll({
          reservationId: this.reservationId!,
          ageGroupId: ageGroupId,
        })
        .subscribe({
          next: (travelers) => {
            // Filtrar para no eliminar el lead traveler y ordenar por travelerNumber
            const travelersToRemove = travelers
              .filter((t) => !t.isLeadTraveler)
              .sort((a, b) => a.travelerNumber - b.travelerNumber)
              .slice(0, count); // Tomar los primeros (más antiguos)

            resolve(travelersToRemove);
          },
          error: reject,
        });
    });
  }

  /**
   * NUEVO: Obtener ID de grupo de edad por defecto
   */
  private getDefaultAgeGroupId(): number {
    if (this.ageGroups.length === 0) {
      return 0;
    }
    // Usar el primero por displayOrder como grupo por defecto
    const ordered = [...this.ageGroups].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    return ordered[0].id;
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
   * ULTRA-OPTIMIZADO: Recargar travelers después de cambios
   * Solo recarga cuando es estrictamente necesario
   */
  private async reloadTravelers(): Promise<void> {
    // Solo recargar si es necesario
    if (!this.needsDataReload && this.areValuesInSync()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.reservationTravelerService
        .getByReservationOrdered(this.reservationId!)
        .subscribe({
          next: (travelers) => {
            this.existingTravelers = travelers;
            this.totalExistingTravelers = travelers.length;

            // Actualizar conteos reales sin afectar los valores del usuario
            this.countTravelersByAgeGroup();

            resolve();
          },
          error: reject,
        });
    });
  }

  // Getter para obtener el total de pasajeros
  get totalPassengers(): number {
    return Object.values(this.ageGroupCounts).reduce((a, b) => a + b, 0);
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
    this.ageGroupCounts = { ...this.originalAgeGroupCounts };
    this.ageGroupCountsChange.emit({ ...this.ageGroupCounts });
    this.adultsErrorMsg = '';
  }

  /**
   * NUEVO: Verificar si hay cambios pendientes
   */
  get hasUnsavedChanges(): boolean {
    return (
      JSON.stringify(this.ageGroupCounts) !==
      JSON.stringify(this.originalAgeGroupCounts)
    );
  }

  /**
   * NUEVO: Verificar si los valores actuales coinciden con los conteos reales
   */
  private areValuesInSync(): boolean {
    const keys = new Set<number>([
      ...Object.keys(this.ageGroupCounts).map((k) => +k),
      ...Object.keys(this.actualAgeGroupCounts).map((k) => +k),
    ]);
    for (const id of keys) {
      if (
        (this.ageGroupCounts[id] || 0) !== (this.actualAgeGroupCounts[id] || 0)
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * NUEVO: Optimizar carga inicial de datos
   * Evita recargas innecesarias durante la inicialización
   */
  private optimizeInitialDataLoad(): void {
    // Marcar que no necesitamos recargar datos inicialmente
    this.needsDataReload = false;

    // Sincronizar valores originales y actuales
    if (Object.keys(this.ageGroupCounts).length > 0) {
      this.originalAgeGroupCounts = { ...this.ageGroupCounts };
    }
    // Actualizar conteos reales
    this.countTravelersByAgeGroup();
  }

  // Getters para obtener el conteo real de cada tipo
  get currentCounts(): { [ageGroupId: number]: number } {
    return { ...this.actualAgeGroupCounts };
  }

  /**
   * TrackBy function para optimizar el ngFor
   */
  trackByAgeGroup(index: number, ageGroup: IAgeGroupResponse): number {
    return ageGroup.id;
  }

  /**
   * Mostrar toast de proceso de guardado
   */
  private showSavingToast(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Guardando...',
      detail: 'Actualizando información de viajeros',
      life: 2000,
    });
  }

  /**
   * Mostrar toast de éxito al guardar
   */
  private showSuccessToast(): void {
    this.messageService.add({
      severity: 'success',
      summary: '¡Guardado!',
      detail: 'Información de viajeros actualizada correctamente',
      life: 3000,
    });
  }

  /**
   * Mostrar toast de error al guardar
   */
  private showErrorToast(): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo guardar la información de viajeros',
      life: 4000,
    });
  }

  /**
   * Mostrar toast de validación cuando hay errores
   */
  private showValidationToast(): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Validación',
      detail: this.adultsErrorMsg,
      life: 3000,
    });
  }

  /**
   * Método intermedio para obtener el texto del rango de edad
   * Delega al servicio AgeGroupService
   */
  getAgeRangeText(ageGroup: IAgeGroupResponse): string {
    return this.ageGroupService.getAgeRangeText(ageGroup);
  }

  ngOnDestroy(): void {
    // Limpiar timeouts y subscripciones
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.pendingSave = false;
  }
}
