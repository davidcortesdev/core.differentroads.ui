import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil, catchError, EMPTY, finalize } from 'rxjs';
import { BookingsService } from '../../core/services/bookings.service';
import {
  ReservationInfo,
  BankInfo,
  Flight,
  PriceDetail,
  PaymentInfo,
} from '../../core/models/reservation/reservation.model';
import { BookingMappingService } from '../../core/services/booking-mapping.service';
import { Payment } from '../../core/models/bookings/payment.model';
import { Booking } from '../../core/models/bookings/booking.model';

@Component({
  selector: 'app-reservation',
  standalone: false,
  templateUrl: './reservation.component.html',
  styleUrls: ['./reservation.component.scss'],
  providers: [MessageService, BookingMappingService],
})
export class ReservationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  loading = true;
  error = false;
  bookingId: string = '';
  nextDayDate: string;

  reservationInfo: ReservationInfo | undefined;
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
  flights: Flight[] = [];
  priceDetails: PriceDetail[] = [];
  paymentInfo: Payment | undefined;
  paymentID: string = '';
  bookingData: Booking | undefined;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private bookingsService: BookingsService,
    private bookingMapper: BookingMappingService
  ) {
    // Calculate next day's date in the format dd/mm/yyyy
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.nextDayDate = tomorrow.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

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

      this.paymentID = params['paymentID'];
      if (this.paymentID) {
        this.getPaymentData();
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
        // Use the mapping service to transform the booking data
        this.reservationInfo = this.bookingMapper.mapToReservationInfo(booking);
        this.flights = this.bookingMapper.mapToFlights(booking);
        this.priceDetails = this.bookingMapper.mapToPriceDetails(booking);

        // Update bank info with booking-specific data
        if (booking.ID) {
          this.bankInfo.forEach((bank) => {
            bank.concept = `${booking.ID} ${
              this.reservationInfo?.customerName || ''
            }`;
          });
        }

        this.bookingData = booking;

        console.log('Booking data:', booking);
      });
  }

  getPaymentData() {
    this.loading = true;
    this.bookingsService
      .getPaymentsByPublicID(this.paymentID)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error = true;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los datos del pago.',
          });
          console.error('Error fetching payment:', err);
          return EMPTY;
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((payment) => {
        console.log('Payment data:', payment);
        this.paymentInfo = payment;
      });
  }

  onBasicUploadAuto(event: any) {
    if (event.files && event.files.length > 0) {
      const file = event.files[0];

      this.messageService.add({
        severity: 'success',
        summary: 'Archivo subido',
        detail: `El archivo ${file.name} se ha subido correctamente.`,
      });

      // Here you would upload the file to your server
      // this.bookingsService.uploadVoucher(this.bookingId, file)
      //   .pipe(takeUntil(this.destroy$))
      //   .subscribe({
      //     next: (response) => {
      //       // Handle successful upload
      //     },
      //     error: (err) => {
      //       this.messageService.add({
      //         severity: 'error',
      //         summary: 'Error',
      //         detail: 'Error al subir el justificante.'
      //       });
      //     }
      //   });
    } else {
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
