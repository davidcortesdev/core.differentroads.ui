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
      this.loadDepartureData();
      this.loadDeparturePriceSupplements();
    }

    // Detectar cambios en reservationId
    if (changes['reservationId'] && changes['reservationId'].currentValue) {
      this.loadExistingTravelers();
      this.loadReservationData(); // NUEVO: Cargar datos de la reserva
    }
  }

  // NUEVO: Método para cargar datos de la reserva
  private loadReservationData(): void {
    if (!this.reservationId) {
      return;
    }

    this.reservationService.getById(this.reservationId).subscribe({
      next: (reservation) => {
        this.reservationData = reservation;
      },
      error: (error) => {
        // Error al cargar los datos de la reserva
      }
    });
  }

  private loadDeparturePriceSupplements(): void {
    if (!this.departureId) {
      return;
    }

    this.loadingSupplements = true;
    this.supplementsError = null;

    this.departurePriceSupplementService.getByDeparture(this.departureId).subscribe({
      next: (supplements) => {
        this.departurePriceSupplements = supplements || [];
        this.loadingSupplements = false;
        this.loadAgeGroupsFromSupplements();
      },
      error: (error) => {
        this.supplementsError = 'Error al cargar los suplementos de precio del viaje.';
        this.loadingSupplements = false;
      }
    });
  }

  private loadAgeGroupsFromSupplements(): void {
    if (!this.departurePriceSupplements || this.departurePriceSupplements.length === 0) {
      return;
    }

    this.loadingAgeGroups = true;
    this.ageGroupsError = null;

    // Obtener IDs únicos de grupos de edad
    const uniqueAgeGroupIds = [...new Set(this.departurePriceSupplements.map(s => s.ageGroupId))];

    const ageGroupRequests = uniqueAgeGroupIds.map(id => this.ageGroupService.getById(id));

    // Usar forkJoin para cargar todos los grupos de edad en paralelo
    import('rxjs').then(rxjs => {
      rxjs.forkJoin(ageGroupRequests).subscribe({
        next: (ageGroups) => {
          this.ageGroups = ageGroups;
          this.updateAvailableTravelersFromAgeGroups();
          this.loadingAgeGroups = false;
        },
        error: (error) => {
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

    this.reservationTravelerService.getByReservationOrdered(this.reservationId).subscribe({
      next: (travelers) => {
        this.existingTravelers = travelers;
        this.totalExistingTravelers = travelers.length;
        this.updateTravelersFromExisting(travelers);
        this.loading = false;
      },
      error: (error) => {
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

    // Emitir cambios para el componente de habitaciones
    this.travelersNumbersChange.emit(this.travelersNumbers);

    // CAMBIO IMPORTANTE: NO sincronizar automáticamente con la reservación
    // Solo actualizar la UI y las habitaciones, la BD se actualiza cuando se confirme
    // this.syncTravelersWithReservation();
  }

  private syncTravelersWithReservation(): void {
    const newTotal = this.totalPassengers;
    const currentTotal = this.totalExistingTravelers;

    if (newTotal > currentTotal) {
      // Necesitamos crear más travelers
      const travelersToCreate = newTotal - currentTotal;
      this.createAdditionalTravelers(travelersToCreate);
    } else if (newTotal < currentTotal) {
      // Necesitamos eliminar travelers
      const travelersToRemove = currentTotal - newTotal;
      this.removeExcessTravelers(travelersToRemove);
    }
  }

  private createAdditionalTravelers(count: number): void {
    if (!this.reservationId) return;

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
          // IMPORTANTE: Actualizar el travelerNumber al correcto
          if (newTraveler.travelerNumber !== newTravelerNumber) {
            this.reservationTravelerService.update(newTraveler.id, {
              ...newTraveler,
              travelerNumber: newTravelerNumber
            }).subscribe({
              next: (success) => {
                if (success) {
                  newTraveler.travelerNumber = newTravelerNumber;
                }
              },
              error: (error) => {
                // Error al actualizar travelerNumber
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
          // Error al crear traveler
        }
      });
    }
  }

  private removeExcessTravelers(count: number): void {
    // Eliminar los últimos travelers (excepto el lead traveler si existe)
    const travelersToRemove = this.existingTravelers
      .filter(t => !t.isLeadTraveler)
      .slice(-count);

    travelersToRemove.forEach(traveler => {
      this.reservationTravelerService.delete(traveler.id).subscribe({
        next: (success) => {
          if (success) {
            this.existingTravelers = this.existingTravelers.filter(t => t.id !== traveler.id);
            this.totalExistingTravelers = this.existingTravelers.length;
            
            // Actualizar la reserva con el nuevo total
            this.updateReservationTotalPassengers();
          }
        },
        error: (error) => {
          // Error al eliminar traveler
        }
      });
    });
  }

  // NUEVO: Método para actualizar el total de pasajeros en la reserva
  private updateReservationTotalPassengers(): void {
    if (!this.reservationId || !this.reservationData) {
      return;
    }

    const newTotal = this.totalPassengers;
    
    // Crear objeto de actualización con todos los campos requeridos
    const updateData = {
      ...this.reservationData,
      totalPassengers: newTotal,
      updatedAt: new Date().toISOString()
    };

    this.reservationService.update(this.reservationId, updateData).subscribe({
      next: (success) => {
        if (success) {
          // Actualizar datos locales
          this.reservationData.totalPassengers = newTotal;
        }
      },
      error: (error) => {
        // Error al actualizar la reserva
      }
    });
  }

  // Getter para obtener el total de pasajeros
  get totalPassengers(): number {
    return this.travelersNumbers.adults + this.travelersNumbers.childs + this.travelersNumbers.babies;
  }

  // NUEVO: Método para guardar cambios en la base de datos
  saveTravelersChanges(): void {
    this.syncTravelersWithReservation();
  }

  // NUEVO: Método para resetear a los números originales
  resetTravelersNumbers(): void {
    this.travelersNumbers = { ...this.originalTravelersNumbers };
    this.travelersNumbersChange.emit(this.travelersNumbers);
  }

  // NUEVO: Verificar si hay cambios pendientes
  get hasUnsavedChanges(): boolean {
    return JSON.stringify(this.travelersNumbers) !== JSON.stringify(this.originalTravelersNumbers);
  }
}