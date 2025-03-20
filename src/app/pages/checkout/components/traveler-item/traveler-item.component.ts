import { Component, Input, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Select } from 'primeng/select';

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
export class TravelerItemComponent implements OnInit {
  @Input() form!: FormGroup;
  @Input() index!: number;
  @Input() traveler!: TravelerData;
  @Input() sexoOptions: SelectOption[] = [];
  @Input() isFirstTraveler: boolean = false;
  @Input() getAdultsOptionsFn!: (index: number) => SelectOption[];

  @ViewChild('sexoSelect') sexoSelect!: Select;

  constructor() { }

  ngOnInit(): void {
    // Inicialización si es necesaria
  }

  getTitlePasajero(num: string): string {
    return 'Pasajero ' + num;
  }

  getDocumentOptions(): SelectOption[] {
    const options: SelectOption[] = [];
    const ageGroup = this.form.get('ageGroup')?.value;
    const nationality = this.form.get('nationality')?.value;
    
    if (ageGroup === 'Bebés') {
      options.push({ label: 'Libro de Familia', value: 'family-book' });
    }
    
    if (nationality === 'Español') {
      options.push({ label: 'DNI', value: 'dni' });
    }
    
    // Pasaporte siempre disponible
    options.push({ label: 'Pasaporte', value: 'passport' });
    
    return options;
  }

  getAdultsOptions(): SelectOption[] {
    return this.getAdultsOptionsFn ? this.getAdultsOptionsFn(this.index) : [];
  }
}
