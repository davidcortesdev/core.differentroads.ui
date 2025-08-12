import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import {
  ActivityService,
  IActivityResponse,
} from '../../../../core/services/activity/activity.service';
import {
  ActivityPriceService,
  IActivityPriceResponse,
} from '../../../../core/services/activity/activity-price.service';
import {
  ActivityCompetitionGroupService,
  IActivityCompetitionGroupResponse,
} from '../../../../core/services/activity/activity-competition-group.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerActivityService,
  IReservationTravelerActivityResponse,
} from '../../../../core/services/reservation/reservation-traveler-activity.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-insurance',
  standalone: false,
  templateUrl: './insurance.component.html',
  styleUrl: './insurance.component.scss',
})
export class InsuranceComponent implements OnInit, OnChanges {
  @Input() tourId: number | null = null;
  @Input() departureId: number | null = null;
  @Input() itineraryId: number | null = null;
  @Input() reservationId: number | null = null;

  // Output para notificar cambios de seguro al componente padre
  @Output() insuranceSelectionChange = new EventEmitter<{
    selectedInsurance: IActivityResponse | null;
    price: number;
  }>();

  insurances: IActivityResponse[] = [];
  insurancePrices: IActivityPriceResponse[] = [];
  insuranceGroups: IActivityCompetitionGroupResponse[] = [];
  private _selectedInsurance: IActivityResponse | null = null;

  // Getter y setter para rastrear cambios en selectedInsurance
  get selectedInsurance(): IActivityResponse | null {
    return this._selectedInsurance;
  }

  set selectedInsurance(value: IActivityResponse | null) {
    this._selectedInsurance = value;
  }

  // Propiedades para gestionar travelers y asignaciones
  existingTravelers: IReservationTravelerResponse[] = [];
  currentInsuranceAssignments: IReservationTravelerActivityResponse[] = [];
  hasUnsavedChanges: boolean = false;
  isSaving: boolean = false;
  errorMsg: string | null = null;
  userHasMadeSelection: boolean = false;

