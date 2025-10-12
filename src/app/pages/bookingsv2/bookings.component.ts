import { Component, OnInit, Inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Flight } from '../../core/models/tours/flight.model';
import { finalize } from 'rxjs/operators';
import {
  Payment,
  PaymentStatus,
} from '../../core/models/bookings/payment.model';
import {
  ReservationService,
  IReservationResponse,
  IReservationSummaryResponse,
} from '../../core/services/reservation/reservation.service';
import { TourNetService } from '../../core/services/tour/tourNet.service';
import { CMSTourService } from '../../core/services/cms/cms-tour.service';
import { RetailerService } from '../../core/services/retailer/retailer.service';
import { DepartureService } from '../../core/services/departure/departure.service';
import { Title } from '@angular/platform-browser';

interface BookingData {
  title: string;
  date: string;
  bookingCode: string;
  bookingReference: string;
  status: string;
  retailer: string;
  creationDate: string;
  price: number;
}

interface BookingActivity {
  id: string;
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
  price: number;
  tourName?: string;
}

interface RetailerInfo {
  name: string;
  email: string;
}

interface TripItemData {
  quantity: number;
  unitPrice: number;
  value?: number;
  description?: string;
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

// Interfaz actualizada para los datos de pasajeros compatible con el componente hijo
export interface PassengerData {
  id: number;
  name: string;
  surname: string;
  documentType: string;
  passportID: string;
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
  nationality?: string;
  ageGroup?: string;
  _id?: string;
  bookingID?: string;
  bookingSID?: string;
  lead?: boolean;
  ciudad?: string;
  codigoPostal?: string;
  dni?: string;
  minorIdExpirationDate?: string;
  minorIdIssueDate?: string;
}

@Component({
  selector: 'app-bookingsv2',
  standalone: false,
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.scss'],
  providers: [MessageService],
})
export class Bookingsv2Component implements OnInit {
  // ID de la reserva actual
  bookingId: string = '';
  isLoading: boolean = false;
  reservation: IReservationResponse | null = null; // Objeto de reserva completo
  reservationSummary: IReservationSummaryResponse | null = null; // Resumen de la reserva
  availableActivities: BookingActivity[] = []; // Array para actividades disponibles

  // Datos básicos que se actualizarán dinámicamente
  bookingData: BookingData = {
    title: '',
    date: '',
    bookingCode: '',
    bookingReference: '',
    status: '',
    retailer: '',
    creationDate: '',
    price: 0,
  };

  // El resto de datos se mantendrán quemados

  isTO: boolean = true;
  isAdmin: boolean = true;

  bookingImages: BookingImage[] = [
    {
      id: 1,
      name: 'Destino de viaje',
      imageUrl: 'https://picsum.photos/400/200',
      retailer: '',
      creationDate: '',
      departureDate: '',
      passengers: 0,
      price: 0,
    },
  ];

  // Array para elementos del viaje dinámicos
  tripItems: TripItemData[] = [];

  paymentInfo: PaymentInfo = {
    totalPrice: 0,
    pendingAmount: 0,
    paidAmount: 0,
  };

  upcomingPayments: UpcomingPayment[] = [];

  paymentHistory: Payment[] = []; // Updated payment history type

  // Datos reales de pasajeros que se cargarán de la API
  passengers: PassengerData[] = [];

  // Datos adaptados para Flight Section Component
  adaptedFlightData: Flight = {
    id: '',
    externalID: '',
    name: '',
    outbound: {
      activityID: 0,
      availability: 0,
      date: '',
      name: '',
      segments: [],
      serviceCombinationID: 0,
    },
    inbound: {
      activityID: 0,
      availability: 0,
      date: '',
      name: '',
      segments: [],
      serviceCombinationID: 0,
    },
  };

  bookingActivities: any[] = [];

  paymentForm: FormGroup;
  displayPaymentModal: boolean = false;

