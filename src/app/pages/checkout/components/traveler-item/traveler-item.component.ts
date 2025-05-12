import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  FormGroup,
  Validators,
  AbstractControl,
  ValidatorFn,
} from '@angular/forms';
import { Select } from 'primeng/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CountriesService } from '../../../../core/services/countries.service';
import { Country } from '../../../../shared/models/country.model';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { TravelersService } from '../../../../core/services/checkout/travelers.service';
import { MessageService } from 'primeng/api';
import { ReservationFieldMandatory } from '../../../../core/models/tours/period.model';

// Interfaces para mejorar la tipificación
export interface TravelerData {
  ageGroup: string;
  [key: string]: any;
}

export interface SelectOption {
  label: string;
  value: string;
}

export function futureDateValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selectedDate > today
      ? null
      : { futureDate: { value: control.value } };
  };
}

export function pastDateValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selectedDate < today ? null : { pastDate: { value: control.value } };
  };
}

const ALL_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'sexo',
  'phone',
  'documentType',
  'passport',
  'passportExpirationDate',
  'passportIssueDate',
  'dni',
  'minorIdExpirationDate',
  'minorIdIssueDate',
  'associatedAdult',
];

@Component({
  selector: 'app-traveler-item',
  standalone: false,
  templateUrl: './traveler-item.component.html',
  styleUrls: ['./traveler-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelerItemComponent implements OnInit, OnDestroy, OnChanges {
  @Input() form!: FormGroup;
  @Input() index!: number;
  @Input() traveler!: TravelerData;
  @Input() sexoOptions: SelectOption[] = [];
  @Input() getAdultsOptionsFn!: (index: number) => SelectOption[];
  @Input() allFieldsMandatory: boolean = false;
  @Input() reservationFields: {
    id: number;
    name: string;
    key: string;
    mandatory: ReservationFieldMandatory;
  }[] = [];
  @Input() isAmadeusFlightSelected: boolean = false;

  @ViewChild('sexoSelect') sexoSelect!: Select;

  travelerIds: { id: string | null; _id: string | null } = {
    id: null,
    _id: null,
  };
  travelerId: string | null = null;

  showMoreFields: boolean = false;
  private documentOptionsCache: { [key: string]: SelectOption[] } = {};
  private destroy$ = new Subject<void>();
  private reservationFieldMappings: { [key: string]: string } = {
    name: 'firstName',
    surname: 'lastName',
    sex: 'sexo',
    national_id: 'dni', // Cambiado de 'nationalId' a 'dni'
    birthdate: 'birthdate',
    passport: 'passport',
    passportexpiration: 'passportExpirationDate',
    passportissue: 'passportIssueDate',
    phone: 'phone',
  };
  private mandatoryFields: Set<string> = new Set();

  filteredCountries: Country[] = [];
  dateFormat: string = 'dd/mm/yy';

  constructor(
    private countriesService: CountriesService,
    private travelersService: TravelersService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeTravelerId();
    this.logTravelerIds();
    this.setupMandatoryFields();

    if (this.form) {
      this.form
        .get('ageGroup')
        ?.valueChanges.pipe(takeUntil(this.destroy$))
        .subscribe(() => this.clearDocumentOptionsCache());

      this.form
        .get('nationality')
        ?.valueChanges.pipe(takeUntil(this.destroy$))
        .subscribe(() => this.clearDocumentOptionsCache());

      this.updateValidators();

      if (!this.form.get('documentType')?.value) {
        this.form.get('documentType')?.setValue('passport');
      }
    }

    if (this.form && this.form.get('nationality')?.value) {
      const code = this.form.get('nationality')?.value;
      this.countriesService.getCountryByCode(code).subscribe((country) => {
        if (country) {
          this.form.get('nationality')?.setValue(country.code);
          this.filteredCountries = [country];
        }
      });
    }

    this.convertDateFields();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['allFieldsMandatory'] ||
      changes['reservationFields'] ||
      changes['isAmadeusFlightSelected']
    ) {
      this.setupMandatoryFields();
      this.updateValidators();

      if (this.allFieldsMandatory) {
        this.showMoreFields = true;
      }
    }

    if (changes['traveler']) {
      this.convertDateFields();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupMandatoryFields(): void {
    this.mandatoryFields.clear();

    // Importante: Eliminar esta línea que añade DNI como obligatorio siempre
    // this.mandatoryFields.add('dni');

    console.log('=== RESERVATION FIELDS DEBUG ===');
    console.log('All fields mandatory flag:', this.allFieldsMandatory);
    console.log('Is Amadeus flight selected:', this.isAmadeusFlightSelected);

    // Imprimir el enum para referencia
    console.log('ReservationFieldMandatory enum values:', {
      ALL: ReservationFieldMandatory.ALL,
      LEAD: ReservationFieldMandatory.LEAD,
      NONE: ReservationFieldMandatory.NONE,
    });

    if (this.reservationFields?.length) {
      console.log('Reservation fields received:');
      this.reservationFields.forEach((field, index) => {
        console.log(`Field ${index + 1}: ${field.name} (${field.key})`);
        console.log(`  - mandatory value: ${field.mandatory}`);
        console.log(
          `  - mapped to: ${
            this.reservationFieldMappings[field.key] || field.key
          }`
        );

        // Verificar si el mandatory coincide con los valores del enum
        if (field.mandatory === ReservationFieldMandatory.ALL) {
          console.log('  - This field is mandatory for ALL travelers');
        } else if (field.mandatory === ReservationFieldMandatory.LEAD) {
          console.log('  - This field is mandatory only for LEAD traveler');
        } else if (field.mandatory === ReservationFieldMandatory.NONE) {
          console.log('  - This field is NOT mandatory');
        } else {
          console.log(
            `  - WARNING: Unrecognized mandatory value: ${field.mandatory}`
          );
        }
      });
    } else {
      console.log('No reservation fields received');
    }

    // Ahora correctamente procesa los campos basados en su mandatory
    if (this.isAmadeusFlightSelected) {
      // Si es vuelo Amadeus, todos los campos son obligatorios
      ALL_FIELDS.forEach((field) => {
        this.mandatoryFields.add(field);
      });
    } else if (this.allFieldsMandatory) {
      // Si allFieldsMandatory está activado, todos los campos son obligatorios
      ALL_FIELDS.forEach((field) => {
        this.mandatoryFields.add(field);
      });
    } else if (this.reservationFields?.length) {
      // Procesar campos según sus valores mandatory
      this.reservationFields.forEach((field) => {
        const mappedKey = this.reservationFieldMappings[field.key] || field.key;
        if (mappedKey !== 'birthdate' && mappedKey !== 'nationality') {
          // Añadir lógica basada en el valor mandatory
          if (field.mandatory === ReservationFieldMandatory.ALL) {
            console.log(`Adding ${mappedKey} as mandatory for ALL travelers`);
            this.mandatoryFields.add(mappedKey);
          } else if (
            field.mandatory === ReservationFieldMandatory.LEAD &&
            this.index === 0
          ) {
            console.log(
              `Adding ${mappedKey} as mandatory for LEAD traveler (index 0)`
            );
            this.mandatoryFields.add(mappedKey);
          } else if (field.mandatory === ReservationFieldMandatory.NONE) {
            console.log(`Field ${mappedKey} is NOT mandatory`);
          }
        }
      });

      // Campos siempre obligatorios
      ['firstName', 'lastName', 'email'].forEach((field) => {
        this.mandatoryFields.add(field);
      });
    } else {
      // Caso base: solo nombre, apellido y email son obligatorios
      ['firstName', 'lastName', 'email'].forEach((field) => {
        this.mandatoryFields.add(field);
      });
    }

    console.log('Final mandatory fields:', Array.from(this.mandatoryFields));
    console.log('=== END DEBUG ===');
  }

  private updateValidators(): void {
    if (!this.form) return;

    console.log('Mandatory fields:', Array.from(this.mandatoryFields));

    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (!control) return;

      if (
        this.mandatoryFields.has(key) ||
        (key === 'associatedAdult' && this.traveler.ageGroup === 'Niños')
      ) {
        if (key === 'email') {
          control.setValidators([Validators.required, Validators.email]);
        } else if (key === 'passportExpirationDate') {
          control.setValidators([Validators.required, futureDateValidator()]);
        } else if (key === 'passportIssueDate') {
          control.setValidators([Validators.required, pastDateValidator()]);
        } else {
          control.setValidators([Validators.required]);
        }
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  isFieldRequired(fieldName: string): boolean {
    return this.mandatoryFields.has(fieldName);
  }

  toggleMoreFields(): void {
    this.showMoreFields = !this.showMoreFields;
  }

  private initializeTravelerId(): void {
    const currentTravelers = this.travelersService.getTravelers();

    if (currentTravelers[this.index]) {
      // Generar un nuevo ID si no existe
      if (!currentTravelers[this.index]._id) {
        currentTravelers[this.index]._id =
          this.travelersService.generateHexID();
        this.travelersService.updateTravelers(currentTravelers);
      }

      // Actualizar la propiedad para mostrar en el template
      this.travelerIds = {
        id: currentTravelers[this.index].id || null,
        _id: currentTravelers[this.index]._id || null,
      };
    }
  }

  private logTravelerIds(): void {
    const currentTraveler = this.travelersService.getTravelers()[this.index];
    console.groupCollapsed(`IDs del Viajero ${this.index + 1}`);
    console.log('ID:', currentTraveler?.id || 'No disponible');
    console.log('_ID:', currentTraveler?._id || 'No disponible');
    console.groupEnd();
    this.travelerId = currentTraveler?._id || null;
  }

  getTitlePasajero(num: string): string {
    return 'Pasajero ' + num;
  }

  getDocumentOptions(): SelectOption[] {
    const ageGroup = this.form.get('ageGroup')?.value || '';
    const nationality = this.form.get('nationality')?.value || '';
    const cacheKey = `${ageGroup}-${nationality}`;

    if (this.documentOptionsCache[cacheKey]) {
      return this.documentOptionsCache[cacheKey];
    }

    const options: SelectOption[] = [];

    if (ageGroup === 'Bebés') {
      options.push({ label: 'Libro de Familia', value: 'family-book' });
    }

    // Quitamos la condición de nacionalidad española para el DNI ya que ahora es obligatorio para todos
    options.push({ label: 'DNI', value: 'dni' });
    options.push({ label: 'Pasaporte', value: 'passport' });

    this.documentOptionsCache[cacheKey] = options;
    return options;
  }

  getAdultsOptions(): SelectOption[] {
    return this.getAdultsOptionsFn ? this.getAdultsOptionsFn(this.index) : [];
  }

  private clearDocumentOptionsCache(): void {
    this.documentOptionsCache = {};
  }

  /**
   * Filtra países basado en el término de búsqueda
   * @param event Evento de autocompletado
   */
  filterCountries(event: AutoCompleteCompleteEvent): void {
    const query = event.query;
    this.countriesService.searchCountries(query).subscribe((countries) => {
      this.filteredCountries = countries;
    });
  }

  /**
   * Maneja la selección de un país
   * @param country País seleccionado
   */
  onCountrySelect(country: any): void {
    console.log('Selected country:', country);

    if (this.form && country) {
      // No need to manually set the value, the autocomplete binding does this
      // Just make sure to clear the document options cache
      this.clearDocumentOptionsCache();
    }
  }

  /**
   * Función trackBy para mejorar rendimiento en listas ngFor
   */
  trackByFn(index: number, item: any): number {
    return index;
  }

  /**
   * Convierte los valores string de fecha a objetos Date para los datepickers
   */
  private convertDateFields(): void {
    if (!this.form) return;

    const dateFields = [
      'birthdate',
      'passportExpirationDate',
      'passportIssueDate',
      'minorIdExpirationDate',
      'minorIdIssueDate',
    ];

    dateFields.forEach((field) => {
      const control = this.form.get(field);
      if (control && control.value && !(control.value instanceof Date)) {
        try {
          // Convertir el valor string a Date
          const dateValue = new Date(control.value);
          if (!isNaN(dateValue.getTime())) {
            // Comprobar si es una fecha válida
            control.setValue(dateValue, { emitEvent: false });
            console.log(`Campo ${field} convertido a Date:`, dateValue);
          }
        } catch (error) {
          console.error(`Error al convertir la fecha para ${field}:`, error);
        }
      }
    });
  }

  isTravelerValid(): boolean {
    if (this.form) {
      this.form.markAllAsTouched();
      const isValid = this.form.valid;
      if (!isValid) {
        this.notifyMissingFields();
      }
      return isValid;
    }
    return false;
  }

  notifyMissingFields(): void {
    const missingFields: string[] = [];

    if (!this.form) return;

    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control && control.invalid && this.isFieldRequired(key)) {
        if (key === 'firstName') missingFields.push('Nombre');
        else if (key === 'lastName') missingFields.push('Apellido');
        else if (key === 'email') missingFields.push('Email');
        else if (key === 'phone') missingFields.push('Teléfono');
        else if (key === 'passport') missingFields.push('Pasaporte');
        else if (key === 'birthdate') missingFields.push('Fecha de nacimiento');
        else if (key === 'sexo') missingFields.push('Sexo');
        else if (key === 'documentType')
          missingFields.push('Tipo de documento');
        else if (key === 'nationality') missingFields.push('Nacionalidad');
        else if (key === 'passportExpirationDate')
          missingFields.push('Caducidad pasaporte');
        else if (key === 'passportIssueDate')
          missingFields.push('Emisión pasaporte');
        else if (key === 'associatedAdult')
          missingFields.push('Adulto asociado');
        else if (key === 'dni') missingFields.push('DNI');
        else missingFields.push(key);
      }
    });

    if (missingFields.length > 0) {
      this.messageService.add({
        severity: 'error',
        summary: `Faltan datos para pasajero ${this.index + 1}`,
        detail: `Debes llenar los campos: ${missingFields.join(', ')}`,
        life: 8000,
      });
    }
  }

  /**
   * Verifica si un campo debe mostrarse en general basado en su mandatory
   */
  shouldShowField(fieldKey: string): boolean {
    // Campos base que siempre se muestran independientemente
    if (
      fieldKey === 'firstName' ||
      fieldKey === 'lastName' ||
      fieldKey === 'email' ||
      fieldKey === 'birthdate' /* || fieldKey === 'nationality' */
    ) {
      return true;
    }

    // Para niños, associatedAdult siempre se muestra
    if (fieldKey === 'associatedAdult' && this.traveler.ageGroup === 'Niños') {
      return true;
    }

    // Si todos son obligatorios o hay vuelo Amadeus, mostrar todos
    if (this.allFieldsMandatory || this.isAmadeusFlightSelected) {
      return true;
    }

    // Buscar el field en reservationFields por su clave original
    const originalKey = this.getOriginalKey(fieldKey);
    if (!originalKey) {
      // Si es un campo que no tiene mapeo inverso pero podría estar en reservationFields directamente
      // (como podría ser el caso de 'dni' que viene como 'national_id')
      const directField = this.findDirectFieldByMappedKey(fieldKey);
      if (directField) {
        return (
          directField.mandatory === ReservationFieldMandatory.ALL ||
          directField.mandatory === ReservationFieldMandatory.LEAD ||
          directField.mandatory === ReservationFieldMandatory.NONE
        );
      }
      return false;
    }

    const field = this.findReservationFieldByKey(originalKey);
    if (!field) {
      return false;
    }

    // Solo mostrar campos con valores LEAD, ALL o NONE
    return (
      field.mandatory === ReservationFieldMandatory.ALL ||
      field.mandatory === ReservationFieldMandatory.LEAD ||
      field.mandatory === ReservationFieldMandatory.NONE
    );
  }

  /**
   * Verifica si un campo debe mostrarse en la sección obligatoria
   */
  shouldShowInMandatorySection(fieldKey: string): boolean {
    // Campos bases siempre obligatorios
    if (
      fieldKey === 'firstName' ||
      fieldKey === 'lastName' ||
      fieldKey === 'email'
    ) {
      return true;
    }

    // Birthdate y nationality siempre van en opcional
    if (fieldKey === 'birthdate' /* || fieldKey === 'nationality' */) {
      return false;
    }

    // Para niños, associatedAdult siempre obligatorio
    if (fieldKey === 'associatedAdult' && this.traveler.ageGroup === 'Niños') {
      return true;
    }

    // Si todos son obligatorios o hay vuelo Amadeus
    if (this.allFieldsMandatory || this.isAmadeusFlightSelected) {
      return true;
    }

    // Buscar por clave original
    const originalKey = this.getOriginalKey(fieldKey);
    if (!originalKey) {
      // Si es un campo que no tiene mapeo inverso pero podría estar en reservationFields directamente
      const directField = this.findDirectFieldByMappedKey(fieldKey);
      if (directField) {
        if (directField.mandatory === ReservationFieldMandatory.ALL) {
          return true;
        }
        if (
          directField.mandatory === ReservationFieldMandatory.LEAD &&
          this.index === 0
        ) {
          return true;
        }
      }
      return false;
    }

    const field = this.findReservationFieldByKey(originalKey);
    if (!field) return false;

    // ALL siempre va en obligatorios
    if (field.mandatory === ReservationFieldMandatory.ALL) {
      return true;
    }

    // LEAD solo obligatorio para index=0
    if (
      field.mandatory === ReservationFieldMandatory.LEAD &&
      this.index === 0
    ) {
      return true;
    }

    return false;
  }

  /**
   * Verifica si un campo debe mostrarse en la sección opcional
   */
  shouldShowInOptionalSection(fieldKey: string): boolean {
    // Birthdate y nationality siempre van en opcional
    if (
      fieldKey === 'birthdate'
      /*
       */
    ) {
      return true;
    }

    // Si es obligatorio, no va en opcional
    if (this.shouldShowInMandatorySection(fieldKey)) {
      return false;
    }

    // Si todos son obligatorios o hay vuelo Amadeus, no hay opcionales
    if (this.allFieldsMandatory || this.isAmadeusFlightSelected) {
      return false;
    }

    // Buscar por clave original
    const originalKey = this.getOriginalKey(fieldKey);
    if (!originalKey) {
      // Si es un campo que no tiene mapeo inverso pero podría estar en reservationFields directamente
      const directField = this.findDirectFieldByMappedKey(fieldKey);
      if (directField) {
        if (directField.mandatory === ReservationFieldMandatory.NONE) {
          return true;
        }
        if (
          directField.mandatory === ReservationFieldMandatory.LEAD &&
          this.index !== 0
        ) {
          return true;
        }
      }
      return false;
    }

    const field = this.findReservationFieldByKey(originalKey);
    if (!field) return false;

    // NONE siempre va en opcionales
    if (field.mandatory === ReservationFieldMandatory.NONE) {
      return true;
    }

    // LEAD para viajeros que no son index=0
    if (
      field.mandatory === ReservationFieldMandatory.LEAD &&
      this.index !== 0
    ) {
      return true;
    }

    return false;
  }

  /**
   * Encuentra un campo de reserva por su clave
   */
  private findReservationFieldByKey(fieldKey: string):
    | {
        id: number;
        name: string;
        key: string;
        mandatory: ReservationFieldMandatory;
      }
    | undefined {
    return this.reservationFields.find((field) => field.key === fieldKey);
  }

  /**
   * Obtiene la clave mapeada para un campo
   */
  private getMappedFieldKey(fieldKey: string): string {
    return this.reservationFieldMappings[fieldKey] || fieldKey;
  }

  /**
   * Convierte la clave mapeada a la original
   */
  private getOriginalKey(mappedKey: string): string | null {
    for (const [key, value] of Object.entries(this.reservationFieldMappings)) {
      if (value === mappedKey) {
        return key;
      }
    }
    return null;
  }

  /**
   * Nueva función para buscar un campo directamente por su clave mapeada
   * (para manejar casos especiales como 'dni')
   */
  private findDirectFieldByMappedKey(mappedKey: string):
    | {
        id: number;
        name: string;
        key: string;
        mandatory: ReservationFieldMandatory;
      }
    | undefined {
    for (const [key, value] of Object.entries(this.reservationFieldMappings)) {
      if (value === mappedKey) {
        const field = this.findReservationFieldByKey(key);
        if (field) return field;
      }
    }
    return undefined;
  }
}
