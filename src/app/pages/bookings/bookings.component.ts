import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BookingsService } from '../../core/services/bookings.service';

interface BookingData {
  title: string;
  date: string;
  bookingCode: string;
  bookingReference: string;
  status: string;
  retailer: string;
  creationDate: string;
  price: string;
}

interface BookingActivity {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  price: string;
  priceValue: number;
  isOptional: boolean;
  perPerson: boolean;
  isIncluded: boolean;
}

interface BookingImage {
  id: number;
  name: string;
  imageUrl: string;
  retailer: string;
  creationDate: string;
  departureDate: string;
  passengers: number;
  price: string;
}

interface RetailerInfo {
  name: string;
  email: string;
  phone: string;
}

interface TripItemData {
  quantity: number;
  unitPrice: number;
}

interface PaymentInfo {
  totalPrice: number;
  pendingAmount: number;
  paidAmount: number;
}

interface UpcomingPayment {
  date: string;
  amount: number;
}

interface PaymentHistoryItem {
  date: string;
  amount: number;
  status: string;
}

interface FlightSegment {
  departureDate: string;
  departureTime: string;
  departureAirport: string;
  departureCode: string;
  arrivalTime: string;
  arrivalAirport: string;
  arrivalCode: string;
}

interface FlightDirection {
  date: string;
  segments: FlightSegment[];
  stops: number;
}

interface FlightsData {
  outbound: FlightDirection;
  inbound: FlightDirection;
}

// Updated PassengerData interface
export interface PassengerData {
  id: number;
  fullName: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  email: string;
  phone: string;
  type: string;
  room?: string;
  gender?: string;
  documentExpeditionDate?: string;
  documentExpirationDate?: string;
  comfortPlan?: string;
  insurance?: string;
}

@Component({
  selector: 'app-bookings',
  standalone: false,
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.scss'],
  providers: [MessageService],
})
export class BookingsComponent implements OnInit {
  // ID de la reserva actual
  bookingId: string = '';
  isLoading: boolean = false;

  // Datos básicos que se actualizarán dinámicamente
  bookingData: BookingData = {
    title: 'Países Bálticos: donde la historia europea se encuentra con el mar',
    date: '20 de julio (S)',
    bookingCode: '399243P',
    bookingReference: '80272',
    status: 'Booked',
    retailer: 'Different Roads',
    creationDate: '03/02/2025',
    price: '1.345 €',
  };

  // El resto de datos se mantendrán quemados
  retailerInfo: RetailerInfo = {
    name: 'Different Roads',
    email: 'info@differentroads.es',
    phone: '+34 78 43 645 3',
  };

  isTO: boolean = false;
  isAdmin: boolean = true;

  bookingImages: BookingImage[] = [
    {
      id: 1,
      name: 'Destino de viaje',
      imageUrl: 'https://picsum.photos/400/200',
      retailer: 'Different Roads',
      creationDate: '03/02/2025',
      departureDate: '3 Jun',
      passengers: 2,
      price: '1.345 €',
    },
  ];

  adultData: TripItemData = { quantity: 5, unitPrice: 650 };
  individualData: TripItemData = { quantity: 1, unitPrice: 445 };
  gondolaData: TripItemData = { quantity: 1, unitPrice: 45 };
  comfortPlanData: TripItemData = { quantity: 1, unitPrice: 80 };
  flightData: TripItemData = { quantity: 1, unitPrice: 175 };
  discountData: TripItemData = { quantity: 50, unitPrice: 1 };

  paymentInfo: PaymentInfo = {
    totalPrice: 1345,
    pendingAmount: 1345,
    paidAmount: 0,
  };

  upcomingPayments: UpcomingPayment[] = [
    { date: '2025-02-03', amount: 200 },
    { date: '2025-04-20', amount: 1195 },
  ];

  paymentHistory: PaymentHistoryItem[] = [
    { date: '03/02/2025', amount: 1345, status: 'Pendiente' },
  ];

