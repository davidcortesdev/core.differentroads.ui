import { Component, Input, OnInit, OnDestroy, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Select } from 'primeng/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  changeDetection: ChangeDetectionStrategy.OnPush // Mejora de rendimiento
})
export class TravelerItemComponent implements OnInit, OnDestroy {
  @Input() form!: FormGroup;
  @Input() index!: number;
  @Input() traveler!: TravelerData;
  @Input() sexoOptions: SelectOption[] = [];
  @Input() isFirstTraveler: boolean = false;
  @Input() getAdultsOptionsFn!: (index: number) => SelectOption[];

  @ViewChild('sexoSelect') sexoSelect!: Select;
  
  // Cache para opciones de documentos
  private documentOptionsCache: { [key: string]: SelectOption[] } = {};
  // Destructor de suscripciones
  private destroy$ = new Subject<void>();

  constructor() { }

  ngOnInit(): void {
    // Escuchar cambios en campos relevantes para limpiar caché
    if (this.form) {
      this.form.get('ageGroup')?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.clearDocumentOptionsCache());
      
      this.form.get('nationality')?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.clearDocumentOptionsCache());
    }
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
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
   * Función trackBy para mejorar rendimiento en listas ngFor
   */
  trackByFn(index: number, item: any): number {
    return index;
  }
}
