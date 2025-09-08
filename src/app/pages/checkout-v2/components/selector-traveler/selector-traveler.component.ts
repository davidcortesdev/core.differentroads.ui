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
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-selector-traveler',
  standalone: false,
  templateUrl: './selector-traveler.component.html',
  styleUrl: './selector-traveler.component.scss',
})
export class SelectorTravelerComponent implements OnInit, OnChanges, OnDestroy {
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

  // NUEVO: Output para notificar guardado exitoso al componente padre
  @Output() saveCompleted = new EventEmitter<{
    component: 'selector-traveler';
    success: boolean;
    data?: any;
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

  // Nueva propiedad para manejar los tipos de viajeros dinámicamente
  travelerTypes: Array<{
    key: 'adults' | 'childs' | 'babies';
    label: string;
    ageGroup: IAgeGroupResponse;
    min: number;
    max: number;
  }> = [];

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

  private buildTravelerTypesFromAgeGroups(): void {
    if (!this.ageGroups || this.ageGroups.length === 0) {
      this.travelerTypes = [];
      return;
    }

    // Ordenar ageGroups por displayOrder antes de procesarlos
    const sortedAgeGroups = [...this.ageGroups].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );

    this.travelerTypes = sortedAgeGroups.map((ageGroup) => {
      const name = ageGroup.name.toLowerCase();

      // Determinar el tipo de viajero basado en el AgeGroup
      let key: 'adults' | 'childs' | 'babies';
      let label: string;
      let min: number;
      let max: number;

      if (
        name.includes('adult') ||
        name.includes('adulto') ||
        (ageGroup.lowerLimitAge && ageGroup.lowerLimitAge >= 12)
      ) {
        key = 'adults';
        label = 'Adultos';
        min = 1; // Mínimo 1 adulto
        max = 20; // Máximo razonable para adultos
      } else if (
        name.includes('child') ||
        name.includes('niño') ||
        name.includes('menor') ||
        (ageGroup.lowerLimitAge &&
          ageGroup.upperLimitAge &&
          ageGroup.lowerLimitAge >= 3 &&
          ageGroup.upperLimitAge <= 11)
      ) {
        key = 'childs';
        label = 'Niños';
        min = 0;
        max = 15; // Máximo razonable para niños
      } else if (
        name.includes('baby') ||
        name.includes('bebé') ||
        name.includes('infant') ||
        (ageGroup.upperLimitAge && ageGroup.upperLimitAge <= 2)
      ) {
        key = 'babies';
        label = 'Bebés';
        min = 0;
        max = 10; // Máximo razonable para bebés
      } else {
        // Fallback para grupos no reconocidos
        key = 'adults';
        label = ageGroup.name;
        min = 0;
        max = 20;
      }

      return {
        key,
        label,
        ageGroup,
        min,
        max,
      };
    });
  }

