import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import { Select } from 'primeng/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TravelersService } from '../../../../core/services/checkout/travelers.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelerItemComponent implements OnInit, OnDestroy {
  @Input() form!: FormGroup;
  @Input() index!: number;
  @Input() traveler!: TravelerData;
  @Input() sexoOptions: SelectOption[] = [];
  @Input() isFirstTraveler: boolean = false;
  @Input() getAdultsOptionsFn!: (index: number) => SelectOption[];
  @Input() travelerId: string | null = null;

  @ViewChild('sexoSelect') sexoSelect!: Select;

  // Propiedad para almacenar y mostrar los IDs
  travelerIds: { id: string | null, _id: string | null } = { id: null, _id: null };

  showMoreFields: boolean = false;
  private documentOptionsCache: { [key: string]: SelectOption[] } = {};
  private destroy$ = new Subject<void>();

  constructor(private travelersService: TravelersService) {}

  ngOnInit(): void {
    // Inicializar el ID del viajero si no existe
    this.initializeTravelerId();

    // Mostrar IDs en consola
    this.logTravelerIds();
    const currentTraveler = this.travelersService.getTravelers()[this.index];
    this.travelerId = currentTraveler?._id || null;

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
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeTravelerId(): void {
    const currentTravelers = this.travelersService.getTravelers();
    
    if (currentTravelers[this.index]) {
      // Generar un nuevo ID si no existe
      if (!currentTravelers[this.index]._id) {
        currentTravelers[this.index]._id = this.travelersService.generateHexID();
        this.travelersService.updateTravelers(currentTravelers);
      }

      // Actualizar la propiedad para mostrar en el template
      this.travelerIds = {
        id: currentTravelers[this.index].id || null,
        _id: currentTravelers[this.index]._id || null
      };
    }
  }

  private logTravelerIds(): void {
    const currentTraveler = this.travelersService.getTravelers()[this.index];
    console.groupCollapsed(`IDs del Viajero ${this.index + 1}`);
    console.log('ID:', currentTraveler?.id || 'No disponible');
    console.log('_ID:', currentTraveler?._id || 'No disponible');
    console.groupEnd();
  }

  toggleMoreFields(): void {
    this.showMoreFields = !this.showMoreFields;
  }

  private updateValidators(): void {
    const firstNameControl = this.form.get('firstName');
    const lastNameControl = this.form.get('lastName');
    const emailControl = this.form.get('email');

    if (firstNameControl && lastNameControl && emailControl) {
      if (this.isFirstTraveler) {
        firstNameControl.setValidators([Validators.required]);
        lastNameControl.setValidators([Validators.required]);
        emailControl.setValidators([Validators.required, Validators.email]);
      } else {
        firstNameControl.clearValidators();
        lastNameControl.clearValidators();
        emailControl.clearValidators();
        emailControl.setValidators([Validators.email]);
      }

      firstNameControl.updateValueAndValidity();
      lastNameControl.updateValueAndValidity();
      emailControl.updateValueAndValidity();
    }
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

    if (nationality === 'Español') {
      options.push({ label: 'DNI', value: 'dni' });
    }

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

  trackByFn(index: number, item: any): number {
    return index;
  }
}