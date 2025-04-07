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
import { FormGroup, Validators } from '@angular/forms';
import { Select } from 'primeng/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CountriesService } from '../../../../core/services/countries.service';
import { Country } from '../../../../shared/models/country.model';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';

// Interfaces para mejorar la tipificación
export interface TravelerData {
  ageGroup: string;
  [key: string]: any;
}

export interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-traveler-item',
  standalone: false,
  templateUrl: './traveler-item.component.html',
  styleUrls: ['./traveler-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Mejora de rendimiento
})
export class TravelerItemComponent implements OnInit, OnDestroy, OnChanges {
  @Input() form!: FormGroup;
  @Input() index!: number;
  @Input() traveler!: TravelerData;
  @Input() sexoOptions: SelectOption[] = [];
  @Input() getAdultsOptionsFn!: (index: number) => SelectOption[];
  @Input() allFieldsMandatory: boolean = false;

  @ViewChild('sexoSelect') sexoSelect!: Select;

  // Add showMoreFields flag to control visibility
  showMoreFields: boolean = false;

  // Cache para opciones de documentos
  private documentOptionsCache: { [key: string]: SelectOption[] } = {};
  // Destructor de suscripciones
  private destroy$ = new Subject<void>();

  // Propiedades para el autocompletado de países
  filteredCountries: Country[] = [];

  constructor(private countriesService: CountriesService) {}

  ngOnInit(): void {
    // Escuchar cambios en campos relevantes para limpiar caché
    if (this.form) {
      this.form
        .get('ageGroup')
        ?.valueChanges.pipe(takeUntil(this.destroy$))
        .subscribe(() => this.clearDocumentOptionsCache());

      this.form
        .get('nationality')
        ?.valueChanges.pipe(takeUntil(this.destroy$))
        .subscribe(() => this.clearDocumentOptionsCache());

      // Initial validators setup
      this.updateValidators();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // React to input changes, particularly allFieldsMandatory
    if (changes['allFieldsMandatory']) {
      this.updateValidators();

      // Set showMoreFields to true when allFieldsMandatory is true
      if (this.allFieldsMandatory) {
        this.showMoreFields = true;
      }
    }
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Add toggle method for show more/less functionality
  toggleMoreFields(): void {
    this.showMoreFields = !this.showMoreFields;
  }

  /**
   * Actualiza los validadores basados en la bandera allFieldsMandatory
   */
  private updateValidators(): void {
    if (!this.form) return;

    const requiredFields = ['firstName', 'lastName', 'email'];

    // For debugging
    console.log(
      `Updating validators: allFieldsMandatory=${this.allFieldsMandatory}`
    );

    if (this.allFieldsMandatory) {
      // Todos los campos obligatorios
      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.get(key);
        if (control) {
          // No aplicar validación requerida a "ageGroup"
          if (key === 'ageGroup') {
            control.clearValidators();
            control.updateValueAndValidity({ emitEvent: false });
            return;
          }
          if (key === 'email') {
            control.setValidators([Validators.required, Validators.email]);
          } else if (
            requiredFields.includes(key) ||
            (key !== 'minorIdExpirationDate' &&
              key !== 'minorIdIssueDate' &&
              key !== 'associatedAdult')
          ) {
            control.setValidators([Validators.required]);
          }
          control.updateValueAndValidity({ emitEvent: false });
        }
      });
    } else {
      // Viajeros sin campos obligatorios
      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.get(key);
        if (control) {
          if (key === 'email') {
            control.setValidators([Validators.email]);
          } else {
            control.clearValidators();
          }
          control.updateValueAndValidity({ emitEvent: false });
        }
      });
    }
  }

  /**
   * Obtiene el título del pasajero con su número
   * @param num Número de pasajero
   */
  getTitlePasajero(num: string): string {
    return 'Pasajero ' + num;
  }

  /**
   * Obtiene las opciones de documento basadas en edad y nacionalidad
   * Implementa memoización para evitar cálculos repetidos
   */
  getDocumentOptions(): SelectOption[] {
    const ageGroup = this.form.get('ageGroup')?.value || '';
    const nationality = this.form.get('nationality')?.value || '';
    const cacheKey = `${ageGroup}-${nationality}`;

    // Devolver del caché si existe
    if (this.documentOptionsCache[cacheKey]) {
      return this.documentOptionsCache[cacheKey];
    }

    const options: SelectOption[] = [];

    if (ageGroup === 'Bebés') {
      options.push({ label: 'Libro de Familia', value: 'family-book' });
    }

    if (nationality === 'Español') {
      options.push({ label: 'DNI', value: 'dni' });
    }

    // Pasaporte siempre disponible
    options.push({ label: 'Pasaporte', value: 'passport' });

    // Guardar en caché para futuras llamadas
    this.documentOptionsCache[cacheKey] = options;

    return options;
  }

  /**
   * Obtiene las opciones de adultos para asociar a un bebé
   */
  getAdultsOptions(): SelectOption[] {
    return this.getAdultsOptionsFn ? this.getAdultsOptionsFn(this.index) : [];
  }

  /**
   * Limpia la caché de opciones de documentos cuando cambian los valores relevantes
   */
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
}
