import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
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
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { DepartureService } from '../../../core/services/departure/departure.service';

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
  @Input() Days!: number;
  @Input() isATC: boolean = false;
  departureDate: string = '';
  isEditingBlocked: boolean = false;

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
  
  // Array para almacenar los campos configurados para este departure (igual que checkout)
  departureReservationFields: IDepartureReservationFieldResponse[] = [];

  constructor(
    private fb: FormBuilder,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerFieldService: ReservationTravelerFieldService,
    private reservationFieldService: ReservationFieldService,
    private departureReservationFieldService: DepartureReservationFieldService,
    private departureService: DepartureService
  ) {}

  ngOnInit(): void {
    // Cargar todos los campos disponibles y obligatorios antes de cargar pasajeros
    this.loadAllFieldsConfiguration();
    if (this.periodId) {
      this.loadDepartureData(parseInt(this.periodId));
    }
  }

  // Método para cargar datos del departure
private loadDepartureData(departureId: number): void {
  this.departureService.getById(departureId).subscribe({
    next: (departure) => {
      if (departure && departure.departureDate) {
        this.departureDate = departure.departureDate;
        
        const departureDate = new Date(this.departureDate);
        const today = new Date();
        
        departureDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        const diffTime = departureDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Si es ATC, permitir edición siempre. Si no es ATC, bloquear cuando faltan 40 días o menos
        this.isEditingBlocked = !this.isATC && diffDays <= this.Days;
        
      }
    },
    error: (error) => {
    }
  });
}

  /**
   * Carga la configuración completa de campos (igual que checkout)
   */
  private loadAllFieldsConfiguration(): void {
    const departureId = this.periodId ? parseInt(this.periodId) : null;

    // Cargar campos obligatorios y campos disponibles en paralelo
    forkJoin({
      mandatoryFields: departureId 
        ? this.departureReservationFieldService.getByDeparture(departureId).pipe(
            catchError(() => of([]))
          )
        : of([]),
      availableFields: this.reservationFieldService.getAllOrdered().pipe(
        catchError(() => of([]))
      )
    }).subscribe({
      next: ({ mandatoryFields, availableFields }: { mandatoryFields: IDepartureReservationFieldResponse[], availableFields: IReservationFieldResponse[] }) => {
        this.mandatoryFields = mandatoryFields;
        this.departureReservationFields = mandatoryFields;
        this.availableFields = availableFields;
        
        // Una vez cargados los campos, cargar los datos de pasajeros
        if (this.reservationId) {
          this.loadPassengerData();
        }
      },
      error: (error) => {
        // Continuar cargando pasajeros aunque falle la configuración
        if (this.reservationId) {
          this.loadPassengerData();
        }
      }
    });
  }

  /**
   * Carga los campos obligatorios para el departure (LEGACY - ya no se usa)
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

    // Obtener los viajeros de la reserva
    this.reservationTravelerService.getByReservation(this.reservationId).subscribe({
      next: (travelers) => {
        if (travelers.length === 0) {
          this.loading = false;
          return;
        }

        // Para cada viajero, obtener sus campos
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
          
          return of(emptyPassenger);
        }

        // Obtener los detalles de los campos
        const fieldObservables = fieldIds.map(fieldId => 
          this.reservationFieldService.getById(fieldId)
        );

        return forkJoin(fieldObservables).pipe(
          map((fields: IReservationFieldResponse[]) => {
            
            // NO sobrescribir availableFields - ya se cargaron todos en loadAllFieldsConfiguration()
            
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
              } else if (normalizedCode === 'dni' || normalizedCode === 'national_id') {
                passengerData.dni = field.value;  // ✅ Código en BD: national_id, propiedad en passenger: dni
              } else if (normalizedCode === 'room' || normalizedCode === 'habitacion') {
                passengerData.room = field.value;
              } else if (normalizedCode === 'ciudad' || normalizedCode === 'city') {
                passengerData.ciudad = field.value;
              } else if (normalizedCode === 'codigopostal' || normalizedCode === 'postal_code' || normalizedCode === 'codigo_postal') {
                passengerData.codigoPostal = field.value;
              } else if (normalizedCode === 'minoridissuedate' || normalizedCode === 'minor_id_issue_date') {
                passengerData.minorIdIssueDate = field.value;
              } else if (normalizedCode === 'minoridexpirationdate' || normalizedCode === 'minor_id_expiration_date') {
                passengerData.minorIdExpirationDate = field.value;
              } else if (normalizedCode === 'documentexpeditiondate' || normalizedCode === 'document_expedition_date') {
                passengerData.documentExpeditionDate = field.value;
              } else if (normalizedCode === 'documentexpirationdate' || normalizedCode === 'document_expiration_date') {
                passengerData.documentExpirationDate = field.value;
              } else if (normalizedCode === 'comfortplan' || normalizedCode === 'comfort_plan') {
                passengerData.comfortPlan = field.value;
              } else if (normalizedCode === 'phoneprefix' || normalizedCode === 'phone_prefix' || normalizedCode === 'prefijo' || normalizedCode === 'prefix') {
                passengerData.prefijo = field.value;
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
                }
              }
            });

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
   * Obtener detalles del campo de reservación (igual que checkout)
   */
  getReservationFieldDetails(reservationFieldId: number): IReservationFieldResponse | null {
    return this.availableFields.find((field) => field.id === reservationFieldId) || null;
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
   * Formatea la fecha al formato dd/mm/yyyy
   */
  formatDate(date: string | Date): string {
    if (!date) return '';

    // Si ya es un Date object, convertir a dd/mm/yyyy
    if (date instanceof Date) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Si es string
    const dateStr = date as string;
    
    // Si la fecha ya está en formato dd/mm/yyyy
    if (dateStr.includes('/')) {
      return dateStr;
    }

    // Si la fecha está en formato yyyy-mm-dd
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return dateStr;
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
          
          // ⭐ IMPORTANTE: Formatear el valor según el tipo de campo de BD
          let formattedValue = value;
          
          // Usar el tipo de campo de la BD para determinar si es fecha
          if (this.isDateFieldByType(field) && value) {
            formattedValue = this.formatDate(value);
          }
          
          if (existingField) {
            // Actualizar campo existente
            const updateData: ReservationTravelerFieldUpdate = {
              id: existingField.id,
              reservationTravelerId: travelerId,
              reservationFieldId: field.id,
              value: formattedValue.toString()
            };
            fieldUpdates.push(updateData);
          } else {
            // Crear nuevo campo
            const createData: ReservationTravelerFieldCreate = {
              id: 0,
              reservationTravelerId: travelerId,
              reservationFieldId: field.id,
              value: formattedValue.toString()
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
   * Verifica si un campo es de tipo fecha usando la propiedad fieldType de BD
   */
  private isDateFieldByType(field: IReservationFieldResponse): boolean {
    // Usar la propiedad fieldType que viene de la BD
    const normalizedFieldType = field.fieldType.toLowerCase();
    return normalizedFieldType === 'date' || normalizedFieldType === 'datetime';
  }

  /**
   * Mapea los datos del pasajero a códigos de campo
   * IMPORTANTE: Los códigos deben coincidir exactamente con los de la BD
   */
  private getFieldMappings(passenger: PassengerData): { [key: string]: any } {
    return {
      'name': passenger.name,
      'surname': passenger.surname,
      'email': passenger.email,
      'phone': passenger.phone,
      'sex': passenger.gender,
      'birthdate': passenger.birthDate,
      'document_type': passenger.documentType,
      'passport': passenger.passportID,
      'nationality': passenger.nationality,
      'room': passenger.room,
      'national_id': passenger.dni,  // ✅ Código en BD: national_id, propiedad en passenger: dni
      'ciudad': passenger.ciudad,
      'codigoPostal': passenger.codigoPostal,
      'minorIdIssueDate': passenger.minorIdIssueDate,
      'minorIdExpirationDate': passenger.minorIdExpirationDate,
      'documentExpeditionDate': passenger.documentExpeditionDate,
      'documentExpirationDate': passenger.documentExpirationDate,
      'comfortPlan': passenger.comfortPlan,
      'phonePrefix': passenger.prefijo  // ✅ Código en BD: phonePrefix
    };
  }
}