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
    console.log(
      '🛡️ [INSURANCE] 🔍 DEBUG - selectedInsurance cambiando de:',
      this._selectedInsurance,
      'a:',
      value
    );
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
    console.log('🛡️ [INSURANCE] ngOnInit() iniciado');
    console.log('🛡️ [INSURANCE] Valores iniciales:', {
      tourId: this.tourId,
      departureId: this.departureId,
      itineraryId: this.itineraryId,
      reservationId: this.reservationId,
    });

    this.loadInsurances();
    this.loadExistingTravelers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🛡️ [INSURANCE] ngOnChanges() llamado');
    console.log('🛡️ [INSURANCE] Cambios detectados:', Object.keys(changes));

    if (changes['itineraryId'] || changes['departureId']) {
      console.log(
        '🛡️ [INSURANCE] Cambio en itineraryId o departureId, recargando seguros'
      );
      this.loadInsurances();
    }
    if (changes['reservationId'] && this.reservationId) {
      console.log(
        '🛡️ [INSURANCE] Cambio en reservationId, recargando travelers'
      );
      this.loadExistingTravelers();
    }
  }

  loadInsurances(): void {
    console.log('🛡️ [INSURANCE] loadInsurances() iniciado');
    console.log('🛡️ [INSURANCE] itineraryId:', this.itineraryId);

    if (this.itineraryId) {
      console.log(
        '🛡️ [INSURANCE] Cargando grupos de competición para itinerario:',
        this.itineraryId
      );

      // Cargar los grupos de competición del itinerario
      this.activityCompetitionGroupService
        .getByItineraryId(this.itineraryId)
        .subscribe({
          next: (groups) => {
            console.log(
              '🛡️ [INSURANCE] ✅ Grupos de competición cargados desde BD:',
              groups.length
            );
            console.log('🛡️ [INSURANCE] ✅ Grupos encontrados en BD:', groups);

            // Filtrar solo los grupos que contengan "seguros" en el nombre
            this.insuranceGroups = groups.filter(
              (group) =>
                group.name && group.name.toLowerCase().includes('seguros')
            );

            console.log(
              '🛡️ [INSURANCE] ✅ Grupos de seguros filtrados desde BD:',
              this.insuranceGroups.length
            );
            console.log(
              '🛡️ [INSURANCE] ✅ Grupos de seguros encontrados en BD:',
              this.insuranceGroups
            );

            if (this.insuranceGroups.length > 0) {
              console.log(
                '🛡️ [INSURANCE] Cargando actividades de seguro para grupo:',
                this.insuranceGroups[0].id
              );

              // Cargar actividades filtrando por los grupos de seguros
              this.activityService
                .getAll({
                  itineraryId: this.itineraryId!,
                  activityCompetitionGroupId: this.insuranceGroups[0].id,
                  isVisibleOnWeb: true,
                })
                .subscribe({
                  next: (activities) => {
                    console.log(
                      '🛡️ [INSURANCE] ✅ Seguros cargados desde BD:',
                      activities.length
                    );
                    console.log(
                      '🛡️ [INSURANCE] ✅ Seguros encontrados en BD:',
                      activities
                    );

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
              console.log(
                '🛡️ [INSURANCE] ❌ No se encontraron grupos de seguros en BD'
              );
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
    } else {
      console.log(
        '🛡️ [INSURANCE] ❌ No hay itineraryId, no se pueden cargar seguros'
      );
    }
  }

  loadPrices(): void {
    console.log('🛡️ [INSURANCE] loadPrices() iniciado');
    console.log('🛡️ [INSURANCE] departureId:', this.departureId);
    console.log('🛡️ [INSURANCE] insurances.length:', this.insurances.length);

    if (this.departureId && this.insurances.length > 0) {
      const activityIds = this.insurances.map((insurance) => insurance.id);
      console.log(
        '🛡️ [INSURANCE] Cargando precios para activityIds:',
        activityIds
      );

      this.activityPriceService
        .getAll({
          ActivityId: activityIds,
          DepartureId: this.departureId,
        })
        .subscribe({
          next: (prices) => {
            console.log(
              '🛡️ [INSURANCE] ✅ Precios de seguros cargados desde BD:',
              prices.length
            );
            console.log('🛡️ [INSURANCE] ✅ Precios encontrados en BD:', prices);

            this.insurancePrices = prices;

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
    } else {
      console.log(
        '🛡️ [INSURANCE] ❌ No se pueden cargar precios - departureId:',
        this.departureId,
        'insurances:',
        this.insurances.length
      );
    }
  }

  // Seleccionar seguro por defecto
  private selectDefaultInsurance(): void {
    console.log('🛡️ [INSURANCE] 🔍 Seleccionando seguro por defecto...');

    if (this.insurances.length === 0) {
      console.log(
        '🛡️ [INSURANCE] No hay seguros en BD, selectedInsurance = null'
      );
      this.selectedInsurance = null;
      this.emitInsuranceChange();
      return;
    }

    // Buscar el seguro básico (precio 0)
    const basicInsurance = this.insurances.find((insurance) => {
      const price = this.getPriceById(insurance.id);
      const isBasic = price === 0;
      console.log(
        `🛡️ [INSURANCE] Seguro "${insurance.name}" - precio: ${price}, es básico: ${isBasic}`
      );
      return isBasic;
    });

    if (basicInsurance) {
      console.log(
        '🛡️ [INSURANCE] ✅ Seguro básico encontrado en BD, seleccionando por defecto:',
        basicInsurance.name
      );
      this.selectedInsurance = basicInsurance;
    } else {
      console.log(
        '🛡️ [INSURANCE] ❌ No se encontró seguro básico, NO seleccionando ninguno por defecto'
      );
      this.selectedInsurance = null;
    }

    // Emitir el estado inicial
    this.emitInsuranceChange();
  }

  // Cargar travelers existentes
  loadExistingTravelers(): void {
    console.log('🛡️ [INSURANCE] loadExistingTravelers() iniciado');
    console.log('🛡️ [INSURANCE] reservationId:', this.reservationId);

    if (!this.reservationId) {
      console.log(
        '🛡️ [INSURANCE] ❌ No hay reservationId, no se pueden cargar travelers'
      );
      return;
    }

    console.log(
      '🛡️ [INSURANCE] Cargando travelers para reserva:',
      this.reservationId
    );

    this.reservationTravelerService
      .getByReservationOrdered(this.reservationId)
      .subscribe({
        next: (travelers) => {
          console.log('🛡️ [INSURANCE] Travelers cargados:', travelers.length);
          console.log(
            '🛡️ [INSURANCE] Travelers IDs:',
            travelers.map((t) => t.id)
          );

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
    console.log('🛡️ [INSURANCE] loadExistingInsuranceAssignments() iniciado');
    console.log(
      '🛡️ [INSURANCE] existingTravelers.length:',
      this.existingTravelers.length
    );
    console.log('🛡️ [INSURANCE] insurances.length:', this.insurances.length);

    if (!this.existingTravelers.length || !this.insurances.length) {
      console.log(
        '🛡️ [INSURANCE] ❌ No hay travelers o insurances, no se pueden cargar asignaciones'
      );
      return;
    }

    // Obtener todas las asignaciones de seguros para los travelers de esta reserva
    const travelerIds = this.existingTravelers.map((t) => t.id);
    const insuranceIds = this.insurances.map((i) => i.id);

    console.log(
      '🛡️ [INSURANCE] Buscando asignaciones para travelers:',
      travelerIds
    );
    console.log('🛡️ [INSURANCE] IDs de seguros disponibles:', insuranceIds);

    // Buscar asignaciones existentes
    const assignmentPromises = travelerIds.map((travelerId) => {
      return this.reservationTravelerActivityService.getByReservationTraveler(
        travelerId
      );
    });

    console.log(
      '🛡️ [INSURANCE] Ejecutando búsqueda de asignaciones existentes...'
    );

    forkJoin(assignmentPromises).subscribe({
      next: (allAssignments) => {
        console.log(
          '🛡️ [INSURANCE] Todas las asignaciones encontradas:',
          allAssignments.flat().length
        );

        // Filtrar solo las asignaciones que corresponden a seguros
        const allAssignmentsFlat = allAssignments.flat();
        this.currentInsuranceAssignments = allAssignmentsFlat.filter(
          (assignment) => insuranceIds.includes(assignment.activityId)
        );

        console.log(
          '🛡️ [INSURANCE] Asignaciones de seguros filtradas:',
          this.currentInsuranceAssignments.length
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
    console.log('🛡️ [INSURANCE] determineSelectedInsurance() iniciado');
    console.log(
      '🛡️ [INSURANCE] currentInsuranceAssignments.length:',
      this.currentInsuranceAssignments.length
    );

    // Solo determinar si no hay una selección previa del usuario
    if (this.userHasMadeSelection) {
      console.log(
        '🛡️ [INSURANCE] ✅ Usuario ya ha hecho una selección manual, no sobrescribir'
      );
      return;
    }

    if (this.currentInsuranceAssignments.length === 0) {
      console.log(
        '🛡️ [INSURANCE] No hay asignaciones, manteniendo selección por defecto'
      );
      this.emitInsuranceChange();
      return;
    }

    // Encontrar el seguro más común entre las asignaciones
    const insuranceCount: { [activityId: number]: number } = {};
    this.currentInsuranceAssignments.forEach((assignment) => {
      insuranceCount[assignment.activityId] =
        (insuranceCount[assignment.activityId] || 0) + 1;
    });

    console.log(
      '🛡️ [INSURANCE] Conteo de seguros por activityId:',
      insuranceCount
    );

    const mostCommonInsuranceId = Object.keys(insuranceCount).reduce((a, b) =>
      insuranceCount[parseInt(a)] > insuranceCount[parseInt(b)] ? a : b
    );

    console.log(
      '🛡️ [INSURANCE] Seguro más común (activityId):',
      mostCommonInsuranceId
    );

    // Buscar el seguro correspondiente
    const selectedInsurance = this.insurances.find(
      (insurance) => insurance.id === parseInt(mostCommonInsuranceId)
    );

    if (selectedInsurance) {
      console.log(
        '🛡️ [INSURANCE] ✅ Seguro encontrado y seleccionado:',
        selectedInsurance.name
      );
      this.selectedInsurance = selectedInsurance;
    } else {
      console.log(
        '🛡️ [INSURANCE] ❌ Seguro no encontrado, manteniendo selección actual'
      );
    }

    // Emitir el estado inicial
    this.emitInsuranceChange();
  }

  toggleInsurance(insurance: IActivityResponse | null): void {
    console.log('🛡️ [INSURANCE] toggleInsurance() llamado');
    console.log(
      '🛡️ [INSURANCE] Seguro seleccionado:',
      insurance ? insurance.name : 'null'
    );

    this.selectedInsurance = insurance;

    // Marcar como cambios pendientes
    this.hasUnsavedChanges = true;
    this.errorMsg = null;
    this.userHasMadeSelection = true;

    console.log('🛡️ [INSURANCE] hasUnsavedChanges marcado como true');

    // Emitir el cambio al componente padre
    this.emitInsuranceChange();
  }

  // Emitir cambio de seguro
  private emitInsuranceChange(): void {
    const price = this.selectedInsurance
      ? this.getPriceById(this.selectedInsurance.id)
      : 0;

    console.log('🛡️ [INSURANCE] emitInsuranceChange() - Emitiendo cambio:', {
      selectedInsurance: this.selectedInsurance
        ? this.selectedInsurance.name
        : 'null',
      price: price,
    });

    this.insuranceSelectionChange.emit({
      selectedInsurance: this.selectedInsurance,
      price: price,
    });
  }

  // Guardar asignaciones de seguro
  async saveInsuranceAssignments(): Promise<boolean> {
    console.log('🛡️ [INSURANCE] Iniciando saveInsuranceAssignments()');
    console.log('🛡️ [INSURANCE] hasUnsavedChanges:', this.hasUnsavedChanges);
    console.log(
      '🛡️ [INSURANCE] selectedInsurance:',
      this.selectedInsurance ? this.selectedInsurance.name : 'null'
    );

    if (!this.reservationId) {
      console.log('🛡️ [INSURANCE] ❌ No hay reservationId, retornando false');
      return false;
    }

    // Guardar si hay cambios pendientes o hay un seguro seleccionado
    const shouldSave =
      this.hasUnsavedChanges || this.selectedInsurance !== null;

    if (!shouldSave) {
      console.log('🛡️ [INSURANCE] No hay cambios pendientes, retornando true');
      return true;
    }

    console.log('🛡️ [INSURANCE] Procediendo con el guardado...');
    this.isSaving = true;
    this.errorMsg = null;

    try {
      // Asegurar que tenemos travelers cargados
      if (!this.existingTravelers.length) {
        this.existingTravelers =
          (await this.reservationTravelerService
            .getByReservationOrdered(this.reservationId)
            .toPromise()) || [];
        console.log(
          '🛡️ [INSURANCE] Travelers cargados:',
          this.existingTravelers.length
        );
      }

      if (!this.existingTravelers.length) {
        console.log('🛡️ [INSURANCE] ❌ ERROR: No se encontraron viajeros');
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
        console.log('🛡️ [INSURANCE] ✅ Asignaciones existentes eliminadas');
      }

      // Crear nuevas asignaciones si hay seguro seleccionado
      if (this.selectedInsurance) {
        console.log(
          '🛡️ [INSURANCE] Creando nuevas asignaciones para seguro:',
          this.selectedInsurance.name
        );

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

        console.log(
          '🛡️ [INSURANCE] ✅ Asignaciones creadas:',
          this.currentInsuranceAssignments.length
        );
      } else {
        console.log(
          '🛡️ [INSURANCE] No hay seguro seleccionado, no se crean asignaciones'
        );
        this.currentInsuranceAssignments = [];
      }

      this.hasUnsavedChanges = false;
      this.isSaving = false;
      console.log('🛡️ [INSURANCE] ✅ Guardado completado exitosamente');
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

  getPriceById(activityId: number): number {
    // Buscar el precio para adultos (asumiendo ageGroupId = 1 para adultos)
    const price = this.insurancePrices.find(
      (p) => p.activityId === activityId && p.ageGroupId === 1
    );
    const finalPrice = price ? price.basePrice : 0;

    console.log(
      `🛡️ [INSURANCE] 💰 Precio para seguro ID ${activityId}:`,
      finalPrice
    );
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
    console.log('🛡️ [INSURANCE] Verificando asignaciones de seguro...');

    if (!this.reservationId || !this.existingTravelers.length) {
      console.log(
        '🛡️ [INSURANCE] ❌ No hay reservationId o travelers para verificar'
      );
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

      console.log('🛡️ [INSURANCE] 📊 Verificación de asignaciones:');
      console.log(
        '🛡️ [INSURANCE]   - Total de viajeros:',
        this.existingTravelers.length
      );
      console.log(
        '🛡️ [INSURANCE]   - Asignaciones de seguro encontradas:',
        currentInsuranceAssignments.length
      );
      console.log(
        '🛡️ [INSURANCE]   - Seguro seleccionado:',
        this.selectedInsurance ? this.selectedInsurance.name : 'null'
      );

      if (this.selectedInsurance) {
        // Verificar que todos los viajeros tengan el seguro seleccionado
        const expectedAssignments = this.existingTravelers.length;
        const actualAssignments = currentInsuranceAssignments.filter(
          (assignment) =>
            assignment && assignment.activityId === this.selectedInsurance!.id
        ).length;

        console.log(
          '🛡️ [INSURANCE]   - Asignaciones esperadas:',
          expectedAssignments
        );
        console.log(
          '🛡️ [INSURANCE]   - Asignaciones reales:',
          actualAssignments
        );

        const isCorrect = actualAssignments === expectedAssignments;
        console.log(
          '🛡️ [INSURANCE] ✅ Verificación:',
          isCorrect ? 'EXITOSA' : 'FALLIDA'
        );

        return isCorrect;
      } else {
        // Si no hay seguro seleccionado, no debería haber asignaciones
        const hasAssignments = currentInsuranceAssignments.length > 0;
        console.log(
          '🛡️ [INSURANCE] ✅ Verificación sin seguro:',
          !hasAssignments ? 'EXITOSA' : 'FALLIDA'
        );

        return !hasAssignments;
      }
    } catch (error) {
      console.error('🛡️ [INSURANCE] ❌ Error verificando asignaciones:', error);
      return false;
    }
  }
}
