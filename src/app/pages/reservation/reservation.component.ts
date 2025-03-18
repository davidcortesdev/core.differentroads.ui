import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil, catchError, EMPTY, finalize } from 'rxjs';
import { BookingsService } from '../../core/services/bookings.service';

interface TravelerInfo {
  name: string;
  email: string;
  phone: string;
  gender: string;
  room: string;
}

interface Flight {
  date: string;
  airline: {
    name: string;
    logo: string;
  };
  departure: {
    time: string;
    airport: string;
  };
  arrival: {
    time: string;
    airport: string;
  };
  duration: string;
  flightNumber: string;
  type: 'direct' | 'layover';
  layoverCity?: string;
}

interface PriceDetail {
  description: string;
  amount: number;
  quantity: number;
  total: number;
}

interface PaymentInfo {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  lastPaymentDate: string;
  lastPaymentDetails: string;
  nextPaymentDetails: string;
}

interface BankInfo {
  name: string;
  account: string;
  beneficiary: string;
  concept: string;
}

interface ReservationInfo {
  status: 'confirm' | 'rq' | 'transfer';
  reservationNumber: string;
  date: string;
  amount: string;
  customerName: string;
  tripDetails: {
    destination: string;
    period: string;
    travelers: string;
  };
  travelers: TravelerInfo[];
}

