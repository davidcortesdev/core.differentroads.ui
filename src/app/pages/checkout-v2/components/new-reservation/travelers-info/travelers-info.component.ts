// travelers-info.component.ts
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

// Importaciones de servicios
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerFieldService,
  IReservationTravelerFieldResponse,
} from '../../../../../core/services/reservation/reservation-traveler-field.service';
import {
  ReservationTravelerAccommodationService,
  IReservationTravelerAccommodationResponse,
} from '../../../../../core/services/reservation/reservation-traveler-accommodation.service';
import {
  DepartureAccommodationTypeService,
  IDepartureAccommodationTypeResponse,
} from '../../../../../core/services/departure/departure-accommodation-type.service';
import {
  DepartureAccommodationService,
  IDepartureAccommodationResponse,
} from '../../../../../core/services/departure/departure-accommodation.service';

// Interfaces
interface TravelerWithFields extends IReservationTravelerResponse {
  fields: IReservationTravelerFieldResponse[];
  accommodations: IReservationTravelerAccommodationResponse[];
}

interface ProcessedTraveler {
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  room?: string;
}

interface AccommodationInfo {
  id: number;
  name: string;
  typeName: string;
}

// Mapeo de campos - solo los que se muestran en el ejemplo
const FIELD_MAPPING = {
  1: 'firstName', // Nombre
  13: 'lastName', // Apellidos
  11: 'email', // Email
  12: 'phone', // Teléfono
  4: 'gender', // Sexo
};

const GENDER_MAPPING: { [key: string]: string } = {
  male: 'Hombre',
  female: 'Mujer',
  M: 'Hombre',
  F: 'Mujer',
  h: 'Hombre',
  m: 'Mujer',
};

@Component({
  selector: 'app-travelers-info',
  standalone: false,
  templateUrl: './travelers-info.component.html',
  styleUrl: './travelers-info.component.scss',
})
export class TravelersInfoComponent implements OnInit, OnChanges {
  @Input() reservationId!: number;

  // Datos del componente
  travelers: ProcessedTraveler[] = [];
  loading: boolean = false;

  // Cache para nombres de acomodaciones
  private accommodationNamesCache: Map<number, AccommodationInfo> = new Map();