  constructor(
    private activityService: ActivityService,
    private activityPriceService: ActivityPriceService,
    private activityCompetitionGroupService: ActivityCompetitionGroupService,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadInsurances();
    this.loadExistingTravelers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['itineraryId'] || changes['departureId']) {
      this.loadInsurances();
    }
    if (changes['reservationId'] && this.reservationId) {
      this.loadExistingTravelers();
    }
  }

  loadInsurances(): void {
    if (this.itineraryId) {
      // Cargar los grupos de competición del itinerario
      this.activityCompetitionGroupService
        .getByItineraryId(this.itineraryId)
        .subscribe({
          next: (groups) => {
            // Filtrar solo los grupos que contengan "seguros" en el nombre
            this.insuranceGroups = groups.filter(
              (group) =>
                group.name && group.name.toLowerCase().includes('seguros')
            );

            if (this.insuranceGroups.length > 0) {
              // Cargar actividades filtrando por los grupos de seguros
              this.activityService
                .getAll({
                  itineraryId: this.itineraryId!,
                  activityCompetitionGroupId: this.insuranceGroups[0].id,
                  isVisibleOnWeb: true,
                })
                .subscribe({
                  next: (activities) => {
                    // Guardar las actividades sin ordenar por ahora
                    this.insurances = activities;
                    this.loadPrices();
                  },
                  error: (error) => {
                    console.error(
                      '🛡️ [INSURANCE] ❌ Error loading insurance activities:',
                      error
                    );
                  },
                });
            } else {
              this.insurances = [];
            }
          },
          error: (error) => {
            console.error(
              '🛡️ [INSURANCE] ❌ Error loading insurance groups:',
              error
            );
          },
        });
    }
  }

  loadPrices(): void {
    if (this.departureId && this.insurances.length > 0) {
      const activityIds = this.insurances.map((insurance) => insurance.id);

      this.activityPriceService
        .getAll({
          ActivityId: activityIds,
          DepartureId: this.departureId,
        })
        .subscribe({
          next: (prices) => {
            this.insurancePrices = prices;

            // Reordenar los seguros ahora que tenemos los precios
            this.insurances = this.sortInsurancesByPrice(this.insurances);

            // Identificar y seleccionar seguro básico por defecto
            this.selectDefaultInsurance();

            // Cargar asignaciones existentes después de cargar precios
            this.loadExistingInsuranceAssignments();
          },
          error: (error) => {
            console.error(
              '🛡️ [INSURANCE] ❌ Error loading insurance prices:',
              error
            );
            // Si no hay precios, seleccionar el primer seguro
            this.selectDefaultInsurance();
            this.loadExistingInsuranceAssignments();
          },
        });
    }
  }

  // Seleccionar seguro por defecto
  private selectDefaultInsurance(): void {
    if (this.insurances.length === 0) {
      this.selectedInsurance = null;
      this.emitInsuranceChange();
      return;
    }

    // Buscar el seguro básico (precio 0)
    const basicInsurance = this.insurances.find((insurance) => {
      const price = this.getPriceById(insurance.id);
      return price === 0;
    });

    if (basicInsurance) {
      this.selectedInsurance = basicInsurance;
    } else {
      this.selectedInsurance = null;
    }

    // Emitir el estado inicial
    this.emitInsuranceChange();
  }

  // Cargar travelers existentes
  loadExistingTravelers(): void {
    if (!this.reservationId) {
      return;
    }

    this.reservationTravelerService
      .getByReservationOrdered(this.reservationId)
      .subscribe({
        next: (travelers) => {
          this.existingTravelers = travelers;
          this.loadExistingInsuranceAssignments();
        },
        error: (error) => {
          console.error(
            '🛡️ [INSURANCE] ❌ Error loading existing travelers:',
            error
          );
        },
      });
  }

  // Cargar asignaciones de seguro existentes
  loadExistingInsuranceAssignments(): void {
    if (!this.existingTravelers.length || !this.insurances.length) {
      return;
    }

    // Obtener todas las asignaciones de seguros para los travelers de esta reserva
    const travelerIds = this.existingTravelers.map((t) => t.id);
    const insuranceIds = this.insurances.map((i) => i.id);

    // Buscar asignaciones existentes
    const assignmentPromises = travelerIds.map((travelerId) => {
      return this.reservationTravelerActivityService.getByReservationTraveler(
        travelerId
      );
    });

    forkJoin(assignmentPromises).subscribe({
      next: (allAssignments) => {
        // Filtrar solo las asignaciones que corresponden a seguros
        const allAssignmentsFlat = allAssignments.flat();
        this.currentInsuranceAssignments = allAssignmentsFlat.filter(
          (assignment) => insuranceIds.includes(assignment.activityId)
        );

        // Determinar el seguro seleccionado basado en las asignaciones existentes
        this.determineSelectedInsurance();
      },
      error: (error) => {
        console.error(
          '🛡️ [INSURANCE] ❌ Error loading existing insurance assignments:',
          error
        );
      },
    });
  }

  // Determinar el seguro seleccionado basado en asignaciones existentes
  determineSelectedInsurance(): void {
    // Solo determinar si no hay una selección previa del usuario
    if (this.userHasMadeSelection) {
      return;
    }

    if (this.currentInsuranceAssignments.length === 0) {
      this.emitInsuranceChange();
      return;
    }

    // Encontrar el seguro más común entre las asignaciones
    const insuranceCount: { [activityId: number]: number } = {};
    this.currentInsuranceAssignments.forEach((assignment) => {
      insuranceCount[assignment.activityId] =
        (insuranceCount[assignment.activityId] || 0) + 1;
    });

    const mostCommonInsuranceId = Object.keys(insuranceCount).reduce((a, b) =>
      insuranceCount[parseInt(a)] > insuranceCount[parseInt(b)] ? a : b
    );

    // Buscar el seguro correspondiente
    const selectedInsurance = this.insurances.find(
      (insurance) => insurance.id === parseInt(mostCommonInsuranceId)
    );

    if (selectedInsurance) {
      this.selectedInsurance = selectedInsurance;
    }

    // Emitir el estado inicial
    this.emitInsuranceChange();
  }

  toggleInsurance(insurance: IActivityResponse | null): void {
    this.selectedInsurance = insurance;

    // Marcar como cambios pendientes
    this.hasUnsavedChanges = true;
    this.errorMsg = null;
    this.userHasMadeSelection = true;

    // Emitir el cambio al componente padre
    this.emitInsuranceChange();
  }

  // Emitir cambio de seguro
  private emitInsuranceChange(): void {
    const price = this.selectedInsurance
      ? this.getPriceById(this.selectedInsurance.id)
      : 0;

    this.insuranceSelectionChange.emit({
      selectedInsurance: this.selectedInsurance,
      price: price,
    });
  }

  // Guardar asignaciones de seguro
  async saveInsuranceAssignments(): Promise<boolean> {
    if (!this.reservationId) {
      return false;
    }

    // Guardar si hay cambios pendientes o hay un seguro seleccionado
    const shouldSave =
      this.hasUnsavedChanges || this.selectedInsurance !== null;

    if (!shouldSave) {
      return true;
    }

    this.isSaving = true;
    this.errorMsg = null;

    try {
      // Asegurar que tenemos travelers cargados
      if (!this.existingTravelers.length) {
        this.existingTravelers =
          (await this.reservationTravelerService
            .getByReservationOrdered(this.reservationId)
            .toPromise()) || [];
      }

      if (!this.existingTravelers.length) {
        this.errorMsg = 'No se encontraron viajeros para asignar el seguro.';
        return false;
      }

      // Eliminar asignaciones existentes de seguros
      const deletePromises = this.currentInsuranceAssignments.map(
        (assignment) => {
          return this.reservationTravelerActivityService
            .delete(assignment.id)
            .toPromise();
        }
      );

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }

      // Crear nuevas asignaciones si hay seguro seleccionado
      if (this.selectedInsurance) {
        const createPromises = this.existingTravelers.map((traveler) => {
          const newAssignment = {
            id: 0,
            reservationTravelerId: traveler.id,
            activityId: this.selectedInsurance!.id,
          };
          return this.reservationTravelerActivityService
            .create(newAssignment)
            .toPromise();
        });

        const results = await Promise.all(createPromises);
        this.currentInsuranceAssignments = results.filter(
          (r) => r !== null
        ) as IReservationTravelerActivityResponse[];
      } else {
        this.currentInsuranceAssignments = [];
      }

      this.hasUnsavedChanges = false;
      this.isSaving = false;
      return true;
    } catch (error) {
      console.error(
        '🛡️ [INSURANCE] ❌ ERROR saving insurance assignments:',
        error
      );
      this.errorMsg =
        'Error al guardar las asignaciones de seguro. Por favor, inténtalo de nuevo.';
      this.isSaving = false;
      return false;
    }
  }

  // Método para ordenar seguros por precio (básico primero)
  private sortInsurancesByPrice(
    insurances: IActivityResponse[]
  ): IActivityResponse[] {
    // Si no hay precios cargados aún, retornar la lista original
    if (this.insurancePrices.length === 0) {
      return insurances;
    }

    return insurances.sort((a, b) => {
      const priceA = this.getPriceById(a.id);
      const priceB = this.getPriceById(b.id);

      // El seguro básico (precio 0) va primero
      if (priceA === 0 && priceB !== 0) return -1;
      if (priceA !== 0 && priceB === 0) return 1;

      // Si ambos son básicos o ambos son pagos, mantener el orden original
      return 0;
    });
  }

  getPriceById(activityId: number): number {
    // Buscar el precio para adultos (asumiendo ageGroupId = 1 para adultos)
    const price = this.insurancePrices.find(
      (p) => p.activityId === activityId && p.ageGroupId === 1
    );
    const finalPrice = price ? price.basePrice : 0;

    return finalPrice;
  }

  getSanitizedDescription(description: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(description);
  }

  isInsuranceSelected(insurance: IActivityResponse): boolean {
    return this.selectedInsurance === insurance;
  }

  // Método para obtener el seguro seleccionado y su precio
  getSelectedInsuranceData(): {
    selectedInsurance: IActivityResponse | null;
    price: number;
  } {
    const price = this.selectedInsurance
      ? this.getPriceById(this.selectedInsurance.id)
      : 0;
    return {
      selectedInsurance: this.selectedInsurance,
      price: price,
    };
  }

  // Método para obtener resumen de asignaciones
  getAssignmentsSummary(): string {
    if (!this.selectedInsurance) {
      return 'Sin seguro seleccionado';
    }

    const travelersCount = this.existingTravelers.length;
    const price = this.getPriceById(this.selectedInsurance.id);

    if (price === 0) {
      return `${this.selectedInsurance.name} - ${travelersCount} viajeros (incluido)`;
    } else {
      const totalPrice = price * travelersCount;
      return `${this.selectedInsurance.name} - ${travelersCount} viajeros (${totalPrice}€)`;
    }
  }

  // Getter para verificar si hay cambios pendientes
  get hasPendingChanges(): boolean {
    return this.hasUnsavedChanges;
  }

  // Método para verificar que las asignaciones se guardaron correctamente
  async verifyInsuranceAssignments(): Promise<boolean> {
    if (!this.reservationId || !this.existingTravelers.length) {
      return false;
    }

    try {
      // Obtener todas las asignaciones actuales de seguros
      const verificationPromises = this.existingTravelers.map((traveler) =>
        this.reservationTravelerActivityService
          .getByReservationTraveler(traveler.id)
          .toPromise()
      );

      const allAssignments = await Promise.all(verificationPromises);
      const flatAssignments = allAssignments
        .flat()
        .filter(
          (assignment) => assignment !== null && assignment !== undefined
        );

      // Filtrar solo asignaciones de seguros
      const insuranceIds = this.insurances.map((i) => i.id);
      const currentInsuranceAssignments = flatAssignments.filter(
        (assignment) =>
          assignment && insuranceIds.includes(assignment.activityId)
      );

      if (this.selectedInsurance) {
        // Verificar que todos los viajeros tengan el seguro seleccionado
        const expectedAssignments = this.existingTravelers.length;
        const actualAssignments = currentInsuranceAssignments.filter(
          (assignment) =>
            assignment && assignment.activityId === this.selectedInsurance!.id
        ).length;

        const isCorrect = actualAssignments === expectedAssignments;

        return isCorrect;
      } else {
        // Si no hay seguro seleccionado, no debería haber asignaciones
        const hasAssignments = currentInsuranceAssignments.length > 0;

        return !hasAssignments;
      }
    } catch (error) {
      console.error('🛡️ [INSURANCE] ❌ Error verificando asignaciones:', error);
      return false;
    }
  }
}
