import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Select } from 'primeng/select';
import { TravelersService } from '../../../../core/services/checkout/travelers.service';
import { MessageService } from 'primeng/api';
import { formatDate } from '@angular/common';

interface Traveler {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passport: string;
  birthdate: string;
  sexo: string;
  documentType: string;
  cp: string;
  nationality: string;
  passportExpirationDate: string;
  passportIssueDate: string;
  ageGroup: string;
  category: string;
  dni: string;
}

@Component({
  selector: 'app-travelers',
  standalone: false,
  templateUrl: './travelers.component.html',
  styleUrls: ['./travelers.component.scss'],
})
export class TravelersComponent implements OnInit {
  showForm = false;
  travelerForm: FormGroup;
  travelers: Traveler[] = [];
  travelerForms: FormGroup[] = [];

  @ViewChild('sexoSelect') sexoSelect!: Select;

  sexoOptions = [
    { label: 'Masculino', value: 'Male' },
    { label: 'Femenino', value: 'Female' },
    /* { label: 'Otro', value: 'O' }, */
  ];
  documentOptions = [
    { label: 'Pasaporte', value: 'passport' },
    { label: 'DNI', value: 'dni' },
    { label: 'Licencia de Conducir', value: 'driverLicense' },
  ];

  constructor(
    private fb: FormBuilder,
    private travelersService: TravelersService,
    private messageService: MessageService
  ) {
    this.travelerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      passport: [''],
      birthdate: [''],
      sexo: [''],
      documentType: [''],
      cp: [''],
      nationality: [''],
      passportExpirationDate: [''],
      passportIssueDate: [''],
      ageGroup: [''],
      category: [''],
      dni: [''],
    });
  }

  ngOnInit(): void {
    // Registrar instancia para validaciones desde otros componentes
    this.travelersService.setTravelersComponent(this);

    this.travelersService.updateTravelersWithRooms();

    this.travelersService.travelersNumbers$.subscribe((data) => {
      this.travelers = Array(data.adults + data.childs + data.babies).fill(
        null
      );
      this.travelerForms = this.travelers.map(() => this.createTravelerForm());
    });

    this.travelersService.travelers$.subscribe((travelers) => {
      if (this.travelers.length === 0 || !this.travelers[0]) {
        this.travelers = travelers.map((traveler) => ({
          firstName: traveler.travelerData?.name || '',
          lastName: traveler.travelerData?.surname || '',
          email: traveler.travelerData?.email || '',
          phone: traveler.travelerData?.phone || '',
          passport: traveler.travelerData?.passportID || '',
          birthdate: traveler.travelerData?.birthdate || '',
          sexo: traveler.travelerData?.sex || '',
          documentType: traveler.travelerData?.documentType || '',
          cp: traveler.travelerData?.postalCode || '',
          nationality: traveler.travelerData?.nationality || '',
          passportExpirationDate:
            traveler.travelerData?.passportExpirationDate || '',
          passportIssueDate: traveler.travelerData?.passportIssueDate || '',
          ageGroup: traveler.travelerData?.ageGroup || '',
          category: traveler.travelerData?.category || '',
          dni: traveler.travelerData?.dni || '',
        }));
        this.travelerForms.forEach((form, index) => {
          form.setValue(this.travelers[index], { emitEvent: false });
          form.valueChanges.subscribe(() => {
            this.onTravelerChange(index);
          });
        });
      }
    });
  }

  createTravelerForm(): FormGroup {
    const form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      passport: [''],
      birthdate: [''],
      sexo: [''],
      documentType: [''],
      cp: [''],
      nationality: [''],
      passportExpirationDate: [''],
      passportIssueDate: [''],
      ageGroup: [''],
      category: [''],
      dni: [''],
    });
    form.valueChanges.subscribe(() => {
      const index = this.travelerForms.indexOf(form);
      if (index !== -1) {
        this.onTravelerChange(index);
      }
    });
    return form;
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (this.showForm) {
      setTimeout(() => {
        this.sexoSelect.focus();
      }, 0);
    }
  }

  getTitlePasajero(num: string): string {
    return 'Pasajero ' + num;
  }

  onTravelerChange(index: number): void {
    const traveler = this.travelerForms[index].value;
    traveler.birthdate = traveler.birthdate
      ? formatDate(traveler.birthdate, 'yyyy-MM-dd', 'en-US')
      : '';
    traveler.passportExpirationDate = traveler.passportExpirationDate
      ? formatDate(traveler.passportExpirationDate, 'yyyy-MM-dd', 'en-US')
      : '';
    traveler.passportIssueDate = traveler.passportIssueDate
      ? formatDate(traveler.passportIssueDate, 'yyyy-MM-dd', 'en-US')
      : '';
    this.travelers[index] = traveler;

    this.travelersService.updateTravelers(
      this.travelers.map((traveler) => ({
        travelerData: {
          name: traveler.firstName,
          surname: traveler.lastName,
          email: traveler.email,
          phone: traveler.phone,
          passportID: traveler.passport,
          birthdate: traveler.birthdate,
          nationality: traveler.nationality,
          passportExpirationDate: traveler.passportExpirationDate,
          passportIssueDate: traveler.passportIssueDate,
          ageGroup: traveler.ageGroup,
          category: traveler.category,
          dni: traveler.dni,
          postalCode: traveler.cp,
          sex: traveler.sexo,
          documentType: traveler.documentType,
        },
      }))
    );
  }

  getOpenTravelers(): number[] {
    return this.travelerForms.map((_, index) => index);
  }

  areAllTravelersValid(): boolean {
    const valid = this.travelerForms.every((form) => form.valid);
    if (!valid) {
      this.notifyMissingTravelers();
    }
    return valid;
  }

  notifyMissingTravelers(): void {
    this.travelerForms.forEach((form, index) => {
      if (form.invalid) {
        const missingFields: string[] = [];
        Object.keys(form.controls).forEach((field) => {
          if (form.controls[field].errors?.['required']) {
            missingFields.push(field);
          }
        });
        if (missingFields.length > 0) {
          this.messageService.add({
            severity: 'error',
            summary: `Faltan datos para viajero ${index + 1}`,
            detail: 'Debes llenar todos los campos obligatorios',
          });
        }
      }
    });
  }
}