  passengers: PassengerData[] = [
    {
      id: 1,
      fullName: 'Juan Pérez García',
      documentType: 'DNI',
      documentNumber: '12345678A',
      birthDate: '15/05/1985',
      email: 'juan.perez@example.com',
      phone: '+34 612 345 678',
      type: 'adult',
      room: 'Habitación 1: Individual',
      gender: 'Male',
      documentExpeditionDate: '10/01/2020',
      documentExpirationDate: '10/01/2030',
      comfortPlan: 'Standard',
      insurance: 'Básico',
    },
    {
      id: 2,
      fullName: 'María López Rodríguez',
      documentType: 'Pasaporte',
      documentNumber: 'PAB123456',
      birthDate: '22/07/1990',
      email: 'maria.lopez@example.com',
      phone: '+34 623 456 789',
      type: 'adult',
      room: 'Habitación 2: Doble',
      gender: 'Female',
      documentExpeditionDate: '15/03/2019',
      documentExpirationDate: '15/03/2029',
      comfortPlan: 'Premium',
      insurance: 'Completo',
    },
    {
      id: 3,
      fullName: 'Carlos Sánchez Martínez',
      documentType: 'DNI',
      documentNumber: '87654321B',
      birthDate: '03/11/1982',
      email: 'carlos.sanchez@example.com',
      phone: '+34 634 567 890',
      type: 'adult',
      room: 'Habitación 2: Doble',
      gender: 'Male',
      documentExpeditionDate: '22/05/2018',
      documentExpirationDate: '22/05/2028',
      comfortPlan: 'Premium',
      insurance: 'Completo',
    },
    {
      id: 4,
      fullName: 'Pablo Martín González',
      documentType: 'Pasaporte',
      documentNumber: 'PAC987654',
      birthDate: '07/09/2015',
      email: '',
      phone: '',
      type: 'child',
      room: 'Habitación 3: Familiar',
      gender: 'Male',
      documentExpeditionDate: '12/10/2021',
      documentExpirationDate: '12/10/2026',
      comfortPlan: 'Basic',
      insurance: 'Infantil',
    },
    {
      id: 5,
      fullName: 'Lucía Fernández Díaz',
      documentType: 'DNI',
      documentNumber: '98765432C',
      birthDate: '14/12/2017',
      email: '',
      phone: '',
      type: 'child',
      room: 'Habitación 3: Familiar',
      gender: 'Female',
      documentExpeditionDate: '05/08/2022',
      documentExpirationDate: '05/08/2027',
      comfortPlan: 'Basic',
      insurance: 'Infantil',
    },
  ];

  flightsData: FlightsData = {
    outbound: {
      date: '11/04/2025',
      stops: 1,
      segments: [
        {
          departureDate: '11/04/2025',
          departureTime: '11:40:00',
          departureAirport: 'Barcelona',
          departureCode: 'BCN',
          arrivalTime: '13:25:00',
          arrivalAirport: 'Roma',
          arrivalCode: 'FCO',
        },
        {
          departureDate: '11/04/2025',
          departureTime: '14:55:00',
          departureAirport: 'Roma',
          departureCode: 'FCO',
          arrivalTime: '10:25:00',
          arrivalAirport: 'Tokio',
          arrivalCode: 'HND',
        },
      ],
    },
    inbound: {
      date: '21/04/2025',
      stops: 1,
      segments: [
        {
          departureDate: '21/04/2025',
          departureTime: '12:25:00',
          departureAirport: 'Tokio',
          departureCode: 'HND',
          arrivalTime: '20:10:00',
          arrivalAirport: 'Roma',
          arrivalCode: 'FCO',
        },
        {
          departureDate: '21/04/2025',
          departureTime: '21:25:00',
          departureAirport: 'Roma',
          departureCode: 'FCO',
          arrivalTime: '23:15:00',
          arrivalAirport: 'Barcelona',
          arrivalCode: 'BCN',
        },
      ],
    },
  };

  bookingActivities: BookingActivity[] = [
    {
      id: 1,
      title: 'recorrido en góndola',
      description:
        'Este paseo en las famosas góndolas venecianas te permitirá admirar la majestuosa arquitectura de la ciudad de Venecia desde sus canales. (Sujeto a disponibilidad y grupo mínimo)',
      imageUrl: 'https://picsum.photos/400/200',
      price: '+45€',
      priceValue: 45,
      isOptional: true,
      perPerson: true,
      isIncluded: true,
    },
    {
      id: 2,
      title: 'Fiesta de disfraces',
      description: 'Sin descripción disponible',
      imageUrl: 'https://picsum.photos/400/200',
      price: '+0€',
      priceValue: 0,
      isOptional: true,
      perPerson: true,
      isIncluded: false,
    },
  ];

