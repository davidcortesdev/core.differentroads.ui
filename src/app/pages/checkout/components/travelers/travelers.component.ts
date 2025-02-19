import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-travelers',
  standalone: false,
  templateUrl: './travelers.component.html',
  styleUrls: ['./travelers.component.scss'],
})
export class TravelersComponent implements OnInit {
  showForm = false; // Controla la visibilidad del formulario
  travelerForm: FormGroup;
  personalInfo = {
    sexo: ''
  };
  sexoOptions = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
    { label: 'Otro', value: 'O' }
  ];
  filteredSexoOptions: any[] = [];

  constructor(private fb: FormBuilder) {
    this.travelerForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: [''],
      phone: [''],
      passport: [''],
      birthdate: [''],
      sexo: ['']
    });
  }

  ngOnInit(): void {}

  // Método para mostrar/ocultar el formulario
  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  filterSexo(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredSexoOptions = this.sexoOptions.filter(option =>
      option.label.toLowerCase().includes(query)
    );
  }
}