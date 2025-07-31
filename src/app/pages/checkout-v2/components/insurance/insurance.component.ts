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
  private _selectedInsurance: IActivityResponse | null = null;
  basicInsuranceSelected: boolean = true;

  // Getter y setter para rastrear cambios en selectedInsurance
  get selectedInsurance(): IActivityResponse | null {
    return this._selectedInsurance;
  }

  set selectedInsurance(value: IActivityResponse | null) {
    console.log('🛡️ [INSURANCE] 🔍 DEBUG - selectedInsurance cambiando de:', this._selectedInsurance, 'a:', value);
    this._selectedInsurance = value;
  }

  // NUEVO: Propiedades para gestionar travelers y asignaciones
  existingTravelers: IReservationTravelerResponse[] = [];
  currentInsuranceAssignments: IReservationTravelerActivityResponse[] = [];
  hasUnsavedChanges: boolean = false;
  isSaving: boolean = false;
  errorMsg: string | null = null;
  userHasMadeSelection: boolean = false; // NUEVO: Para rastrear si el usuario ha hecho una selección

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
      reservationId: this.reservationId
    });
    
    this.loadInsurances();
    this.loadExistingTravelers();
    
    // NUEVO: Agregar listener para cambios en selectedInsurance
    console.log('🛡️ [INSURANCE] 🔍 DEBUG - Agregando listener para selectedInsurance');
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🛡️ [INSURANCE] ngOnChanges() llamado');
    console.log('🛡️ [INSURANCE] Cambios detectados:', Object.keys(changes));
    
    if (changes['itineraryId'] || changes['departureId']) {
      console.log('🛡️ [INSURANCE] Cambio en itineraryId o departureId, recargando seguros');
      this.loadInsurances();
    }
    if (changes['reservationId'] && this.reservationId) {
      console.log('🛡️ [INSURANCE] Cambio en reservationId, recargando travelers');
      this.loadExistingTravelers();
    }
  }

  loadInsurances(): void {
    console.log('🛡️ [INSURANCE] loadInsurances() iniciado');
    console.log('🛡️ [INSURANCE] itineraryId:', this.itineraryId);
    
    if (this.itineraryId) {
      console.log('🛡️ [INSURANCE] Cargando grupos de competición para itinerario:', this.itineraryId);
      
      // Cargar los grupos de competición del itinerario
      this.activityCompetitionGroupService
        .getByItineraryId(this.itineraryId)
        .subscribe({
          next: (groups) => {
            console.log('🛡️ [INSURANCE] Grupos de competición cargados:', groups.length);
            console.log('🛡️ [INSURANCE] Grupos encontrados:', groups.map(g => g.name));
            
            // Filtrar solo los grupos que contengan "seguros" en el nombre
            this.insuranceGroups = groups.filter(
              (group) =>
                group.name && group.name.toLowerCase().includes('seguros')
            );

            console.log('🛡️ [INSURANCE] Grupos de seguros filtrados:', this.insuranceGroups.length);
            console.log('🛡️ [INSURANCE] Nombres de grupos de seguros:', this.insuranceGroups.map(g => g.name));

            if (this.insuranceGroups.length > 0) {
              console.log('🛡️ [INSURANCE] Cargando actividades de seguro para grupo:', this.insuranceGroups[0].id);
              
              // Cargar actividades filtrando por los grupos de seguros
              this.activityService
                .getAll({
                  itineraryId: this.itineraryId!,
                  activityCompetitionGroupId: this.insuranceGroups[0].id,
                  isVisibleOnWeb: true,
                })
                .subscribe({
                  next: (activities) => {
                    console.log('🛡️ [INSURANCE] Actividades de seguro cargadas:', activities.length);
                    console.log('🛡️ [INSURANCE] Nombres de seguros:', activities.map(a => a.name));
                    
                    this.insurances = activities;
                    this.loadPrices();
                  },
                  error: (error) => {
                    console.error('🛡️ [INSURANCE] ❌ Error loading insurance activities:', error);
                  },
                });
            } else {
              console.log('🛡️ [INSURANCE] No se encontraron grupos de seguros, array vacío');
              this.insurances = [];
            }
          },
          error: (error) => {
            console.error('🛡️ [INSURANCE] ❌ Error loading insurance groups:', error);
          },
        });
    } else {
      console.log('🛡️ [INSURANCE] ❌ No hay itineraryId, no se pueden cargar seguros');
    }
  }

  loadPrices(): void {
    console.log('🛡️ [INSURANCE] loadPrices() iniciado');
    console.log('🛡️ [INSURANCE] departureId:', this.departureId);
    console.log('🛡️ [INSURANCE] insurances.length:', this.insurances.length);
    
    if (this.departureId && this.insurances.length > 0) {
      const activityIds = this.insurances.map((insurance) => insurance.id);
      console.log('🛡️ [INSURANCE] Cargando precios para activityIds:', activityIds);

      this.activityPriceService
        .getAll({
          ActivityId: activityIds,
          DepartureId: this.departureId,
        })
        .subscribe({
          next: (prices) => {
            console.log('🛡️ [INSURANCE] Precios de seguros cargados:', prices.length);
            console.log('🛡️ [INSURANCE] Precios:', prices.map(p => ({
              activityId: p.activityId,
              basePrice: p.basePrice,
              ageGroupId: p.ageGroupId
            })));
            
            this.insurancePrices = prices;
            // Cargar asignaciones existentes después de cargar precios
            this.loadExistingInsuranceAssignments();
          },
          error: (error) => {
            console.error('🛡️ [INSURANCE] ❌ Error loading insurance prices:', error);
          },
        });
    } else {
      console.log('🛡️ [INSURANCE] ❌ No se pueden cargar precios - departureId:', this.departureId, 'insurances:', this.insurances.length);
    }
  }

  // NUEVO: Cargar travelers existentes
  loadExistingTravelers(): void {
    console.log('🛡️ [INSURANCE] loadExistingTravelers() iniciado');
    console.log('🛡️ [INSURANCE] reservationId:', this.reservationId);
    
    if (!this.reservationId) {
      console.log('🛡️ [INSURANCE] ❌ No hay reservationId, no se pueden cargar travelers');
      return;
    }

    console.log('🛡️ [INSURANCE] Cargando travelers para reserva:', this.reservationId);
    
    this.reservationTravelerService
      .getByReservationOrdered(this.reservationId)
      .subscribe({
        next: (travelers) => {
          console.log('🛡️ [INSURANCE] Travelers cargados:', travelers.length);
          console.log('🛡️ [INSURANCE] Travelers IDs:', travelers.map(t => t.id));
          
          this.existingTravelers = travelers;
          this.loadExistingInsuranceAssignments();
        },
        error: (error) => {
          console.error('🛡️ [INSURANCE] ❌ Error loading existing travelers:', error);
        },
      });
  }

  // NUEVO: Cargar asignaciones de seguro existentes
  loadExistingInsuranceAssignments(): void {
    console.log('🛡️ [INSURANCE] loadExistingInsuranceAssignments() iniciado');
    console.log('🛡️ [INSURANCE] existingTravelers.length:', this.existingTravelers.length);
    console.log('🛡️ [INSURANCE] insurances.length:', this.insurances.length);
    
    if (!this.existingTravelers.length || !this.insurances.length) {
      console.log('🛡️ [INSURANCE] ❌ No hay travelers o insurances, no se pueden cargar asignaciones');
      return;
    }

    // Obtener todas las asignaciones de seguros para los travelers de esta reserva
    const travelerIds = this.existingTravelers.map((t) => t.id);
    const insuranceIds = this.insurances.map((i) => i.id);
    
    console.log('🛡️ [INSURANCE] Buscando asignaciones para travelers:', travelerIds);
    console.log('🛡️ [INSURANCE] IDs de seguros disponibles:', insuranceIds);

    // Buscar asignaciones existentes
    console.log('🛡️ [INSURANCE] Buscando asignaciones para cada traveler...');
    const assignmentPromises = travelerIds.map((travelerId) => {
      console.log('🛡️ [INSURANCE] Consultando asignaciones para traveler ID:', travelerId);
      return this.reservationTravelerActivityService.getByReservationTraveler(
        travelerId
      );
    });

    console.log('🛡️ [INSURANCE] Ejecutando búsqueda de asignaciones existentes...');
    
    forkJoin(assignmentPromises).subscribe({
      next: (allAssignments) => {
        console.log('🛡️ [INSURANCE] Todas las asignaciones encontradas:', allAssignments.flat().length);
        
        // Mostrar todas las asignaciones encontradas por traveler
        allAssignments.forEach((assignments, index) => {
          console.log('🛡️ [INSURANCE] Traveler ID:', travelerIds[index], 'tiene', assignments.length, 'asignaciones:');
          assignments.forEach(assignment => {
            console.log('🛡️ [INSURANCE]   - Asignación ID:', assignment.id, 'Activity ID:', assignment.activityId, 'Traveler ID:', assignment.reservationTravelerId);
          });
        });
        
        console.log('🛡️ [INSURANCE] Asignaciones por traveler:', allAssignments.map((assignments, index) => ({
          travelerId: travelerIds[index],
          assignmentsCount: assignments.length
        })));
        
        // Filtrar solo las asignaciones que corresponden a seguros
        const allAssignmentsFlat = allAssignments.flat();
        console.log('🛡️ [INSURANCE] TODAS LAS RELACIONES ACTIVITY/TRAVELER ENCONTRADAS:', allAssignmentsFlat.map(a => ({
          asignacionId: a.id,
          travelerId: a.reservationTravelerId,
          activityId: a.activityId,
          relacion: `Traveler ${a.reservationTravelerId} → Activity ${a.activityId}`
        })));
        
        this.currentInsuranceAssignments = allAssignmentsFlat
          .filter((assignment) => insuranceIds.includes(assignment.activityId));

        console.log('🛡️ [INSURANCE] Asignaciones de seguros filtradas:', this.currentInsuranceAssignments.length);
        console.log('🛡️ [INSURANCE] RELACIONES ACTIVITY/TRAVELER RECUPERADAS:', this.currentInsuranceAssignments.map(a => ({
          asignacionId: a.id,
          travelerId: a.reservationTravelerId,
          activityId: a.activityId,
          relacion: `Traveler ${a.reservationTravelerId} → Seguro ${a.activityId}`
        })));

        // Determinar el seguro seleccionado basado en las asignaciones existentes
        this.determineSelectedInsurance();
      },
      error: (error) => {
        console.error('🛡️ [INSURANCE] ❌ Error loading existing insurance assignments:', error);
      },
    });
  }

  // NUEVO: Determinar el seguro seleccionado basado en asignaciones existentes
  determineSelectedInsurance(): void {
    console.log('🛡️ [INSURANCE] determineSelectedInsurance() iniciado');
    console.log('🛡️ [INSURANCE] currentInsuranceAssignments.length:', this.currentInsuranceAssignments.length);
    console.log('🛡️ [INSURANCE] 🔍 DEBUG - selectedInsurance actual antes de determinar:', this.selectedInsurance);
    
    // NUEVO: Solo determinar si no hay una selección previa del usuario
    if (this.userHasMadeSelection) {
      console.log('🛡️ [INSURANCE] ✅ Usuario ya ha hecho una selección manual, no sobrescribir');
      return;
    }
    
    if (this.selectedInsurance !== null) {
      console.log('🛡️ [INSURANCE] ✅ Usuario ya tiene una selección, no sobrescribir:', this.selectedInsurance.name);
      return;
    }
    
    if (this.currentInsuranceAssignments.length === 0) {
      console.log('🛡️ [INSURANCE] No hay asignaciones, seleccionando seguro básico por defecto');
      // No hay asignaciones, mantener seguro básico
      this.selectedInsurance = null;
      this.basicInsuranceSelected = true;
      this.emitInsuranceChange();
      return;
    }

    console.log('🛡️ [INSURANCE] Analizando asignaciones existentes...');
    console.log('🛡️ [INSURANCE] IDs de asignaciones a analizar:', this.currentInsuranceAssignments.map(a => a.id));
    
    // Encontrar el seguro más común entre las asignaciones
    const insuranceCount: { [activityId: number]: number } = {};
    this.currentInsuranceAssignments.forEach((assignment) => {
      console.log('🛡️ [INSURANCE] Procesando asignación ID:', assignment.id, 'con activityId:', assignment.activityId);
      insuranceCount[assignment.activityId] =
        (insuranceCount[assignment.activityId] || 0) + 1;
    });

    console.log('🛡️ [INSURANCE] Conteo de seguros por activityId:', insuranceCount);

    const mostCommonInsuranceId = Object.keys(insuranceCount).reduce((a, b) =>
      insuranceCount[parseInt(a)] > insuranceCount[parseInt(b)] ? a : b
    );

    console.log('🛡️ [INSURANCE] Seguro más común (activityId):', mostCommonInsuranceId);

    // Buscar el seguro correspondiente
    const selectedInsurance = this.insurances.find(
      (insurance) => insurance.id === parseInt(mostCommonInsuranceId)
    );

    if (selectedInsurance) {
      console.log('🛡️ [INSURANCE] ✅ Seguro encontrado y seleccionado:', selectedInsurance.name);
      this.selectedInsurance = selectedInsurance;
      this.basicInsuranceSelected = false;
    } else {
      console.log('🛡️ [INSURANCE] ❌ Seguro no encontrado, seleccionando básico');
      this.selectedInsurance = null;
      this.basicInsuranceSelected = true;
    }

    console.log('🛡️ [INSURANCE] Estado final - selectedInsurance:', this.selectedInsurance ? this.selectedInsurance.name : 'Básico');
    console.log('🛡️ [INSURANCE] Estado final - basicInsuranceSelected:', this.basicInsuranceSelected);

    // Emitir el estado inicial
    this.emitInsuranceChange();
  }

  toggleInsurance(insurance: IActivityResponse | null): void {
    console.log('🛡️ [INSURANCE] toggleInsurance() llamado');
    console.log('🛡️ [INSURANCE] 🔍 DEBUG - Parámetro insurance recibido:', insurance);
    console.log('🛡️ [INSURANCE] 🔍 DEBUG - insurance es null?', insurance === null);
    console.log('🛡️ [INSURANCE] Seguro seleccionado:', insurance ? insurance.name : 'Básico');
    
    this.selectedInsurance = insurance;
    this.basicInsuranceSelected = !insurance;
    this.hasUnsavedChanges = true;
    this.errorMsg = null;
    this.userHasMadeSelection = true; // NUEVO: Marcar que el usuario ha hecho una selección

    console.log('🛡️ [INSURANCE] 🔍 DEBUG - Después de asignar:');
    console.log('🛡️ [INSURANCE] 🔍 DEBUG - this.selectedInsurance:', this.selectedInsurance);
    console.log('🛡️ [INSURANCE] 🔍 DEBUG - this.basicInsuranceSelected:', this.basicInsuranceSelected);
    console.log('🛡️ [INSURANCE] 🔍 DEBUG - userHasMadeSelection:', this.userHasMadeSelection);
    console.log('🛡️ [INSURANCE] hasUnsavedChanges marcado como true');

    // Emitir el cambio al componente padre
    this.emitInsuranceChange();
  }

  // NUEVO: Emitir cambio de seguro
  private emitInsuranceChange(): void {
    const price = this.selectedInsurance
      ? this.getPriceById(this.selectedInsurance.id)
      : 0;
    
    console.log('🛡️ [INSURANCE] emitInsuranceChange() - Emitiendo cambio:', {
      selectedInsurance: this.selectedInsurance ? this.selectedInsurance.name : 'Básico',
      price: price
    });
    
    this.insuranceSelectionChange.emit({
      selectedInsurance: this.selectedInsurance,
      price: price,
    });
  }

  // NUEVO: Guardar asignaciones de seguro
  async saveInsuranceAssignments(): Promise<boolean> {
    console.log('🛡️ [INSURANCE] Iniciando saveInsuranceAssignments()');
    console.log('🛡️ [INSURANCE] hasUnsavedChanges:', this.hasUnsavedChanges);
    console.log('🛡️ [INSURANCE] reservationId:', this.reservationId);
    
    if (!this.hasUnsavedChanges || !this.reservationId) {
      console.log('🛡️ [INSURANCE] No hay cambios pendientes o no hay reservationId, retornando true');
      return true;
    }

    console.log('🛡️ [INSURANCE] Procediendo con el guardado...');
    this.isSaving = true;
    this.errorMsg = null;

    try {
      console.log('🛡️ [INSURANCE] Iniciando try-catch del guardado');
      
      // Asegurar que tenemos travelers cargados
      if (!this.existingTravelers.length) {
        console.log('🛡️ [INSURANCE] No hay travelers cargados, cargando desde el servicio...');
        this.existingTravelers =
          (await this.reservationTravelerService
            .getByReservationOrdered(this.reservationId)
            .toPromise()) || [];
        console.log('🛡️ [INSURANCE] Travelers cargados:', this.existingTravelers.length);
      }

      if (!this.existingTravelers.length) {
        console.log('🛡️ [INSURANCE] ❌ ERROR: No se encontraron viajeros para asignar el seguro');
        this.errorMsg = 'No se encontraron viajeros para asignar el seguro.';
        return false;
      }

      console.log('🛡️ [INSURANCE] Eliminando asignaciones existentes...');
      console.log('🛡️ [INSURANCE] Asignaciones a eliminar:', this.currentInsuranceAssignments.length);
      
      // Eliminar asignaciones existentes de seguros
              console.log('🛡️ [INSURANCE] RELACIONES ACTIVITY/TRAVELER A ELIMINAR:', this.currentInsuranceAssignments.map(a => ({
          asignacionId: a.id,
          travelerId: a.reservationTravelerId,
          activityId: a.activityId,
          relacion: `Traveler ${a.reservationTravelerId} → Seguro ${a.activityId}`
        })));
      
              const deletePromises = this.currentInsuranceAssignments.map(
          (assignment) => {
            console.log('🛡️ [INSURANCE] 🗑️ ELIMINANDO DE BD - Asignación ID:', assignment.id, 'para traveler:', assignment.reservationTravelerId, 'activity:', assignment.activityId);
            return this.reservationTravelerActivityService
              .delete(assignment.id)
              .toPromise();
          }
        );

      if (deletePromises.length > 0) {
        console.log('🛡️ [INSURANCE] Ejecutando eliminación de asignaciones existentes...');
        await Promise.all(deletePromises);
        console.log('🛡️ [INSURANCE] ✅ Asignaciones existentes eliminadas');
      } else {
        console.log('🛡️ [INSURANCE] No hay asignaciones existentes para eliminar');
      }

      // Crear nuevas asignaciones si no es seguro básico
      console.log('🛡️ [INSURANCE] 🔍 DEBUG - Verificando selectedInsurance:', this.selectedInsurance);
      console.log('🛡️ [INSURANCE] 🔍 DEBUG - basicInsuranceSelected:', this.basicInsuranceSelected);
      
      if (this.selectedInsurance) {
        console.log('🛡️ [INSURANCE] ✅ Seguro seleccionado:', this.selectedInsurance.name, 'ID:', this.selectedInsurance.id);
        console.log('🛡️ [INSURANCE] Creando nuevas asignaciones para seguro:', this.selectedInsurance.name);
        console.log('🛡️ [INSURANCE] Travelers a asignar:', this.existingTravelers.length);
        console.log('🛡️ [INSURANCE] RELACIONES ACTIVITY/TRAVELER A CREAR:');
        this.existingTravelers.forEach(traveler => {
          console.log('🛡️ [INSURANCE]   - Traveler', traveler.id, '→ Seguro', this.selectedInsurance!.id);
        });
        
        const createPromises = this.existingTravelers.map((traveler) => {
          const newAssignment = {
            id: 0,
            reservationTravelerId: traveler.id,
            activityId: this.selectedInsurance!.id,
          };
          console.log('🛡️ [INSURANCE] 🗄️ GUARDANDO EN BD - Datos a insertar:', newAssignment);
          return this.reservationTravelerActivityService
            .create(newAssignment)
            .toPromise();
        });

        console.log('🛡️ [INSURANCE] Ejecutando creación de asignaciones...');
        const results = await Promise.all(createPromises);
        this.currentInsuranceAssignments = results.filter(
          (r) => r !== null
        ) as IReservationTravelerActivityResponse[];
        
        console.log('🛡️ [INSURANCE] ✅ Asignaciones creadas:', this.currentInsuranceAssignments.length);
        console.log('🛡️ [INSURANCE] 🗄️ IDs GUARDADOS EN BD:', this.currentInsuranceAssignments.map(a => ({
          asignacionId: a.id,           // ← ID generado por la BD
          travelerId: a.reservationTravelerId,  // ← ID del traveler
          activityId: a.activityId,     // ← ID del seguro
          relacion: `Traveler ${a.reservationTravelerId} → Seguro ${a.activityId}`
        })));
              } else {
          console.log('🛡️ [INSURANCE] ❌ PROBLEMA - selectedInsurance es null pero debería tener valor');
          console.log('🛡️ [INSURANCE] ❌ PROBLEMA - basicInsuranceSelected:', this.basicInsuranceSelected);
          console.log('🛡️ [INSURANCE] ❌ PROBLEMA - Insurances disponibles:', this.insurances.map(i => ({ id: i.id, name: i.name })));
          console.log('🛡️ [INSURANCE] Seguro básico seleccionado, no se crean asignaciones');
          this.currentInsuranceAssignments = [];
        }

      this.hasUnsavedChanges = false;
      this.isSaving = false;
      console.log('🛡️ [INSURANCE] ✅ Guardado completado exitosamente');
      console.log('🛡️ [INSURANCE] 📋 RESUMEN DE IDs GUARDADOS:');
      console.log('🛡️ [INSURANCE]   - Total de asignaciones guardadas:', this.currentInsuranceAssignments.length);
      console.log('🛡️ [INSURANCE]   - IDs de asignaciones:', this.currentInsuranceAssignments.map(a => a.id));
      console.log('🛡️ [INSURANCE]   - IDs de travelers:', this.currentInsuranceAssignments.map(a => a.reservationTravelerId));
      console.log('🛡️ [INSURANCE]   - ID del seguro:', this.selectedInsurance ? this.selectedInsurance.id : 'Básico (sin asignación)');
      return true;
    } catch (error) {
      console.error('🛡️ [INSURANCE] ❌ ERROR saving insurance assignments:', error);
      this.errorMsg =
        'Error al guardar las asignaciones de seguro. Por favor, inténtalo de nuevo.';
      this.isSaving = false;
      console.log('🛡️ [INSURANCE] ❌ Guardado falló, retornando false');
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
