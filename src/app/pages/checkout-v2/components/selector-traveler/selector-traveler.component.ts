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

  // ULTRA SIMPLIFICADO: Una sola lista que se muestra
  travelers: IReservationTravelerResponse[] = [];

  adultsErrorMsg = '';
  loading: boolean = false;
  error: string | null = null;

  // Datos del departure y travelers
  departureData: any = null;
  reservationData: any = null;

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

  /**
   * SIMPLIFICADO: Obtener el conteo actual para un grupo de edad
   * Cuenta directamente desde la lista de travelers
   */
  getCountForAgeGroup(ageGroupId: number): number {
    const count = this.travelers.filter(t => t.ageGroupId === ageGroupId).length;
    return count;
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
        
        // SIMPLIFICADO: Guardar la lista que se muestra
        this.travelers = [...travelers];
        
        this.departurePriceSupplements = supplements || [];

        // Cargar AgeGroups
        this.loadAgeGroupsFromSupplements();

        this.loading = false;
        
        // Emitir conteos iniciales
        this.emitCurrentCounts();
      },
      error: (error) => {
        this.error = 'Error al cargar los datos iniciales.';
        this.loading = false;
        console.error('Error loading initial data:', error);
      },
    });
  }

  /**
   * Emitir conteos actuales al componente padre
   */
  private emitCurrentCounts(): void {
    const counts: { [ageGroupId: number]: number } = {};
    this.ageGroups.forEach(ag => {
      counts[ag.id] = this.getCountForAgeGroup(ag.id);
    });
    this.ageGroupCountsChange.emit(counts);
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
        this.loadingAgeGroups = false;
        
        // Emitir conteos actuales
        this.emitCurrentCounts();
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
          // SIMPLIFICADO: Guardar la lista que se muestra
          this.travelers = [...travelers];
          this.loading = false;
          
          // Emitir conteos actuales
          this.emitCurrentCounts();
        },
        error: (error) => {
          this.error =
            'Error al cargar la información de viajeros. Usando valores por defecto.';
          this.loading = false;
          console.error('Error loading existing travelers:', error);
        },
      });
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

  /**
   * ULTRA SIMPLIFICADO: Manejar cambios en el número de pasajeros
   * Hace la petición y si es exitosa actualiza la lista
   */
  async handlePassengersForAgeGroup(ageGroupId: number, newValue: number): Promise<void> {
    const currentValue = this.getCountForAgeGroup(ageGroupId);
    
    // Validación básica
    if (newValue < 0) return;

    // Validar mínimos para el primer grupo (adultos)
    if (this.isFirstAgeGroup(ageGroupId) && newValue === 0) {
      const totalOthers = this.getTotalOtherAgeGroups();
      if (totalOthers > 0) {
        this.adultsErrorMsg = 'Debe haber al menos 1 adulto para acompañar a los menores.';
        this.showValidationToast();
        return;
      }
    }

    // Determinar acción
    if (newValue > currentValue) {
      // AÑADIR: Hacer petición → si OK → añadir a lista
      const toCreate = newValue - currentValue;
      await this.addTraveler(ageGroupId, toCreate);
    } else if (newValue < currentValue) {
      // ELIMINAR: Hacer petición → si OK → quitar de lista
      const toRemove = currentValue - newValue;
      await this.deleteTraveler(ageGroupId, toRemove);
    }

    // Validar adultos y emitir cambios
    this.validateAdultsMinimum();
    this.emitCurrentCounts();
  }

  /**
   * SIMPLIFICADO: Añadir traveler
   * 1. Hacer petición al backend
   * 2. Si devuelve true → añadir a la lista
   */
  private async addTraveler(ageGroupId: number, count: number): Promise<void> {
    if (!this.reservationId || count <= 0) return;

    this.loading = true;

    try {
      for (let i = 0; i < count; i++) {
        const travelerNumber = this.getNextTravelerNumber();
        const isFirst = this.travelers.length === 0;
        
        const travelerData: ReservationTravelerCreate = {
          reservationId: this.reservationId,
          travelerNumber: travelerNumber,
          isLeadTraveler: isFirst,
          tkId: '',
          ageGroupId: ageGroupId,
        };

        // Hacer petición
        const newTraveler = await new Promise<IReservationTravelerResponse>((resolve, reject) => {
          this.reservationTravelerService.create(travelerData).subscribe({
            next: resolve,
            error: reject
          });
        });

        // Si la petición devuelve true (el traveler creado), añadir a la lista
        if (newTraveler) {
          this.travelers = [...this.travelers, newTraveler];
        }
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Viajero agregado',
        detail: `Se ${count === 1 ? 'agregó 1 viajero' : `agregaron ${count} viajeros`} correctamente`,
        life: 2000,
      });
    } catch (error) {
      console.error('❌ Error añadiendo traveler:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo agregar el viajero',
        life: 3000,
      });
    } finally {
      this.loading = false;
    }
  }

  /**
   * SIMPLIFICADO: Eliminar traveler
   * 1. Hacer petición al backend
   * 2. Si devuelve true → quitar de la lista
   */
  private async deleteTraveler(ageGroupId: number, count: number): Promise<void> {
    if (count <= 0) return;

    this.loading = true;

    try {
      // Obtener travelers a eliminar (no eliminar el líder)
      const travelersToDelete = this.travelers
        .filter(t => t.ageGroupId === ageGroupId && !t.isLeadTraveler)
        .sort((a, b) => b.travelerNumber - a.travelerNumber) // Últimos primero
        .slice(0, count);

      if (travelersToDelete.length === 0) {
        console.warn('⚠️ No hay travelers para eliminar');
        return;
      }

      for (const traveler of travelersToDelete) {
        // Hacer petición
        try {
          await new Promise<void>((resolve, reject) => {
            this.reservationTravelerService.delete(traveler.id).subscribe({
              next: () => resolve(),  // Si llega aquí, fue exitoso (sin error)
              error: reject
            });
          });

          // Si la petición no lanza error, quitar de la lista
          this.travelers = this.travelers.filter(t => t.id !== traveler.id);
        } catch (error) {
          console.error(`Error eliminando traveler ${traveler.id}:`, error);
          throw error;  // Re-lanzar para que se maneje en el catch principal
        }
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Viajero eliminado',
        detail: `Se ${count === 1 ? 'eliminó 1 viajero' : `eliminaron ${count} viajeros`} correctamente`,
        life: 2000,
      });
    } catch (error) {
      console.error('❌ Error eliminando traveler:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo eliminar el viajero',
        life: 3000,
      });
    } finally {
      this.loading = false;
    }
  }

  /**
   * Obtener el siguiente número de traveler disponible
   */
  private getNextTravelerNumber(): number {
    if (this.travelers.length === 0) {
      return 1;
    }
    const maxNumber = Math.max(...this.travelers.map(t => t.travelerNumber));
    return maxNumber + 1;
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
      total += this.getCountForAgeGroup(ag.id);
    });
    return total;
  }

  /**
   * Validar que los adultos mínimos estén presentes
   */
  private validateAdultsMinimum(): boolean {
    if (this.orderedAgeGroups.length === 0) return true;

    const firstGroupId = this.orderedAgeGroups[0].id;
    const firstGroupCount = this.getCountForAgeGroup(firstGroupId);
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
   * TrackBy function para optimizar el ngFor
   */
  trackByAgeGroup(index: number, ageGroup: IAgeGroupResponse): number {
    return ageGroup.id;
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
    // Limpiar recursos si es necesario
  }
}