  // Nueva propiedad para almacenar el total de la reserva
  bookingTotal: number = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private fb: FormBuilder,
    private reservationService: ReservationService,
    private tourNetService: TourNetService,
    private cmsTourService: CMSTourService,
    @Inject(RetailerService) private retailerService: RetailerService,
    private departureService: DepartureService,
    private titleService: Title
  ) {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Mis Reservas - Different Roads');
    this.messageService.clear();

    // Obtenemos el ID de la URL
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.bookingId = params['id'];
        this.loadBookingData(this.bookingId);
      }
    });
  }

  // Método para cargar los datos de la reserva
  loadBookingData(id: string): void {
    this.isLoading = true;

    // Convertir el ID de string a number
    const reservationId = parseInt(id, 10);

    // Cargar datos de la reserva
    this.reservationService
      .getById(reservationId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (reservation) => {
          this.reservation = reservation;

          // Actualizar datos básicos de la reserva
          this.updateBasicBookingData(reservation);

          // Actualizar información de la imagen
          this.updateBookingImages(reservation);

          // Actualizar datos de elementos del viaje de forma dinámica
          this.updateTripItemsData(reservation);

          // Actualizar información de pagos
          this.updatePaymentInfo(reservation);

          // Cargar el resumen de la reserva para obtener más detalles
          this.loadReservationSummary(reservationId);

          // Los datos de pasajeros ahora se cargan directamente en el componente booking-personal-data
        },
        error: (error) => {
          this.messageService.add({
            key: 'center',
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la información de la reserva',
            life: 3000,
          });
        },
      });
  }

  // Método para cargar el resumen de la reserva
  loadReservationSummary(reservationId: number): void {
    this.reservationService.getSummary(reservationId).subscribe({
      next: (summary) => {
        this.reservationSummary = summary;

        // Actualizar elementos del viaje con el resumen
        this.updateTripItemsFromSummary(summary);
      },
      error: (error) => {
        console.error('Error loading reservation summary:', error);
      },
    });
  }

  // Método ACTUALIZADO para los datos de elementos del viaje
  updateTripItemsData(reservation: IReservationResponse): void {
    // Limpiar el array de elementos del viaje
    this.tripItems = [];

    // Crear un elemento básico con el total de la reserva
    this.tripItems.push({
      quantity: reservation.totalPassengers,
      unitPrice: reservation.totalAmount / reservation.totalPassengers,
      value: reservation.totalAmount,
      description: `Tour ${reservation.tourId} - ${reservation.totalPassengers} pasajeros`,
    });
  }

  // Método para actualizar elementos del viaje desde el resumen
  updateTripItemsFromSummary(summary: IReservationSummaryResponse): void {
    if (summary.items && summary.items.length > 0) {
      // Limpiar el array existente
      this.tripItems = [];

      // Agregar cada item del resumen
      summary.items.forEach((item) => {
        this.tripItems.push({
          quantity: item.quantity,
          unitPrice: item.amount,
          value: item.total,
          description: item.description,
        });
      });
    }
  }

  // Actualizar datos básicos de la reserva
  updateBasicBookingData(reservation: IReservationResponse): void {
    this.bookingData = {
      title: 'Cargando...', // Temporal mientras cargamos el nombre real
      date: reservation.reservedAt
        ? new Date(reservation.reservedAt).toLocaleDateString()
        : 'Fecha no disponible',
      bookingCode: reservation.id.toString() || reservation.tkId,
      bookingReference: reservation.tkId || '',
      status: this.getStatusText(reservation.reservationStatusId),
      retailer: 'Cargando...', // Temporal mientras cargamos el nombre real
      creationDate: reservation.createdAt
        ? new Date(reservation.createdAt).toLocaleDateString()
        : '',
      price: reservation.totalAmount,
    };

    // Cargar datos reales del tour, retailer y departure
    this.loadTourData(reservation.tourId);
    this.loadRetailerData(reservation.retailerId);
    this.loadDepartureData(reservation.departureId);
  }

  // Método para obtener el texto del estado
  private getStatusText(statusId: number): string {
    const statusMap: { [key: number]: string } = {
      1: 'Pendiente',
      2: 'Confirmada',
      3: 'Cancelada',
      4: 'Completada',
      5: 'Abandonada',
    };
    return statusMap[statusId] || 'Desconocido';
  }

  // Método para cargar datos del tour
  private loadTourData(tourId: number): void {
    this.tourNetService.getTourById(tourId).subscribe({
      next: (tour) => {
        // Actualizar el título del tour
        this.bookingData.title = tour.name || `Tour ${tourId}`;

        // Actualizar el nombre del tour en bookingImages
        if (this.bookingImages.length > 0) {
          this.bookingImages[0].name = tour.name || `Tour ${tourId}`;
          this.bookingImages[0].tourName = tour.name || `Tour ${tourId}`;
        }
      },
      error: (error) => {
        console.error('Error loading tour data:', error);
        this.bookingData.title = `Tour ${tourId}`;
        if (this.bookingImages.length > 0) {
          this.bookingImages[0].name = `Tour ${tourId}`;
          this.bookingImages[0].tourName = `Tour ${tourId}`;
        }
      },
    });

    // Cargar imagen del tour desde CMS
    this.loadTourImage(tourId);
  }

  // Método para cargar imagen del tour desde CMS
  private loadTourImage(tourId: number): void {
    this.cmsTourService.getAllTours({ tourId: tourId }).subscribe({
      next: (cmsTours) => {
        if (cmsTours && cmsTours.length > 0 && cmsTours[0].imageUrl) {
          if (this.bookingImages.length > 0) {
            this.bookingImages[0].imageUrl = cmsTours[0].imageUrl;
          }
        }
      },
      error: (error) => {
        console.error('Error loading tour image:', error);
      },
    });
  }

  // Método para cargar datos del retailer
  private loadRetailerData(retailerId: number): void {
    this.retailerService.getRetailerById(retailerId).subscribe({
      next: (retailer) => {
        // Actualizar el nombre del retailer
        this.bookingData.retailer = retailer.name || `Retailer ${retailerId}`;

        // Actualizar el retailer en bookingImages
        if (this.bookingImages.length > 0) {
          this.bookingImages[0].retailer =
            retailer.name || `Retailer ${retailerId}`;
        }
      },
      error: (error) => {
        console.error('Error loading retailer data:', error);
        this.bookingData.retailer = `Retailer ${retailerId}`;
        if (this.bookingImages.length > 0) {
          this.bookingImages[0].retailer = `Retailer ${retailerId}`;
        }
      },
    });
  }

  // Método para cargar datos del departure
  private loadDepartureData(departureId: number): void {
    this.departureService.getById(departureId).subscribe({
      next: (departure) => {
        // Actualizar la fecha de salida en bookingData
        if (departure.departureDate) {
          this.bookingData.date = departure.departureDate;
        }

        // Actualizar la fecha de salida en bookingImages
        if (this.bookingImages.length > 0 && departure.departureDate) {
          this.bookingImages[0].departureDate = departure.departureDate;
        }
      },
      error: (error) => {
        console.error('Error loading departure data:', error);
        // Mantener la fecha por defecto si hay error
      },
    });
  }

  // Actualizar información de las imágenes
  updateBookingImages(reservation: IReservationResponse): void {
    if (this.bookingImages.length > 0) {
      // Inicializar con valores básicos (los nombres se actualizarán en loadTourData y loadRetailerData)
      this.bookingImages[0] = {
        ...this.bookingImages[0],
        name: 'Cargando...',
        tourName: 'Cargando...',
        imageUrl: 'https://picsum.photos/400/200', // Imagen temporal
        retailer: 'Cargando...',
        creationDate: reservation.createdAt
          ? new Date(reservation.createdAt).toLocaleDateString()
          : '',
        departureDate: reservation.reservedAt
          ? new Date(reservation.reservedAt).toLocaleDateString()
          : '',
        passengers: reservation.totalPassengers,
        price: reservation.totalAmount,
      };
    }
  }

  // Actualizar información de pagos
  updatePaymentInfo(reservation: IReservationResponse): void {
    // Se obtiene el total de la reserva
    const total = reservation.totalAmount;
    // Guardamos el total para pasarlo al componente de pagos
    this.bookingTotal = total;

    // Actualizamos la información de pagos a nivel local
    this.paymentInfo = {
      totalPrice: total,
      pendingAmount: total, // Por defecto todo está pendiente
      paidAmount: 0, // Por defecto no hay pagos
    };

    // Crear un historial básico con el total como pendiente
    this.paymentHistory = [
      {
        bookingID: this.bookingId,
        amount: total,
        publicID: '',
        status: PaymentStatus.PENDING,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
      },
    ];

    // Actualizar pagos programados
    this.upcomingPayments = [];
    if (this.paymentInfo.pendingAmount > 0) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      this.upcomingPayments.push({
        date: futureDate.toISOString().split('T')[0],
        amount: this.paymentInfo.pendingAmount,
      });
    }
  }

  // Método addActivity adaptado para trabajar con el componente hijo
  addActivity(activityId: string): void {
    const activityIndex = this.availableActivities.findIndex(
      (act) => act.id === activityId
    );

    if (activityIndex !== -1) {
      const activity = this.availableActivities[activityIndex];

      // Actualizar el estado de la actividad
      activity.isIncluded = true;

      // Añadir a las actividades incluidas
      this.bookingActivities.push({ ...activity });

      // Quitar de las disponibles
      this.availableActivities.splice(activityIndex, 1);

      // Añadir al resumen del viaje
      this.tripItems.push({
        quantity: 1,
        unitPrice: activity.priceValue,
        value: activity.priceValue,
        description: activity.title,
      });

      this.messageService.add({
        key: 'center',
        severity: 'success',
        summary: 'Actividad añadida',
        detail: `Se ha añadido la actividad ${activity.title}`,
        life: 3000,
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  cancelBooking(): void {
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
    this.paymentInfo.paidAmount += amount;
    this.paymentInfo.pendingAmount -= amount;

    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(
      today.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${today.getFullYear()}`;

    // Prepend a complete Payment object (using minimal defaults)
    this.paymentHistory.unshift({
      bookingID: this.bookingId,
      amount: amount,
      publicID: '', // default empty until set by backend
      status: PaymentStatus.COMPLETED,
      createdAt: formattedDate,
      updatedAt: formattedDate,
      // Optionals can be left undefined or added as needed
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

  calculateTotal(item: TripItemData): number {
    return item.quantity * item.unitPrice; // Multiplicar cantidad por valor unitario
  }

  // Método para formatear fecha corta (ej: "3 Jun")
  formatDateShort(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const months = [
        'Ene',
        'Feb',
        'Mar',
        'Abr',
        'May',
        'Jun',
        'Jul',
        'Ago',
        'Sep',
        'Oct',
        'Nov',
        'Dic',
      ];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    } catch (e) {
      return dateStr;
    }
  }
}
