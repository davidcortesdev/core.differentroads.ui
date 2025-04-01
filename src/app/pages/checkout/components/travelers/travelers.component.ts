import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Select } from 'primeng/select';
import { TravelersService } from '../../../../core/services/checkout/travelers.service';
import { MessageService } from 'primeng/api';
import { formatDate } from '@angular/common';
import { TravelerItemComponent } from '../traveler-item/traveler-item.component';

interface Traveler {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passport: string; // número de pasaporte
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
  // Campos adicionales para viajeros bebés
  minorIdExpirationDate?: string;
  minorIdIssueDate?: string;
  associatedAdult?: string;
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

  // Se agrega la propiedad 'sexoOptions' para el select de sexo
  sexoOptions = [
    { label: 'Masculino', value: 'Male' },
    { label: 'Femenino', value: 'Female' },
  ];

  // Opciones base para documento (se completarán dinámicamente)
  baseDocumentOptions = [
    { label: 'Pasaporte', value: 'passport' },
    { label: 'DNI', value: 'dni' },
  ];

  constructor(
    private fb: FormBuilder,
    private travelersService: TravelersService,
    private messageService: MessageService
  ) {
    // FormGroup base (cada viajero tendrá su propio form)
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
      // Campos adicionales para viajeros bebés
      minorIdExpirationDate: [''],
      minorIdIssueDate: [''],
      associatedAdult: [''],
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
          minorIdExpirationDate:
            traveler.travelerData?.minorIdExpirationDate || '',
          minorIdIssueDate: traveler.travelerData?.minorIdIssueDate || '',
          associatedAdult: traveler.travelerData?.associatedAdult || '',
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
      firstName: [''], // Validators will be set in the child component
      lastName: [''], // based on isFirstTraveler
      email: [''], // based on isFirstTraveler
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
      // Campos adicionales para viajeros bebés
      minorIdExpirationDate: [''],
      minorIdIssueDate: [''],
      associatedAdult: [''],
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
    traveler.minorIdExpirationDate = traveler.minorIdExpirationDate
      ? formatDate(traveler.minorIdExpirationDate, 'yyyy-MM-dd', 'en-US')
      : '';
    traveler.minorIdIssueDate = traveler.minorIdIssueDate
      ? formatDate(traveler.minorIdIssueDate, 'yyyy-MM-dd', 'en-US')
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
          // Campos adicionales para bebés:
          minorIdExpirationDate: traveler.minorIdExpirationDate,
          minorIdIssueDate: traveler.minorIdIssueDate,
          associatedAdult: traveler.associatedAdult,
        },
      }))
    );
  }

  getOpenTravelers(): number[] {
    return this.travelerForms.map((_, index) => index);
  }

  areAllTravelersValid(): boolean {
    // Solo verificamos que el primer viajero tenga los campos obligatorios
    const firstTravelerForm = this.travelerForms[0];

    // Check if form exists and all required fields are valid
    const firstNameValid = firstTravelerForm?.get('firstName')?.valid ?? false;
    const lastNameValid = firstTravelerForm?.get('lastName')?.valid ?? false;
    const emailValid = firstTravelerForm?.get('email')?.valid ?? false;

    const valid = firstTravelerForm
      ? firstNameValid && lastNameValid && emailValid
      : false;

    if (!valid) {
      this.notifyMissingTravelers();
    }
    return valid;
  }

  notifyMissingTravelers(): void {
    // Solo notificamos para el primer viajero
    const form = this.travelerForms[0];
    if (form && form.invalid) {
      const missingFields: string[] = [];

      if (form.get('firstName')?.errors?.['required']) {
        missingFields.push('Nombre');
      }
      if (form.get('lastName')?.errors?.['required']) {
        missingFields.push('Apellido');
      }
      if (form.get('email')?.errors?.['required']) {
        missingFields.push('Email');
      }

      if (missingFields.length > 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Faltan datos para pasajero 1',
          detail: `Debes llenar los campos obligatorios: ${missingFields.join(
            ', '
          )}`,
        });
      }
    }
  }

  /**
   * Devuelve las opciones de tipo de documento según la lógica del NextJS:
   * - Para viajeros con ageGroup "Bebés" se incluye "Libro de Familia".
   * - Si la nacionalidad es "Español" se incluye "DNI".
   * - Siempre se incluye "Pasaporte".
   */
  getDocumentOptions(index: number): any[] {
    const form = this.travelerForms[index];
    const options: any[] = [];
    if (form.get('ageGroup')?.value === 'Bebés') {
      options.push({ label: 'Libro de Familia', value: 'family-book' });
    }
    if (form.get('nationality')?.value === 'Español') {
      options.push({ label: 'DNI', value: 'dni' });
    }
    options.push({ label: 'Pasaporte', value: 'passport' });
    return options;
  }

  /**
   * Filtra y devuelve las opciones de viajeros adultos para asociar a un bebé.
   */
  // Update the getAdultsOptions method to be accessible from the child component
  getAdultsOptions(currentIndex: number): any[] {
    return this.travelers
      .map((traveler, idx) => ({
        label: `${traveler.firstName} ${traveler.lastName}`,
        value: idx,
      }))
      .filter((option) => {
        const traveler = this.travelers[option.value];
        return (
          traveler.ageGroup === 'Adultos' &&
          traveler.firstName &&
          traveler.lastName
        );
      });
  }

  /**
   * Returns an array with all traveler indices to keep all accordion panels open
   */
  getAllTravelersIndices(): number[] {
    return this.travelerForms.map((_, index) => index);
  }
}
