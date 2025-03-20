import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Select } from 'primeng/select';
import { ViewChild } from '@angular/core';
import { Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-traveler-item',
  standalone: false,
  
  templateUrl: './traveler-item.component.html',
  styleUrls: ['./traveler-item.component.scss']
})
export class TravelerItemComponent implements OnInit {
  @Input() form!: FormGroup;
  @Input() index!: number;
  @Input() traveler: any;
  @Input() sexoOptions: any[] = [];
  @Input() isFirstTraveler: boolean = false;

  @ViewChild('sexoSelect') sexoSelect!: Select;

  constructor() { }

  ngOnInit(): void {
  }

  getTitlePasajero(num: string): string {
    return 'Pasajero ' + num;
  }

  getDocumentOptions(): any[] {
    const options: any[] = [];
    if (this.form.get('ageGroup')?.value === 'Bebés') {
      options.push({ label: 'Libro de Familia', value: 'family-book' });
    }
    if (this.form.get('nationality')?.value === 'Español') {
      options.push({ label: 'DNI', value: 'dni' });
    }
    options.push({ label: 'Pasaporte', value: 'passport' });
    return options;
  }

  @Input() getAdultsOptionsFn!: (index: number) => any[];

  // Update the getAdultsOptions method
  getAdultsOptions(): any[] {
    return this.getAdultsOptionsFn ? this.getAdultsOptionsFn(this.index) : [];
  }
}