  constructor(
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerFieldService: ReservationTravelerFieldService,
    private reservationTravelerAccommodationService: ReservationTravelerAccommodationService,
    private departureAccommodationTypeService: DepartureAccommodationTypeService,
    private departureAccommodationService: DepartureAccommodationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationId']) {
      this.loadData();
    }
  }

  private loadData(): void {
    if (!this.reservationId) {
      console.warn('No reservation ID provided to travelers-info component');
      return;
    }

    this.loading = true;
    this.loadTravelers();
  }

  private loadTravelers(): void {
    console.log('Cargando travelers para reservation ID:', this.reservationId);

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          console.log('Travelers obtenidos:', travelers);
          this.loadTravelersFields(travelers);
        },
        error: (error) => {
          console.error('Error loading travelers:', error);
          this.loading = false;
        },
      });
  }

  private loadTravelersFields(travelers: IReservationTravelerResponse[]): void {
    if (travelers.length === 0) {
      this.loading = false;
      return;
    }

    // Preparar requests para campos y acomodaciones
    const travelerFieldRequests = travelers.map((traveler) =>
      this.reservationTravelerFieldService.getByReservationTraveler(traveler.id)
    );

    const travelerAccommodationRequests = travelers.map((traveler) =>
      this.reservationTravelerAccommodationService.getByReservationTraveler(
        traveler.id
      )
    );

    // Ejecutar ambos tipos de requests en paralelo
    forkJoin({
      fields: forkJoin(travelerFieldRequests),
      accommodations: forkJoin(travelerAccommodationRequests),
    }).subscribe({
      next: (results) => {
        console.log('Campos de todos los travelers:', results.fields);
        console.log(
          'Acomodaciones de todos los travelers:',
          results.accommodations
        );

        // Combinar travelers con sus campos y acomodaciones
        const travelersWithFields: TravelerWithFields[] = travelers.map(
          (traveler, index) => ({
            ...traveler,
            fields: results.fields[index],
            accommodations: results.accommodations[index],
          })
        );

        // Procesar datos para el template
        this.travelers = this.processTravelersData(travelersWithFields);
        console.log('Travelers procesados:', this.travelers);

        this.loading = false;

        // Refrescar nombres de acomodaciones después de cargar
        setTimeout(() => {
          this.refreshAccommodationInfo();
        }, 100);
      },
      error: (error) => {
        console.error('Error loading travelers data:', error);
        this.loading = false;
      },
    });
  }

  private processTravelersData(
    travelersWithFields: TravelerWithFields[]
  ): ProcessedTraveler[] {
    return travelersWithFields.map((traveler) => {
      const processed: any = {};
      let firstName = '';
      let lastName = '';

      // Procesar cada campo del traveler
      traveler.fields.forEach((field) => {
        const fieldMapping =
          FIELD_MAPPING[field.reservationFieldId as keyof typeof FIELD_MAPPING];

        if (fieldMapping) {
          if (fieldMapping === 'firstName') {
            firstName = field.value;
          } else if (fieldMapping === 'lastName') {
            lastName = field.value;
          } else if (fieldMapping === 'gender') {
            // Mapear el valor del género
            processed[fieldMapping] =
              GENDER_MAPPING[field.value] || field.value;
          } else {
            processed[fieldMapping] = field.value;
          }
        }
      });

      // Combinar nombre y apellido
      processed.name = `${firstName} ${lastName}`.trim();

      // Procesar acomodaciones para obtener información de room (async)
      this.setAccommodationInfo(traveler.accommodations, processed);

      return processed as ProcessedTraveler;
    });
  }

  /**
   * Establece la información de acomodación de forma asíncrona
   */
  private async setAccommodationInfo(
    accommodations: IReservationTravelerAccommodationResponse[],
    processed: any
  ): Promise<void> {
    if (!accommodations || accommodations.length === 0) {
      processed.room = undefined;
      return;
    }

    try {
      const roomName = await this.getAccommodationName(
        accommodations[0].departureAccommodationId
      );
      processed.room = roomName;
    } catch (error) {
      console.error('Error getting accommodation name:', error);
      processed.room = `Acomodación ID: ${accommodations[0].departureAccommodationId}`;
    }
  }

  /**
   * Obtiene el nombre descriptivo de una acomodación
   */
  private async getAccommodationName(
    departureAccommodationId: number
  ): Promise<string> {
    // Verificar cache primero
    if (this.accommodationNamesCache.has(departureAccommodationId)) {
      const cached = this.accommodationNamesCache.get(
        departureAccommodationId
      )!;
      return cached.name;
    }

    try {
      // Obtener la información de la acomodación
      const accommodation = await this.departureAccommodationService
        .getById(departureAccommodationId)
        .toPromise();

      if (!accommodation) {
        throw new Error('Accommodation not found');
      }

      // Obtener el tipo de acomodación
      const accommodationType = await this.departureAccommodationTypeService
        .getById(accommodation.accommodationTypeId)
        .toPromise();

      const accommodationInfo: AccommodationInfo = {
        id: departureAccommodationId,
        name: accommodation.name || 'Habitación sin nombre',
        typeName: accommodationType?.name || 'Tipo desconocido',
      };

      // Guardar en cache
      this.accommodationNamesCache.set(
        departureAccommodationId,
        accommodationInfo
      );

      return accommodationInfo.name;
    } catch (error) {
      console.error('Error fetching accommodation details:', error);
      return `Acomodación ID: ${departureAccommodationId}`;
    }
  }

  /**
   * Refresca la información de acomodaciones después de cargar los datos básicos
   */
  private async refreshAccommodationInfo(): Promise<void> {
    const updatePromises = this.travelers.map(async (traveler, index) => {
      const originalTraveler = this.travelers[index];
      if (
        originalTraveler &&
        typeof originalTraveler.room === 'string' &&
        originalTraveler.room.includes('ID:')
      ) {
        // Extraer el ID de la cadena "Acomodación ID: 123"
        const idMatch = originalTraveler.room.match(/ID:\s*(\d+)/);
        if (idMatch) {
          const accommodationId = parseInt(idMatch[1]);
          try {
            const roomName = await this.getAccommodationName(accommodationId);
            this.travelers[index].room = roomName;
          } catch (error) {
            console.error('Error updating accommodation name:', error);
          }
        }
      }
    });

    await Promise.all(updatePromises);
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return dateString; // Devolver el valor original si hay error
    }
  }

  get hasTravelers(): boolean {
    return this.travelers && this.travelers.length > 0;
  }
}
