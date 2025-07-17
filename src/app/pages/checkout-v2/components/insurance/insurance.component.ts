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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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

  // NUEVO: Output para notificar cambios de seguro al componente padre
  @Output() insuranceSelectionChange = new EventEmitter<{
    selectedInsurance: IActivityResponse | null;
    price: number;
  }>();

  insurances: IActivityResponse[] = [];
  insurancePrices: IActivityPriceResponse[] = [];
  insuranceGroups: IActivityCompetitionGroupResponse[] = [];
  selectedInsurance: IActivityResponse | null = null;
  basicInsuranceSelected: boolean = true;

  constructor(
    private activityService: ActivityService,
    private activityPriceService: ActivityPriceService,
    private activityCompetitionGroupService: ActivityCompetitionGroupService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadInsurances();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['itineraryId'] || changes['departureId']) {
      this.loadInsurances();
    }
  }

  loadInsurances(): void {
    if (this.itineraryId) {
      // Primero cargar los grupos de competición del itinerario
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
              // Los seguros SON las actividades de estos grupos
              // Usar getAll con filtro por activityCompetitionGroupId
              const insuranceGroupIds = this.insuranceGroups.map(
                (group) => group.id
              );

              // Cargar actividades filtrando por los grupos de seguros
              this.activityService
                .getAll({
                  itineraryId: this.itineraryId!,
                  activityCompetitionGroupId: insuranceGroupIds[0], // Solo uno por vez
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
              // No hay grupos de seguros
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
          },
          error: (error) => {
            console.error('Error loading insurance prices:', error);
          },
        });
    }
  }

  toggleInsurance(insurance: IActivityResponse | null): void {
    this.selectedInsurance = insurance;
    this.basicInsuranceSelected = !insurance;

    // NUEVO: Emitir el cambio al componente padre
    const price = insurance ? this.getPriceById(insurance.id) : 0;
    this.insuranceSelectionChange.emit({
      selectedInsurance: insurance,
      price: price,
    });
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

  // NUEVO: Método para obtener el seguro seleccionado y su precio
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
}
