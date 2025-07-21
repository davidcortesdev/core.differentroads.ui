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
  @Input() reservationId: number | null = null; // NUEVO: Agregar reservationId

  // Output para notificar cambios de seguro al componente padre
  @Output() insuranceSelectionChange = new EventEmitter<{
    selectedInsurance: IActivityResponse | null;
    price: number;
  }>();

  insurances: IActivityResponse[] = [];
  insurancePrices: IActivityPriceResponse[] = [];
  insuranceGroups: IActivityCompetitionGroupResponse[] = [];
  selectedInsurance: IActivityResponse | null = null;
  basicInsuranceSelected: boolean = true;

  // NUEVO: Propiedades para gestionar travelers y asignaciones
  existingTravelers: IReservationTravelerResponse[] = [];
  currentInsuranceAssignments: IReservationTravelerActivityResponse[] = [];
  hasUnsavedChanges: boolean = false;
  isSaving: boolean = false;
  errorMsg: string | null = null;

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
                    this.insurances = activities;
                    this.loadPrices();
                  },
                  error: (error) => {
                    console.error('Error loading insurance activities:', error);
                  },
                });
            } else {
              this.insurances = [];
            }
          },
          error: (error) => {
            console.error('Error loading insurance groups:', error);
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
            // Cargar asignaciones existentes después de cargar precios
            this.loadExistingInsuranceAssignments();
          },
          error: (error) => {
            console.error('Error loading insurance prices:', error);
          },
        });
    }
  }

  // NUEVO: Cargar travelers existentes
  loadExistingTravelers(): void {
    if (!this.reservationId) return;

    this.reservationTravelerService
      .getByReservationOrdered(this.reservationId)
      .subscribe({
        next: (travelers) => {
          this.existingTravelers = travelers;
          this.loadExistingInsuranceAssignments();
        },
        error: (error) => {
          console.error('Error loading existing travelers:', error);
        },
      });
  }

  // NUEVO: Cargar asignaciones de seguro existentes
  loadExistingInsuranceAssignments(): void {
    if (!this.existingTravelers.length || !this.insurances.length) return;

    // Obtener todas las asignaciones de seguros para los travelers de esta reserva
    const travelerIds = this.existingTravelers.map((t) => t.id);
    const insuranceIds = this.insurances.map((i) => i.id);

    // Buscar asignaciones existentes
    const assignmentPromises = travelerIds.map((travelerId) =>
      this.reservationTravelerActivityService.getByReservationTraveler(
        travelerId
      )
    );

    forkJoin(assignmentPromises).subscribe({
      next: (allAssignments) => {
        // Filtrar solo las asignaciones que corresponden a seguros
        this.currentInsuranceAssignments = allAssignments
          .flat()
          .filter((assignment) => insuranceIds.includes(assignment.activityId));

        // Determinar el seguro seleccionado basado en las asignaciones existentes
        this.determineSelectedInsurance();
      },
      error: (error) => {
        console.error('Error loading existing insurance assignments:', error);
      },
    });
  }

  // NUEVO: Determinar el seguro seleccionado basado en asignaciones existentes
  determineSelectedInsurance(): void {
    if (this.currentInsuranceAssignments.length === 0) {
      // No hay asignaciones, mantener seguro básico
      this.selectedInsurance = null;
      this.basicInsuranceSelected = true;
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
      this.basicInsuranceSelected = false;
    } else {
      this.selectedInsurance = null;
      this.basicInsuranceSelected = true;
    }

    // Emitir el estado inicial
    this.emitInsuranceChange();
  }

  toggleInsurance(insurance: IActivityResponse | null): void {
    this.selectedInsurance = insurance;
    this.basicInsuranceSelected = !insurance;
    this.hasUnsavedChanges = true;
    this.errorMsg = null;

    // Emitir el cambio al componente padre
    this.emitInsuranceChange();
  }

  // NUEVO: Emitir cambio de seguro
  private emitInsuranceChange(): void {
    const price = this.selectedInsurance
      ? this.getPriceById(this.selectedInsurance.id)
      : 0;
    this.insuranceSelectionChange.emit({
      selectedInsurance: this.selectedInsurance,
      price: price,
    });
  }

  // NUEVO: Guardar asignaciones de seguro
  async saveInsuranceAssignments(): Promise<boolean> {
    if (!this.hasUnsavedChanges || !this.reservationId) {
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
        (assignment) =>
          this.reservationTravelerActivityService
            .delete(assignment.id)
            .toPromise()
      );

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }

      // Crear nuevas asignaciones si no es seguro básico
      if (this.selectedInsurance) {
        const createPromises = this.existingTravelers.map((traveler) =>
          this.reservationTravelerActivityService
            .create({
              id: 0,
              reservationTravelerId: traveler.id,
              activityId: this.selectedInsurance!.id,
            })
            .toPromise()
        );

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
      console.error('Error saving insurance assignments:', error);
      this.errorMsg =
        'Error al guardar las asignaciones de seguro. Por favor, inténtalo de nuevo.';
      this.isSaving = false;
      return false;
    }
  }

  getPriceById(activityId: number): number {
    // Buscar el precio para adultos (asumiendo ageGroupId = 1 para adultos)
    const price = this.insurancePrices.find(
      (p) => p.activityId === activityId && p.ageGroupId === 1
    );
    return price ? price.basePrice : 0;
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

  // NUEVO: Método para obtener resumen de asignaciones
  getAssignmentsSummary(): string {
    if (!this.selectedInsurance) {
      return 'Seguro básico incluido';
    }

    const travelersCount = this.existingTravelers.length;
    const price = this.getPriceById(this.selectedInsurance.id);
    const totalPrice = price * travelersCount;

    return `${this.selectedInsurance.name} - ${travelersCount} viajeros (${totalPrice}€)`;
  }

  // NUEVO: Getter para verificar si hay cambios pendientes
  get hasPendingChanges(): boolean {
    return this.hasUnsavedChanges;
  }
}
