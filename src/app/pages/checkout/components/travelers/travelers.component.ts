import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Select } from 'primeng/select';

@Component({
  selector: 'app-travelers',
  standalone: false,
  templateUrl: './travelers.component.html',
  styleUrls: ['./travelers.component.scss'],
})
export class TravelersComponent implements OnInit {
  showForm = false;
  travelerForm: FormGroup;

  tabs = [
    { title: 'Title 1', content: 'Content 1', value: '1' },
    { title: 'Title 2', content: 'Content 2222', value: '2' },
    { title: 'Title 3', content: 'Content 3', value: '3' },
  ];

  @ViewChild('sexoSelect') sexoSelect!: Select;

  sexoOptions = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
    { label: 'Otro', value: 'O' }
  ];
  documentOptions = [
    { label: 'Pasaporte', value: 'passport' },
    { label: 'DNI', value: 'dni' },
    { label: 'Licencia de Conducir', value: 'driverLicense' }
  ];

  constructor(private fb: FormBuilder) {
    this.travelerForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: [''],
      phone: [''],
      passport: [''],
      birthdate: [''],
      sexo: [''],
      documentType: [''],
      cp: ['']
    });
  }

  ngOnInit(): void {}

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (this.showForm) {
      setTimeout(() => {
        this.sexoSelect.focus();
      }, 0);
    }
  }

  getTitlePasajero( num: string ): string {
    return 'Pasajero ' + num;
  }
}