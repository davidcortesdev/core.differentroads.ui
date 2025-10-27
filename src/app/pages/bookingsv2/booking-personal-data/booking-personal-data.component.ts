import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { PassengerData } from '../passengerData';
import { 
  ReservationTravelerService, 
  IReservationTravelerResponse 
} from '../../../core/services/reservation/reservation-traveler.service';
import { 
  ReservationTravelerFieldService, 
  IReservationTravelerFieldResponse 
} from '../../../core/services/reservation/reservation-traveler-field.service';
import { 
  ReservationFieldService, 
  IReservationFieldResponse 
} from '../../../core/services/reservation/reservation-field.service';
import { 
  DepartureReservationFieldService,
  IDepartureReservationFieldResponse 
} from '../../../core/services/departure/departure-reservation-field.service';
import { 
  ReservationTravelerFieldCreate,
  ReservationTravelerFieldUpdate 
} from '../../../core/services/reservation/reservation-traveler-field.service';
import { CheckoutUserDataService } from '../../../core/services/v2/checkout-user-data.service';
import { PersonalInfo } from '../../../core/models/v2/profile-v2.model';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-booking-personal-data-v2',
  templateUrl: './booking-personal-data.component.html',
  styleUrls: ['./booking-personal-data.component.scss'],
  standalone: false,
})
export class BookingPersonalDataV2Component implements OnInit {
  @Input() reservationId!: number;
  @Input() bookingId!: string;
  @Input() periodId!: string;

  // Datos de pasajeros cargados desde los servicios
  passengers: PassengerData[] = [];
  loading: boolean = false;

  // Número máximo de pasajeros por fila
  maxPassengersPerRow: number = 3;

  // Array para almacenar los campos de reserva (sin usar ReservationFieldMandatory)
  reservationFields: {
    id: number;
    name: string;
    key: string;
    mandatory: boolean;
  }[] = [];

  // Array para almacenar los campos de reserva obtenidos del servicio
  availableFields: IReservationFieldResponse[] = [];

  // Array para almacenar los campos obligatorios por departure
  mandatoryFields: IDepartureReservationFieldResponse[] = [];
  
  // Información del perfil del usuario para rellenar campos vacíos
  currentUserData: PersonalInfo | null = null;

  constructor(
    private fb: FormBuilder,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerFieldService: ReservationTravelerFieldService,
    private reservationFieldService: ReservationFieldService,
    private departureReservationFieldService: DepartureReservationFieldService,
    private checkoutUserDataService: CheckoutUserDataService
  ) {}

  ngOnInit(): void {
    if (this.periodId) {
      this.loadMandatoryFields();
    }
    
    if (this.reservationId) {
      this.loadPassengerData();
    }
  }


  /**
   * Carga los campos obligatorios para el departure
   */
  loadMandatoryFields(): void {
    const departureId = parseInt(this.periodId);
    if (!departureId || isNaN(departureId)) {
      return;
    }

    this.departureReservationFieldService.getByDeparture(departureId).subscribe({
      next: (fields) => {
        this.mandatoryFields = fields;
      },
      error: (error) => {
        // Error loading mandatory fields - handled silently
      }
    });
  }