  private updateAvailableTravelersFromAgeGroups(): void {
    if (!this.ageGroups || this.ageGroups.length === 0) {
      this.dynamicAvailableTravelers = this.availableTravelers;
      return;
    }

    // Construir tipos de viajeros dinámicos
    this.buildTravelerTypesFromAgeGroups();

    // Extraer labels únicos para compatibilidad con código existente
    const travelers: string[] = [];
    this.travelerTypes.forEach((travelerType) => {
      if (!travelers.includes(travelerType.label)) {
        travelers.push(travelerType.label);
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

    // Solo actualizar conteos si no estamos en proceso de guardado
    if (this.saving) {
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
              (ageGroup.lowerLimitAge && ageGroup.lowerLimitAge >= 12)
            );
          case 'childs':
            return (
              name.includes('child') ||
              name.includes('niño') ||
              name.includes('menor') ||
              (ageGroup.lowerLimitAge &&
                ageGroup.upperLimitAge &&
                ageGroup.lowerLimitAge >= 3 &&
                ageGroup.upperLimitAge <= 11)
            );
          case 'babies':
            return (
              name.includes('baby') ||
              name.includes('bebé') ||
              name.includes('infant') ||
              (ageGroup.upperLimitAge && ageGroup.upperLimitAge <= 2)
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
              // Solo actualizar si no estamos guardando
              if (!this.saving) {
                this.updateTravelersNumbersFromActualCounts();
              }
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
              // Solo actualizar si no estamos guardando
              if (!this.saving) {
                this.updateTravelersNumbersFromActualCounts();
              }
            }
          },
        });
    });
  }

  private updateTravelersNumbersFromActualCounts(): void {
    // Solo actualizar si no estamos en proceso de guardado para evitar conflictos
    if (this.saving) {
      return;
    }

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
    // Validación inmediata básica
    if (value < 0) {
      value = 0;
    }

    // MEJORADO: Validar límites dinámicos por tipo
    if (!this.validateTravelerLimits(type, value)) {
      // Si el valor está fuera de los límites, ajustarlo automáticamente
      const travelerType = this.travelerTypes.find((t) => t.key === type);
      if (travelerType) {
        if (value < travelerType.min) {
          value = travelerType.min;
        } else if (value > travelerType.max) {
          value = travelerType.max;
        }
      }
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

    // MEJORADO: Usar validación robusta de adultos mínimos
    const isValid = this.validateAdultsMinimum();

    // Emitir cambios para el componente de habitaciones
    this.travelersNumbersChange.emit(this.travelersNumbers);

    // OPTIMIZADO: Guardar con debounce para cambios rápidos
    if (this.reservationId && isValid) {
      this.scheduleSave();
    } else if (!isValid) {
      // Mostrar toast de validación si hay error
      this.showValidationToast();
    }
  }

  /**
   * NUEVO: Programar guardado con debounce para cambios rápidos
   * Evita múltiples llamadas simultáneas al guardado
   */
  private scheduleSave(): void {
    // Cancelar timeout anterior si existe
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Marcar que hay un guardado pendiente
    this.pendingSave = true;

    // Programar guardado con debounce de 300ms
    this.saveTimeout = setTimeout(() => {
      this.executePendingSave();
    }, 300);
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
  private validateAdultsMinimum(): boolean {
    const totalMinors =
      this.travelersNumbers.childs + this.travelersNumbers.babies;
    const adults = this.travelersNumbers.adults;

    if (adults === 0 && totalMinors > 0) {
      this.adultsErrorMsg =
        'Debe haber al menos 1 adulto para acompañar a los menores.';
      return false;
    }

    if (adults < totalMinors) {
      this.adultsErrorMsg =
        'La cantidad de adultos debe ser mayor o igual a la de menores.';
      return false;
    }

    this.adultsErrorMsg = '';
    return true;
  }

  /**
   * NUEVO: Validar límites dinámicos por tipo de viajero
   * Aplica validaciones específicas según el tipo y configuración
   */
  private validateTravelerLimits(
    type: 'adults' | 'childs' | 'babies',
    value: number
  ): boolean {
    const travelerType = this.travelerTypes.find((t) => t.key === type);
    if (!travelerType) return true;

    // Validar límites min/max
    if (value < travelerType.min) {
      return false;
    }

    if (value > travelerType.max) {
      return false;
    }

    // Validaciones específicas por tipo
    if (type === 'adults') {
      // Los adultos deben ser al menos 1 si hay otros pasajeros
      const totalOthers =
        this.travelersNumbers.childs + this.travelersNumbers.babies;
      if (value === 0 && totalOthers > 0) {
        return false;
      }
    }

    return true;
  }

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
    const currentTravelersNumbers = { ...this.travelersNumbers };
    const currentTotal = this.totalPassengers;

    this.saving = true;
    this.saveStatusChange.emit({ saving: true });

    // Mostrar toast de proceso de guardado
    this.showSavingToast();

    try {
      // Lógica de sincronización optimizada usando valores capturados
      if (currentTotal > this.totalExistingTravelers) {
        const travelersToCreate = currentTotal - this.totalExistingTravelers;
        await this.createAdditionalTravelersOptimized(travelersToCreate);
        this.needsDataReload = true; // Marcar que necesitamos recargar
      } else if (currentTotal < this.totalExistingTravelers) {
        const travelersToRemove = this.totalExistingTravelers - currentTotal;
        await this.removeExcessTravelers(travelersToRemove);
        this.needsDataReload = true; // Marcar que necesitamos recargar
      }

      // Actualizar solo los datos necesarios
      await this.updateReservationTotalPassengers();

      // Recargar solo si es necesario
      if (this.needsDataReload) {
        await this.reloadTravelers();
        this.needsDataReload = false;
      }

      // Actualizar números originales después del guardado exitoso usando valores capturados
      this.originalTravelersNumbers = { ...currentTravelersNumbers };

      // Mostrar toast de éxito
      this.showSuccessToast();
      this.saveStatusChange.emit({ saving: false, success: true });

      // NUEVO: Emitir evento de guardado exitoso al componente padre
      this.saveCompleted.emit({
        component: 'selector-traveler',
        success: true,
        data: {
          travelersNumbers: currentTravelersNumbers,
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
   * ULTRA-OPTIMIZADO: Crear travelers adicionales con máxima eficiencia
   * Usa operaciones en lote y evita llamadas innecesarias
   */
  private async createAdditionalTravelersOptimized(
    count: number
  ): Promise<void> {
    if (!this.reservationId || count <= 0) return;

    // CORREGIDO: Calcular el siguiente número de viajero basado en los existentes
    const nextTravelerNumber = this.getNextAvailableTravelerNumberSafe();

    // CORREGIDO: Crear travelers con números secuenciales únicos
    const travelersToCreate: ReservationTravelerCreate[] = [];
    let currentTravelerNumber = nextTravelerNumber;

    // Procesar cada tipo de viajero en orden
    for (const travelerType of this.travelerTypes) {
      const currentCount = this.travelersNumbers[travelerType.key];
      const existingCount = this.getExistingTravelerCountByType(
        travelerType.key
      );
      const neededCount = currentCount - existingCount;

      if (neededCount > 0) {
        for (
          let i = 0;
          i < neededCount && travelersToCreate.length < count;
          i++
        ) {
          travelersToCreate.push({
            reservationId: this.reservationId!,
            travelerNumber: currentTravelerNumber,
            isLeadTraveler: false,
            tkId: '',
            ageGroupId: travelerType.ageGroup.id,
          });
          currentTravelerNumber++; // Incrementar para el siguiente
        }
      }
    }

    // Si aún necesitamos más travelers, usar el grupo por defecto
    while (travelersToCreate.length < count) {
      travelersToCreate.push({
        reservationId: this.reservationId!,
        travelerNumber: currentTravelerNumber,
        isLeadTraveler: false,
        tkId: '',
        ageGroupId: this.getDefaultAgeGroupId(),
      });
      currentTravelerNumber++; // Incrementar para el siguiente
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
  private getExistingTravelerCountByType(
    type: 'adults' | 'childs' | 'babies'
  ): number {
    if (!this.travelerTypes.length || !this.existingTravelers.length) {
      return 0;
    }

    // Encontrar el travelerType correspondiente
    const travelerType = this.travelerTypes.find((tt) => tt.key === type);
    if (!travelerType) {
      return 0;
    }

    // Contar travelers existentes con este ageGroupId
    return this.existingTravelers.filter(
      (traveler) => traveler.ageGroupId === travelerType.ageGroup.id
    ).length;
  }

  /**
   * MEJORADO: Eliminar travelers excedentes por grupo de edad
   * Elimina travelers del grupo de edad específico en lugar de los últimos
   */
  private async removeExcessTravelers(count: number): Promise<void> {
    if (count <= 0) return;

    // Calcular cuántos travelers de cada tipo necesitamos eliminar
    const travelersToRemove: IReservationTravelerResponse[] = [];
    let remainingToRemove = count;

    // Procesar cada tipo de viajero en orden inverso (bebés, niños, adultos)
    for (
      let i = this.travelerTypes.length - 1;
      i >= 0 && remainingToRemove > 0;
      i--
    ) {
      const travelerType = this.travelerTypes[i];
      const currentCount = this.travelersNumbers[travelerType.key];
      const existingCount = this.getExistingTravelerCountByType(
        travelerType.key
      );
      const excessCount = existingCount - currentCount;

      if (excessCount > 0) {
        const toRemoveFromThisType = Math.min(excessCount, remainingToRemove);

        // Usar travelers existentes en memoria para mayor eficiencia
        const travelersOfThisType = this.getTravelersToRemoveFromMemory(
          travelerType.ageGroup.id,
          toRemoveFromThisType
        );

        travelersToRemove.push(...travelersOfThisType);
        remainingToRemove -= travelersOfThisType.length;
      }
    }

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

    // Buscar grupo de adultos por defecto
    const adultGroup = this.ageGroups.find((group) => {
      const name = group.name.toLowerCase();
      return (
        name.includes('adult') ||
        name.includes('adulto') ||
        (group.lowerLimitAge && group.lowerLimitAge >= 12)
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

  /**
   * NUEVO: Verificar si los valores actuales coinciden con los conteos reales
   */
  private areValuesInSync(): boolean {
    return (
      this.travelersNumbers.adults === this.actualTravelerCounts.adults &&
      this.travelersNumbers.childs === this.actualTravelerCounts.childs &&
      this.travelersNumbers.babies === this.actualTravelerCounts.babies
    );
  }

  /**
   * NUEVO: Optimizar carga inicial de datos
   * Evita recargas innecesarias durante la inicialización
   */
  private optimizeInitialDataLoad(): void {
    // Marcar que no necesitamos recargar datos inicialmente
    this.needsDataReload = false;

    // Sincronizar valores originales
    this.originalTravelersNumbers = { ...this.travelersNumbers };

    // Actualizar conteos reales
    this.countTravelersByAgeGroup();
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
   * TrackBy function para optimizar el ngFor
   */
  trackByTravelerType(index: number, travelerType: any): string {
    return travelerType.key;
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
