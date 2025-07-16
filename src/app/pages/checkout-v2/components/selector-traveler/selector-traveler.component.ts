import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { DepartureService } from '../../../../core/services/departure/departure.service';
import { ReservationService } from '../../../../core/services/reservation/reservation.service';
import { ReservationTravelerService, IReservationTravelerResponse } from '../../../../core/services/reservation/reservation-traveler.service';
import { DeparturePriceSupplementService, IDeparturePriceSupplementResponse } from '../../../../core/services/departure/departure-price-supplement.service';
import { AgeGroupService, IAgeGroupResponse } from '../../../../core/services/agegroup/age-group.service';

@Component({
  selector: 'app-selector-traveler',
  standalone: false,
  templateUrl: './selector-traveler.component.html',
  styleUrl: './selector-traveler.component.scss'
})
export class SelectorTravelerComponent implements OnInit, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() availableTravelers: string[] = ['Adultos', 'Niños', 'Bebés'];
  
  // Emitir cambios en el número de viajeros para el componente de habitaciones
  @Output() travelersNumbersChange = new EventEmitter<{ adults: number; childs: number; babies: number }>();

  travelersNumbers: { adults: number; childs: number; babies: number } = {
    adults: 1,
    childs: 0,
    babies: 0,
  };

  // NUEVO: Números originales de la reserva (solo lectura)
  originalTravelersNumbers: { adults: number; childs: number; babies: number } = {
    adults: 1,
    childs: 0,
    babies: 0,
  };

  adultsErrorMsg = '';
  loading: boolean = false;
  error: string | null = null;

  // Datos del departure y travelers
  departureData: any = null;
  reservationData: any = null; // NUEVO: Para guardar datos de la reserva
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
      this.loadReservationData(); // NUEVO: Cargar datos de la reserva
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Detectar cambios en departureId
    if (changes['departureId'] && changes['departureId'].currentValue) {
      console.log('🔄 DepartureId recibido:', this.departureId);
      this.loadDepartureData();
      this.loadDeparturePriceSupplements();
    }

    // Detectar cambios en reservationId
    if (changes['reservationId'] && changes['reservationId'].currentValue) {
      console.log('🔄 ReservationId recibido:', this.reservationId);
      this.loadExistingTravelers();
      this.loadReservationData(); // NUEVO: Cargar datos de la reserva
    }
  }

  // NUEVO: Método para cargar datos de la reserva
  private loadReservationData(): void {
    if (!this.reservationId) {
      console.warn('⚠️ No se proporcionó reservationId para cargar datos de reserva');
      return;
    }

    console.log('🔄 Cargando datos de la reserva ID:', this.reservationId);

    this.reservationService.getById(this.reservationId).subscribe({
      next: (reservation) => {
        console.log('✅ Datos de la reserva cargados:', reservation);
        this.reservationData = reservation;
      },
      error: (error) => {
        console.error('❌ Error al cargar los datos de la reserva:', error);
      }
    });
  }

  private loadDeparturePriceSupplements(): void {
    if (!this.departureId) {
      console.warn('⚠️ No se proporcionó departureId para cargar price supplements');
      return;
    }

    this.loadingSupplements = true;
    this.supplementsError = null;

    console.log('🔄 Cargando departure price supplements para departure ID:', this.departureId);

    this.departurePriceSupplementService.getByDeparture(this.departureId).subscribe({
      next: (supplements) => {
        console.log('✅ Departure price supplements cargados:', supplements);
        this.departurePriceSupplements = supplements || [];
        this.loadingSupplements = false;
        this.loadAgeGroupsFromSupplements();
      },
      error: (error) => {
        console.error('❌ Error al cargar departure price supplements:', error);
        this.supplementsError = 'Error al cargar los suplementos de precio del viaje.';
        this.loadingSupplements = false;
      }
    });
  }

  private loadAgeGroupsFromSupplements(): void {
    if (!this.departurePriceSupplements || this.departurePriceSupplements.length === 0) {
      console.warn('⚠️ No hay suplementos para cargar grupos de edad');
      return;
    }

    this.loadingAgeGroups = true;
    this.ageGroupsError = null;

    // Obtener IDs únicos de grupos de edad
    const uniqueAgeGroupIds = [...new Set(this.departurePriceSupplements.map(s => s.ageGroupId))];
    console.log('🔄 Cargando grupos de edad para IDs:', uniqueAgeGroupIds);

    const ageGroupRequests = uniqueAgeGroupIds.map(id => this.ageGroupService.getById(id));

    // Usar forkJoin para cargar todos los grupos de edad en paralelo
    import('rxjs').then(rxjs => {
      rxjs.forkJoin(ageGroupRequests).subscribe({
        next: (ageGroups) => {
          console.log('✅ Grupos de edad cargados:', ageGroups);
          this.ageGroups = ageGroups;
          this.updateAvailableTravelersFromAgeGroups();
          this.loadingAgeGroups = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar grupos de edad:', error);
          this.ageGroupsError = 'Error al cargar la información de grupos de edad.';
          this.loadingAgeGroups = false;
          this.dynamicAvailableTravelers = this.availableTravelers;
        }
      });
    });
  }

  private updateAvailableTravelersFromAgeGroups(): void {
    if (!this.ageGroups || this.ageGroups.length === 0) {
      this.dynamicAvailableTravelers = this.availableTravelers;
      return;
    }

    const travelers: string[] = [];
    
    this.ageGroups.forEach(ageGroup => {
      const name = ageGroup.name.toLowerCase();
      
      console.log('🔍 Procesando grupo de edad:', ageGroup.name, 'con límites:', ageGroup.lowerLimitAge, '-', ageGroup.upperLimitAge);
      
      // Mapear nombres de grupos de edad a tipos de viajeros
      if (name.includes('adult') || name.includes('adulto') || ageGroup.lowerLimitAge >= 12) {
        if (!travelers.includes('Adultos')) {
          travelers.push('Adultos');
        }
      } else if (name.includes('child') || name.includes('niño') || name.includes('menor') || 
                (ageGroup.lowerLimitAge >= 3 && ageGroup.upperLimitAge <= 11)) {
        if (!travelers.includes('Niños')) {
          travelers.push('Niños');
        }
      } else if (name.includes('baby') || name.includes('bebé') || name.includes('infant') || 
                ageGroup.upperLimitAge <= 2) {
        if (!travelers.includes('Bebés')) {
          travelers.push('Bebés');
        }
      }
    });

    // Si no se pudo mapear ningún grupo, usar todos por defecto
    if (travelers.length === 0) {
      console.warn('⚠️ No se pudieron mapear grupos de edad, usando valores por defecto');
      this.dynamicAvailableTravelers = this.availableTravelers;
    } else {
      this.dynamicAvailableTravelers = travelers;
      console.log('✅ Tipos de viajeros disponibles actualizados:', this.dynamicAvailableTravelers);
    }
  }

  private loadExistingTravelers(): void {
    if (!this.reservationId) {
      console.warn('⚠️ No se proporcionó reservationId');
      return;
    }

    this.loading = true;
    console.log('🔄 Cargando travelers existentes para reservation ID:', this.reservationId);

    this.reservationTravelerService.getByReservationOrdered(this.reservationId).subscribe({
      next: (travelers) => {
        console.log('✅ Travelers existentes cargados:', travelers);
        this.existingTravelers = travelers;
        this.totalExistingTravelers = travelers.length;
        this.updateTravelersFromExisting(travelers);
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar los travelers existentes:', error);
        this.error = 'Error al cargar la información de viajeros. Usando valores por defecto.';
        this.loading = false;
      }
    });
  }

  private updateTravelersFromExisting(travelers: IReservationTravelerResponse[]): void {
    // Actualizar números originales basándose en los existentes
    this.originalTravelersNumbers = {
      adults: Math.max(1, travelers.length), // Al menos 1 adulto
      childs: 0,
      babies: 0
    };

    // CAMBIO IMPORTANTE: Inicializar travelersNumbers con los originales
    this.travelersNumbers = { ...this.originalTravelersNumbers };

    // Emitir los números originales al componente de habitaciones
    this.travelersNumbersChange.emit(this.travelersNumbers);

    console.log('🔄 Números de travelers originales:', this.originalTravelersNumbers);
    console.log('🔄 Números de travelers actuales:', this.travelersNumbers);
  }

  private loadDepartureData(): void {
    if (!this.departureId) {
      console.warn('⚠️ No se proporcionó departureId');
      return;
    }

    this.loading = true;
    this.error = null;

    console.log('🔄 Cargando datos del departure ID:', this.departureId);

    this.departureService.getById(this.departureId).subscribe({
      next: (departure) => {
        console.log('✅ Datos del departure cargados:', departure);
        this.departureData = departure;
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar los datos del departure:', error);
        this.error = 'Error al cargar la información del viaje. Usando valores por defecto.';
        this.loading = false;
      }
    });
  }

  handlePassengers(value: number, type: 'adults' | 'childs' | 'babies'): void {
    this.travelersNumbers[type] = value;
    
    // Validar que haya suficientes adultos para los menores
    if (this.travelersNumbers.adults < this.travelersNumbers.childs + this.travelersNumbers.babies) {
      this.adultsErrorMsg = 'La cantidad de niños y bebés debe ser menor o igual a la de adultos.';
    } else {
      this.adultsErrorMsg = '';
    }

    console.log('👥 Pasajeros actualizados:', this.travelersNumbers);
    console.log('📊 Total de pasajeros:', this.totalPassengers);
    console.log('🗃️ Travelers originales:', this.originalTravelersNumbers);
    console.log('🗃️ Travelers existentes en BD:', this.totalExistingTravelers);

    // Emitir cambios para el componente de habitaciones
    this.travelersNumbersChange.emit(this.travelersNumbers);

    // CAMBIO IMPORTANTE: NO sincronizar automáticamente con la reservación
    // Solo actualizar la UI y las habitaciones, la BD se actualiza cuando se confirme
    // this.syncTravelersWithReservation();
  }

  private syncTravelersWithReservation(): void {
    const newTotal = this.totalPassengers;
    const currentTotal = this.totalExistingTravelers;

    console.log('🔄 Sincronizando travelers con reservación:');
    console.log('  - Nuevo total:', newTotal);
    console.log('  - Total actual en BD:', currentTotal);

    if (newTotal > currentTotal) {
      // Necesitamos crear más travelers
      const travelersToCreate = newTotal - currentTotal;
      console.log('➕ Necesario crear', travelersToCreate, 'travelers adicionales');
      this.createAdditionalTravelers(travelersToCreate);
    } else if (newTotal < currentTotal) {
      // Necesitamos eliminar travelers
      const travelersToRemove = currentTotal - newTotal;
      console.log('➖ Necesario eliminar', travelersToRemove, 'travelers');
      this.removeExcessTravelers(travelersToRemove);
    } else {
      console.log('✅ No se requieren cambios en la cantidad de travelers');
    }
  }

  private createAdditionalTravelers(count: number): void {
    if (!this.reservationId) return;

    console.log('➕ Creando', count, 'travelers adicionales');

    // Calcular el siguiente número de traveler
    const nextTravelerNumber = this.existingTravelers.length + 1;

    for (let i = 0; i < count; i++) {
      const newTravelerNumber = nextTravelerNumber + i;
      
      this.reservationTravelerService.createWithAutoTravelerNumber(
        this.reservationId,
        false, // No es lead traveler por defecto
        '' // tkId vacío por ahora
      ).subscribe({
        next: (newTraveler) => {
          console.log('✅ Traveler creado:', newTraveler);
          
          // IMPORTANTE: Actualizar el travelerNumber al correcto
          if (newTraveler.travelerNumber !== newTravelerNumber) {
            console.log(`🔄 Corrigiendo travelerNumber de ${newTraveler.travelerNumber} a ${newTravelerNumber}`);
            
            this.reservationTravelerService.update(newTraveler.id, {
              ...newTraveler,
              travelerNumber: newTravelerNumber
            }).subscribe({
              next: (success) => {
                if (success) {
                  newTraveler.travelerNumber = newTravelerNumber;
                  console.log(`✅ TravelerNumber actualizado a ${newTravelerNumber}`);
                }
              },
              error: (error) => {
                console.error('❌ Error al actualizar travelerNumber:', error);
              }
            });
          }
          
          this.existingTravelers.push(newTraveler);
          this.totalExistingTravelers = this.existingTravelers.length;
          
          // Reordenar travelers por número
          this.existingTravelers.sort((a, b) => a.travelerNumber - b.travelerNumber);
          
          // Actualizar la reserva con el nuevo total
          this.updateReservationTotalPassengers();
        },
        error: (error) => {
          console.error('❌ Error al crear traveler:', error);
        }
      });
    }
  }

  private removeExcessTravelers(count: number): void {
    console.log('➖ Eliminando', count, 'travelers excedentes');

    // Eliminar los últimos travelers (excepto el lead traveler si existe)
    const travelersToRemove = this.existingTravelers
      .filter(t => !t.isLeadTraveler)
      .slice(-count);

    travelersToRemove.forEach(traveler => {
      this.reservationTravelerService.delete(traveler.id).subscribe({
        next: (success) => {
          if (success) {
            console.log('✅ Traveler eliminado:', traveler.id);
            this.existingTravelers = this.existingTravelers.filter(t => t.id !== traveler.id);
            this.totalExistingTravelers = this.existingTravelers.length;
            
            // Actualizar la reserva con el nuevo total
            this.updateReservationTotalPassengers();
          }
        },
        error: (error) => {
          console.error('❌ Error al eliminar traveler:', error);
        }
      });
    });
  }

  // NUEVO: Método para actualizar el total de pasajeros en la reserva
  private updateReservationTotalPassengers(): void {
    if (!this.reservationId || !this.reservationData) {
      console.warn('⚠️ No hay reservationId o datos de reserva para actualizar');
      return;
    }

    const newTotal = this.totalPassengers;
    
    console.log('🔄 Actualizando reserva con total de pasajeros:', newTotal);
    console.log('📋 Total anterior:', this.reservationData.totalPassengers);
    
    // Crear objeto de actualización con todos los campos requeridos
    const updateData = {
      ...this.reservationData,
      totalPassengers: newTotal,
      updatedAt: new Date().toISOString()
    };

    this.reservationService.update(this.reservationId, updateData).subscribe({
      next: (success) => {
        if (success) {
          console.log('✅ Reserva actualizada exitosamente');
          console.log(`📊 Total pasajeros: ${this.reservationData.totalPassengers} → ${newTotal}`);
          
          // Actualizar datos locales
          this.reservationData.totalPassengers = newTotal;
        } else {
          console.error('❌ No se pudo actualizar la reserva');
        }
      },
      error: (error) => {
        console.error('❌ Error al actualizar la reserva:', error);
      }
    });
  }

  // Getter para obtener el total de pasajeros
  get totalPassengers(): number {
    return this.travelersNumbers.adults + this.travelersNumbers.childs + this.travelersNumbers.babies;
  }

  // NUEVO: Método para guardar cambios en la base de datos
  saveTravelersChanges(): void {
    console.log('💾 Guardando cambios de travelers en la BD...');
    this.syncTravelersWithReservation();
  }

  // NUEVO: Método para resetear a los números originales
  resetTravelersNumbers(): void {
    console.log('🔄 Reseteando travelers a números originales...');
    this.travelersNumbers = { ...this.originalTravelersNumbers };
    this.travelersNumbersChange.emit(this.travelersNumbers);
  }

  // NUEVO: Verificar si hay cambios pendientes
  get hasUnsavedChanges(): boolean {
    return JSON.stringify(this.travelersNumbers) !== JSON.stringify(this.originalTravelersNumbers);
  }
}