  paymentForm: FormGroup;
  displayPaymentModal: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private fb: FormBuilder,
    private bookingsService: BookingsService
  ) {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.messageService.clear();
    
    // Obtenemos el ID de la URL
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.bookingId = params['id'];
        this.loadBookingData(this.bookingId);
      }
    });
  }

  // Método para cargar solo los datos básicos de la reserva
  loadBookingData(id: string): void {
    console.log('Cargando datos de la reserva con ID:', id);
    this.isLoading = true;
    
    this.bookingsService.getBookingById(id).subscribe(
      (booking) => {
        console.log('Booking cargado:', booking);
        
        // Solo actualizamos los datos básicos de la reserva
        this.bookingData = {
          title: booking?.periodData?.['tour']?.name || 'Sin título',
          date: booking?.periodData?.['dayOne'] ? 
                this.formatDateForDisplay(booking.periodData['dayOne']) : 'Fecha no disponible',
          bookingCode: booking?.ID || '',
          bookingReference: booking?.externalID || '',
          status: booking?.status || '',
          retailer: 'Different Roads', // Mantener este valor quemado
          creationDate: booking?.createdAt ? this.formatDateForDisplay(booking.createdAt) : '',
          price: this.formatCurrency(1345), // Mantener el precio quemado
        };
        
        // Actualizar la información de pasajeros en la imagen (pero mantener la imagen quemada)
        this.bookingImages[0].passengers = booking?.travelersNumber || 2;
        this.bookingImages[0].departureDate = this.formatDateShort(booking?.periodData?.['dayOne'] || '');
        
        this.isLoading = false;
      },
      (error) => {
        console.error('Error al cargar la reserva:', error);
        this.messageService.add({
          key: 'center',
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la información de la reserva',
          life: 3000,
        });
        this.isLoading = false;
      }
    );
  }

  eliminateActivity(activityId: number): void {
    const activityIndex = this.bookingActivities.findIndex(
      (act) => act.id === activityId
    );
    if (activityIndex !== -1) {
      this.bookingActivities[activityIndex].isIncluded = false;
      this.messageService.add({
        key: 'center',
        severity: 'success',
        summary: 'Actividad eliminada',
        detail: `Se ha eliminado la actividad ${this.bookingActivities[activityIndex].title}`,
        life: 3000,
      });
    }
  }

  addActivity(activityId: number): void {
    const activityIndex = this.bookingActivities.findIndex(
      (act) => act.id === activityId
    );
    if (activityIndex !== -1) {
      this.bookingActivities[activityIndex].isIncluded = true;
      this.messageService.add({
        key: 'center',
        severity: 'success',
        summary: 'Actividad añadida',
        detail: `Se ha añadido la actividad ${this.bookingActivities[activityIndex].title}`,
        life: 3000,
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  cancelBooking(): void {
    console.log('Cancelando reserva:', this.bookingData.bookingCode);

    if (this.isTO) {
      this.messageService.add({
        key: 'center',
        severity: 'warn',
        summary: 'Cancelación',
        detail:
          'Procesando cancelación de reserva ' + this.bookingData.bookingCode,
        life: 3000,
      });
    }
  }

  registerPayment(amount: number): void {
    console.log('Registrando pago de:', amount);

    this.paymentInfo.paidAmount += amount;
    this.paymentInfo.pendingAmount -= amount;

    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(
      today.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${today.getFullYear()}`;

    this.paymentHistory.unshift({
      date: formattedDate,
      amount: amount,
      status: 'Pagado',
    });

    this.messageService.add({
      key: 'center',
      severity: 'success',
      summary: 'Pago registrado',
      detail: `Se ha registrado un pago de ${amount}€`,
      life: 3000,
    });
  }

  sendReminder(): void {
    if (this.isTO) {
      this.messageService.add({
        key: 'center',
        severity: 'success',
        summary: 'Éxito',
        detail: 'Recordatorio enviado correctamente',
        life: 3000,
      });
    }
  }

  reprintInfo(): void {
    if (this.isTO) {
      this.messageService.add({
        key: 'center',
        severity: 'info',
        summary: 'Información',
        detail: 'Reimprimiendo información de la reserva',
        life: 3000,
      });
    }
  }

  reprintVoucher(): void {
    if (this.isTO) {
      this.messageService.add({
        key: 'center',
        severity: 'info',
        summary: 'Información',
        detail: 'Reimprimiendo bono de reserva',
        life: 3000,
      });
    }
  }

  reprintPaymentReminder(): void {
    if (this.isTO) {
      this.messageService.add({
        key: 'center',
        severity: 'info',
        summary: 'Información',
        detail: 'Reimprimiendo recordatorio de pago',
        life: 3000,
      });
    }
  }

  reprintETickets(): void {
    if (this.isTO) {
      this.messageService.add({
        key: 'center',
        severity: 'info',
        summary: 'Información',
        detail: 'Reimprimiendo e-tickets',
        life: 3000,
      });
    }
  }

  handleFileUploaded(file: any): void {
    this.messageService.add({
      key: 'center',
      severity: 'info',
      summary: 'Archivo adjuntado',
      detail: 'Comprobante de pago adjuntado correctamente',
      life: 3000,
    });
  }

  showPaymentModal(): void {
    this.displayPaymentModal = true;
  }

  hidePaymentModal(): void {
    this.displayPaymentModal = false;
    this.paymentForm.reset({ amount: 0 });
  }

  onSubmitPayment(): void {
    if (this.paymentForm.valid) {
      const amount = this.paymentForm.get('amount')?.value;
      this.registerPayment(amount);
      this.hidePaymentModal();
    }
  }
  
  formatQuantity(item: TripItemData): string {
    return `${item.quantity}x${item.unitPrice}`;
  }

  formatPrice(price: number): string {
    return `${price}€`;
  }

  formatCurrency(amount: number): string {
    return `${amount.toLocaleString('es-ES')} €`;
  }

  formatDate(dateStr: string): string {
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  calculateTotal(item: TripItemData): number {
    return item.quantity * item.unitPrice;
  }
  
  // Método para formatear fecha
  formatDateForDisplay(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  }
  
  // Método para formatear fecha corta (ej: "3 Jun")
  formatDateShort(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    } catch (e) {
      return dateStr;
    }
  }
}