@Component({
  selector: 'app-reservation',
  standalone: false,
  templateUrl: './reservation.component.html',
  styleUrls: ['./reservation.component.scss'],
  providers: [MessageService],
})
export class ReservationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  loading = true;
  error = false;
  bookingId: string = '';

  reservationInfo: ReservationInfo = {
    status: 'transfer',
    reservationNumber: '#80276',
    date: '28/11/2024',
    amount: '200€',
    customerName: 'Laura Segarra',
    tripDetails: {
      destination: 'Nepal, namasté desde el techo del mundo',
      period: '02/03/2025 - 12/03/2025',
      travelers: '2 Adultos',
    },
    travelers: [
      {
        name: 'Laura Segarra Marín',
        email: 'lsegarra@differentroads.es',
        phone: '+34 638 815 010',
        gender: 'Femenino (mujer)',
        room: 'Individual',
      },
      {
        name: 'Patricia Sanchis Alcaraz',
        email: 'lsegarra@differentroads.es',
        phone: '+34 638 815 010',
        gender: 'Femenino (mujer)',
        room: 'Individual',
      },
    ],
  };

  bankInfo: BankInfo[] = [
    {
      name: 'CaixaBank, S.A',
      account: 'ES35 2100 1463 1702 0013 5710',
      beneficiary: 'Different Roads S.L',
      concept: '784932 Laura Segarra',
    },
    {
      name: 'Banco Santander',
      account: 'ES35 2100 1463 1702 0013 5710',
      beneficiary: 'Different Roads S.L',
      concept: '784932 Laura Segarra',
    },
  ];

  flights: Flight[] = [
    {
      date: '02/03/2025',
      airline: {
        name: 'QATAR Airways',
        logo: 'https://picsum.photos/id/1/200/300',
      },
      departure: {
        time: '01:15',
        airport: 'DOH',
      },
      arrival: {
        time: '01:15',
        airport: 'DOH',
      },
      duration: '14 h',
      flightNumber: 'QR648',
      type: 'layover',
      layoverCity: 'Loremipsum',
    },
    {
      date: '12/03/2025',
      airline: {
        name: 'QATAR Airways',
        logo: 'https://picsum.photos/id/1/200/300',
      },
      departure: {
        time: '01:15',
        airport: 'DOH',
      },
      arrival: {
        time: '01:15',
        airport: 'DOH',
      },
      duration: '14 h',
      flightNumber: 'QR648',
      type: 'direct',
    },
  ];

  priceDetails: PriceDetail[] = [
    {
      description: 'Precio base',
      amount: 600,
      quantity: 2,
      total: 1200,
    },
    {
      description: 'Suplemento individual',
      amount: 250,
      quantity: 2,
      total: 500,
    },
    {
      description: 'Paseo en lago kawaguchi',
      amount: 250,
      quantity: 2,
      total: 345,
    },
    {
      description: 'Suplemento ciudad salida',
      amount: 1000,
      quantity: 2,
      total: 1345,
    },
  ];

  paymentInfo: PaymentInfo = {
    totalAmount: 3595,
    paidAmount: 1200,
    remainingAmount: 2395,
    lastPaymentDate: '16/12/2024',
    lastPaymentDetails: 'Pago de 200€ a través de la web',
    nextPaymentDetails: 'Antes del 6/01/2025 de 725€',
  };

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private bookingsService: BookingsService
  ) {}

  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.bookingId = params['id'];
      if (this.bookingId) {
        this.getBookingData();
      } else {
        this.error = true;
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo encontrar el ID de reserva en la URL.',
        });
      }
    });
  }

  getBookingData() {
    this.loading = true;
    this.bookingsService
      .getBookingById(this.bookingId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error = true;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los datos de la reserva.',
          });
          console.error('Error fetching booking:', err);
          return EMPTY;
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((booking) => {
        this.mapBookingToReservationInfo(booking);
      });
  }

  mapBookingToReservationInfo(booking: any) {
    // Determine the status based on booking.status
    let status: 'confirm' | 'rq' | 'transfer' = 'transfer';

    switch (booking.status?.toLowerCase()) {
      case 'confirmed':
        status = 'confirm';
        break;
      case 'on_request':
      case 'rq':
        status = 'rq';
        break;
      default:
        status = 'transfer';
    }

    // Extract travelers information
    const travelers: TravelerInfo[] =
      booking.extraData?.travelers?.map((t: any) => ({
        name: `${t.firstName} ${t.lastName}`,
        email: t.email || booking.owner || '',
        phone: t.phone || '',
        gender: t.gender || '',
        room: t.roomType || 'Individual',
      })) || [];

    // Update reservationInfo
    this.reservationInfo = {
      status: status,
      reservationNumber: `#${booking.ID || booking.externalID}`,
      date: new Date(booking.createdAt || Date.now()).toLocaleDateString(
        'es-ES'
      ),
      amount: this.calculatePaidAmount(booking),
      customerName: booking.extraData?.customerName || '',
      tripDetails: {
        destination:
          booking.periodData?.tour?.name ||
          booking.extraData?.destination ||
          '',
        period: this.formatTripPeriod(booking),
        travelers: `${booking.travelersNumber || 0} ${
          booking.travelersNumber === 1 ? 'Adulto' : 'Adultos'
        }`,
      },
      travelers: travelers,
    };

    // Also update payments, flights, etc. if present in the booking
    this.updatePaymentInfo(booking);
    this.updateFlightsInfo(booking);
    this.updatePriceDetails(booking);
  }

  formatTripPeriod(booking: any): string {
    const startDate =
      booking?.periodData?.dayOne || booking.extraData?.startDate;
    const endDate =
      booking?.periodData?.returnDate || booking.extraData?.endDate;

    if (!startDate || !endDate) return '';

    // Format dates as DD/MM/YYYY in UTC
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', { timeZone: 'UTC' });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  calculatePaidAmount(booking: any): string {
    let amount = 0;

    if (
      booking.extraData?.payments &&
      Array.isArray(booking.extraData.payments)
    ) {
      booking.extraData.payments.forEach((payment: any) => {
        if (payment.status === 'completed') {
          amount += Number(payment.amount) || 0;
        }
      });
    }

    return `${amount}€`;
  }

  updatePaymentInfo(booking: any) {
    if (booking.extraData?.paymentInfo) {
      this.paymentInfo = {
        totalAmount:
          booking.extraData.paymentInfo.totalAmount ||
          this.paymentInfo.totalAmount,
        paidAmount:
          booking.extraData.paymentInfo.paidAmount ||
          this.paymentInfo.paidAmount,
        remainingAmount:
          booking.extraData.paymentInfo.remainingAmount ||
          this.paymentInfo.remainingAmount,
        lastPaymentDate:
          booking.extraData.paymentInfo.lastPaymentDate ||
          this.paymentInfo.lastPaymentDate,
        lastPaymentDetails:
          booking.extraData.paymentInfo.lastPaymentDetails ||
          this.paymentInfo.lastPaymentDetails,
        nextPaymentDetails:
          booking.extraData.paymentInfo.nextPaymentDetails ||
          this.paymentInfo.nextPaymentDetails,
      };
    }
  }

  updateFlightsInfo(booking: any) {
    if (booking.flights && Array.isArray(booking.flights)) {
      // Map booking flight data to Flight interface
      this.flights = booking.flights.map((flight: any) => ({
        date: new Date(flight.date).toLocaleDateString('es-ES'),
        airline: {
          name: flight.airline?.name || '',
          logo: flight.airline?.logo || 'https://picsum.photos/id/1/200/300',
        },
        departure: {
          time: flight.departure?.time || '',
          airport: flight.departure?.airport || '',
        },
        arrival: {
          time: flight.arrival?.time || '',
          airport: flight.arrival?.airport || '',
        },
        duration: flight.duration || '',
        flightNumber: flight.flightNumber || '',
        type: flight.layoverCity ? 'layover' : 'direct',
        layoverCity: flight.layoverCity || undefined,
      }));
    }
  }

  updatePriceDetails(booking: any) {
    if (booking.priceData && Array.isArray(booking.priceData)) {
      this.priceDetails = booking.priceData.map((item: any) => ({
        description: item.description || '',
        amount: Number(item.amount || 0),
        quantity: Number(item.quantity || 1),
        total: Number(item.total || item.amount * item.quantity || 0),
      }));
    }
  }

  onBasicUploadAuto(event: any) {
    // Verifica si se subieron archivos
    if (event.files && event.files.length > 0) {
      const file = event.files[0]; // Obtiene el primer archivo subido

      // Muestra una notificación de éxito
      this.messageService.add({
        severity: 'success',
        summary: 'Archivo subido',
        detail: `El archivo ${file.name} se ha subido correctamente.`,
      });

      // Aquí puedes agregar lógica adicional, como enviar el archivo a un servidor
      console.log('Archivo subido:', file);

      // If upload is successful and we have a bookingId, update the booking with payment info
      if (event.files && event.files.length > 0 && this.bookingId) {
        const file = event.files[0];

        // Here you would normally upload the file to your server
        // Then update the booking with payment voucher info
        /* Example (not implementing full upload logic):
        this.bookingsService.uploadVoucher(this.bookingId, 'paymentId', {
          file: file,
          // other voucher data
        }).subscribe({
          next: (response) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Archivo subido',
              detail: 'El justificante se ha subido correctamente.'
            });
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al subir el justificante.'
            });
          }
        });
        */
      }
    } else {
      // Muestra una notificación de error si no se subió ningún archivo
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se ha seleccionado ningún archivo.',
      });
    }
  }

  get totalPrice(): number {
    return this.priceDetails.reduce((sum, item) => sum + item.total, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