  /**
   * Carga los datos de los pasajeros desde los servicios
   */
  loadPassengerData(): void {
    this.loading = true;
    this.passengers = [];

    // Paso 0: Cargar datos del perfil del usuario si está autenticado
    const userDataObservable = this.checkoutUserDataService.getCurrentUserData().pipe(
      catchError((error) => {
        console.warn('No se pudieron cargar los datos del usuario:', error);
        return of(null);
      })
    );

    userDataObservable.subscribe({
      next: (userData) => {
        this.currentUserData = userData;
        
        // Paso 1: Obtener los viajeros de la reserva
        this.reservationTravelerService.getByReservation(this.reservationId).subscribe({
          next: (travelers) => {
            
            if (travelers.length === 0) {
              this.loading = false;
              return;
            }

            // Paso 2: Para cada viajero, obtener sus campos
            const travelerDataObservables = travelers.map((traveler, index) => 
              this.loadTravelerData(traveler, index)
            );

            forkJoin(travelerDataObservables).subscribe({
              next: (travelerDataList) => {
                this.passengers = travelerDataList.filter(data => data !== null) as PassengerData[];
                this.loading = false;
              },
              error: (error) => {
                this.loading = false;
              }
            });
          },
          error: (error) => {
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Carga los datos de un viajero específico
   */
  private loadTravelerData(traveler: IReservationTravelerResponse, passengerIndex: number): Observable<PassengerData | null> {
    // Obtener los campos del viajero
    return this.reservationTravelerFieldService.getByReservationTraveler(traveler.id).pipe(
      switchMap((travelerFields) => {
        
        // Obtener los IDs únicos de los campos para obtener sus nombres
        const fieldIds = travelerFields.length > 0 
          ? [...new Set(travelerFields.map(field => field.reservationFieldId))]
          : [];
        
        // Si no hay campos, devolver pasajero con datos vacíos
        if (fieldIds.length === 0) {
          const emptyPassenger: PassengerData = {
            id: traveler.id,
            name: '',
            surname: '',
            documentType: 'DNI',
            passportID: '',
            birthDate: '',
            email: '',
            phone: '',
            type: traveler.isLeadTraveler ? 'lead' : `passenger${passengerIndex + 1}`,
            _id: traveler.id.toString()
          };
          
          // Rellenar con datos del perfil si es lead traveler
          if (traveler.isLeadTraveler && this.currentUserData) {
            if (this.currentUserData.nombre) emptyPassenger.name = this.currentUserData.nombre;
            if (this.currentUserData.apellido) emptyPassenger.surname = this.currentUserData.apellido;
            if (this.currentUserData.email) emptyPassenger.email = this.currentUserData.email;
            if (this.currentUserData.telefono) emptyPassenger.phone = this.currentUserData.telefono;
            if (this.currentUserData.fechaNacimiento) emptyPassenger.birthDate = this.currentUserData.fechaNacimiento;
            if (this.currentUserData.sexo) emptyPassenger.gender = this.currentUserData.sexo;
          }
          
          return of(emptyPassenger);
        }

        // Obtener los detalles de los campos
        const fieldObservables = fieldIds.map(fieldId => 
          this.reservationFieldService.getById(fieldId)
        );

        return forkJoin(fieldObservables).pipe(
          map((fields: IReservationFieldResponse[]) => {
            
            // Almacenar los campos disponibles para uso posterior
            this.availableFields = [...this.availableFields, ...fields];
            
            // Crear un mapa de fieldId -> fieldName y fieldCode
            const fieldMap = new Map<number, {name: string, code: string}>();
            fields.forEach((field: IReservationFieldResponse) => {
              fieldMap.set(field.id, {name: field.name, code: field.code});
            });

            // Mapear los datos del viajero a PassengerData
            const passengerData: PassengerData = {
              id: traveler.id,
              name: '',
              surname: '',
              documentType: 'DNI',
              passportID: '',
              birthDate: '',
              email: '',
              phone: '',
              type: traveler.isLeadTraveler ? 'lead' : `passenger${passengerIndex + 1}`,
              _id: traveler.id.toString()
            };

            // Mapear los valores de los campos
            travelerFields.forEach(field => {
              const fieldInfo = fieldMap.get(field.reservationFieldId);
              if (!fieldInfo) return;
              
              const { name: fieldName, code: fieldCode } = fieldInfo;
              
              // Mapeo más robusto basado en código, nombre y ID
              const normalizedCode = fieldCode.toLowerCase();
              const normalizedName = fieldName.toLowerCase();
              
              // Mapeo por código
              if (normalizedCode === 'name' || normalizedCode === 'nombre') {
                passengerData.name = field.value;
              } else if (normalizedCode === 'surname' || normalizedCode === 'apellido' || normalizedCode === 'lastname') {
                passengerData.surname = field.value;
              } else if (normalizedCode === 'email' || normalizedCode === 'correo') {
                passengerData.email = field.value;
              } else if (normalizedCode === 'phone' || normalizedCode === 'telefono' || normalizedCode === 'telephone') {
                passengerData.phone = field.value;
              } else if (normalizedCode === 'birthdate' || normalizedCode === 'fecha_nacimiento' || normalizedCode === 'birth_date') {
                passengerData.birthDate = field.value;
              } else if (normalizedCode === 'gender' || normalizedCode === 'sexo' || normalizedCode === 'sex') {
                passengerData.gender = field.value;
              } else if (normalizedCode === 'document_type' || normalizedCode === 'tipo_documento') {
                passengerData.documentType = field.value;
              } else if (normalizedCode === 'passport' || normalizedCode === 'pasaporte' || normalizedCode === 'passport_id') {
                passengerData.passportID = field.value;
              } else if (normalizedCode === 'nationality' || normalizedCode === 'nacionalidad') {
                passengerData.nationality = field.value;
              } else {
                // Mapeo por nombre si el código no coincide
                if (normalizedName.includes('nombre') && !passengerData.name) {
                  passengerData.name = field.value;
                } else if (normalizedName.includes('apellido') && !passengerData.surname) {
                  passengerData.surname = field.value;
                } else if (normalizedName.includes('email') && !passengerData.email) {
                  passengerData.email = field.value;
                } else if (normalizedName.includes('teléfono') && !passengerData.phone) {
                  passengerData.phone = field.value;
                } else if (normalizedName.includes('nacimiento') && !passengerData.birthDate) {
                  passengerData.birthDate = field.value;
                } else if (normalizedName.includes('sexo') && !passengerData.gender) {
                  passengerData.gender = field.value;
                } else {
                }
              }
            });

            // Rellenar campos vacíos con datos del perfil del usuario (solo para el primer pasajero/lead traveler)
            if (traveler.isLeadTraveler && this.currentUserData) {
              if (!passengerData.name && this.currentUserData.nombre) {
                passengerData.name = this.currentUserData.nombre;
              }
              if (!passengerData.surname && this.currentUserData.apellido) {
                passengerData.surname = this.currentUserData.apellido;
              }
              if (!passengerData.email && this.currentUserData.email) {
                passengerData.email = this.currentUserData.email;
              }
              if (!passengerData.phone && this.currentUserData.telefono) {
                passengerData.phone = this.currentUserData.telefono;
              }
              if (!passengerData.birthDate && this.currentUserData.fechaNacimiento) {
                passengerData.birthDate = this.currentUserData.fechaNacimiento;
              }
              if (!passengerData.gender && this.currentUserData.sexo) {
                passengerData.gender = this.currentUserData.sexo;
              }
            }

            return passengerData;
          })
        );
      })
    );
  }

  /**
   * Obtiene el código del campo basado en su ID
   */
  private getFieldCode(fieldId: number, fields: IReservationFieldResponse[]): string {
    const field = fields.find(f => f.id === fieldId);
    return field ? field.code : '';
  }

  /**
   * Verifica si un campo es obligatorio para un viajero específico
   */
  isFieldMandatory(fieldId: number, isLeadTraveler: boolean): boolean {
    const mandatoryField = this.mandatoryFields.find(field => field.reservationFieldId === fieldId);
    
    if (!mandatoryField) {
      return false; // Campo no encontrado en reglas de obligatoriedad
    }

    // Tipo 1: Opcional (mandatoryTypeId === 1)
    if (mandatoryField.mandatoryTypeId === 1) {
      return false;
    }

    // Tipo 2: Siempre obligatorio (mandatoryTypeId === 2)
    if (mandatoryField.mandatoryTypeId === 2) {
      return true;
    }

    // Tipo 3: Obligatorio solo para lead traveler (mandatoryTypeId === 3)
    if (mandatoryField.mandatoryTypeId === 3) {
      return isLeadTraveler;
    }

    return false;
  }

  /**
   * Obtiene el tipo de obligatoriedad de un campo
   */
  getFieldMandatoryType(fieldId: number): number | null {
    const mandatoryField = this.mandatoryFields.find(field => field.reservationFieldId === fieldId);
    return mandatoryField ? mandatoryField.mandatoryTypeId : null;
  }

  /**
   * Devuelve pasajeros agrupados en filas de 3
   */
  get passengersInRows(): PassengerData[][] {
    const rows: PassengerData[][] = [];

    for (let i = 0; i < this.passengers.length; i += this.maxPassengersPerRow) {
      rows.push(this.passengers.slice(i, i + this.maxPassengersPerRow));
    }

    return rows;
  }

  /**
   * Formatea la fecha de nacimiento al formato dd/mm/yyyy
   */
  formatDate(date: string): string {
    if (!date) return '';

    // Si la fecha ya está en formato dd/mm/yyyy
    if (date.includes('/')) {
      return date;
    }

    // Si la fecha está en formato yyyy-mm-dd
    if (date.includes('-')) {
      const parts = date.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return date;
  }

  /**
   * Obtiene la etiqueta para el tipo de pasajero
   */
  getPassengerTypeLabel(type: string): string {
    const types: Record<string, string> = {
      adult: 'Adulto',
      child: 'Niño',
      infant: 'Bebé',
      senior: 'Senior',
    };

    return types[type.toLowerCase()] || type;
  }

  /**
   * Actualiza los datos del pasajero (basado en info-travelers)
   */
  updatePassenger(updatedPassenger: PassengerData): void {
    const index = this.passengers.findIndex(
      (p) => p._id === updatedPassenger._id
    );
    if (index !== -1) {
      this.passengers[index] = updatedPassenger;
      // Guardar los cambios en el backend
      this.savePassengerData(updatedPassenger);
    }
  }

  /**
   * Guarda los datos de un pasajero específico (basado en info-travelers)
   */
  async savePassengerData(passenger: PassengerData): Promise<void> {
    try {
      const travelerId = parseInt(passenger._id || passenger.id.toString());
      
      // Obtener los campos actuales del viajero
      const existingFields = await this.reservationTravelerFieldService
        .getByReservationTraveler(travelerId)
        .toPromise() || [];


      // Crear un mapa de campos existentes
      const existingFieldsMap = new Map<number, IReservationTravelerFieldResponse>();
      existingFields.forEach(field => {
        existingFieldsMap.set(field.reservationFieldId, field);
      });

      // Preparar datos para actualizar
      const fieldUpdates: ReservationTravelerFieldUpdate[] = [];
      const fieldCreates: ReservationTravelerFieldCreate[] = [];

      // Mapear los datos del pasajero a campos de reserva
      const fieldMappings = this.getFieldMappings(passenger);
      
      for (const [fieldCode, value] of Object.entries(fieldMappings)) {
        const field = this.availableFields.find(f => f.code === fieldCode);
        if (field && value) {
          const existingField = existingFieldsMap.get(field.id);
          
          if (existingField) {
            // Actualizar campo existente
            const updateData: ReservationTravelerFieldUpdate = {
              id: existingField.id,
              reservationTravelerId: travelerId,
              reservationFieldId: field.id,
              value: value.toString()
            };
            fieldUpdates.push(updateData);
          } else {
            // Crear nuevo campo
            const createData: ReservationTravelerFieldCreate = {
              id: 0, // Se asignará automáticamente
              reservationTravelerId: travelerId,
              reservationFieldId: field.id,
              value: value.toString()
            };
            fieldCreates.push(createData);
          }
        }
      }


      // Ejecutar actualizaciones
      const updatePromises = fieldUpdates.map(update => 
        this.reservationTravelerFieldService.update(update.id, update).toPromise()
      );
      
      const createPromises = fieldCreates.map(create => 
        this.reservationTravelerFieldService.create(create).toPromise()
      );

      await Promise.all([...updatePromises, ...createPromises]);


    } catch (error) {
      throw error;
    }
  }

  /**
   * Mapea los datos del pasajero a códigos de campo
   */
  private getFieldMappings(passenger: PassengerData): { [key: string]: any } {
    return {
      'name': passenger.name,
      'surname': passenger.surname,
      'email': passenger.email,
      'phone': passenger.phone,
      'gender': passenger.gender,
      'birthdate': passenger.birthDate,
      'document_type': passenger.documentType,
      'passport': passenger.passportID,
      'nationality': passenger.nationality
    };
  }
}
