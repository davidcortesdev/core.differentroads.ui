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
} from '../../core/models/reservation/reservation.model';
import { BookingMappingService } from '../../core/services/booking-mapping.service';
import {
  Payment,
  VoucherReviewStatus,
} from '../../core/models/bookings/payment.model';
import { Booking } from '../../core/models/bookings/booking.model';
import { CloudinaryResponse } from '../../core/services/file-upload.service';

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
      name: 'CaixaBank, S.A.',
      account: 'ES35 2100 1463 1702 0013 5710',
      beneficiary: 'Different Roads S.L',
      concept: '784932 Laura Segarra',
    },
    {
      name: 'BANCO SANTANDER, S.A.',
      account: 'ES55 0049 0265 4423 1052 3788',
      beneficiary: 'Different Roads S.L',
      concept: '784932 Laura Segarra',
    },
  ];
  flights: Flight[] = [];
  priceDetails: PriceDetail[] = [];
  paymentInfo: Payment | undefined;
  paymentID: string = '';
  bookingData: Booking | undefined;
  uploadedVoucher: CloudinaryResponse | null = null;
  paymentStatus: 'confirm' | 'rq' | 'transfer' | undefined;

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
        // Mapear la reserva utilizando booking y, de estar disponible, paymentInfo.
        this.reservationInfo = this.bookingMapper.mapToReservationInfo(
          booking,
          this.paymentInfo
        );

        this.flights = this.bookingMapper.mapToFlights(booking);
        this.priceDetails = this.bookingMapper.mapToPriceDetails(booking);

        // Actualizar bankInfo con datos específicos del booking.
        if (booking.code) {
          this.bankInfo.forEach((bank) => {
            bank.concept = `${booking.code} ${
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
        if (payment.vouchers && payment.vouchers.length > 0) {
          this.uploadedVoucher = {
            secure_url: payment.vouchers[0].fileUrl,
            public_id: payment.vouchers[0].id,
          } as CloudinaryResponse;
        }

        if (
          this.paymentInfo?.status === 'PENDING' &&
          this.paymentInfo?.method === 'transfer'
        ) {
          this.paymentStatus = 'transfer';
        } else {
          this.paymentStatus = undefined;
        }

        // Si ya se cargó el booking, actualiza la información de la reserva.
        if (this.bookingData) {
          this.reservationInfo = this.bookingMapper.mapToReservationInfo(
            this.bookingData,
            this.paymentInfo
          );
        }
      });
  }

  handleVoucherUpload(response: CloudinaryResponse) {
    this.uploadedVoucher = response;
    // Aquí se podría actualizar la reserva con la URL del voucher. Código de ejemplo comentado.
    if (this.bookingId && response) {
      this.bookingsService
        .uploadVoucher(this.bookingId, this.paymentID, {
          fileUrl: response.secure_url,
          uploadDate: new Date(),
          reviewStatus: VoucherReviewStatus.PENDING,
          id: response.public_id,
          metadata: response,
        })
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.handleVoucherError(error);
            return EMPTY;
          })
        )
        .subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Justificante subido',
            detail: 'El justificante se ha subido correctamente.',
          });
          // Refetch the reservation state after uploading voucher
          this.getBookingData();
          this.getPaymentData();
        });
    }
  }

  handleVoucherError(error: any) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al subir el justificante.',
    });
  }

  // Nuevo método para visualizar el voucher subido
  viewVoucher(): void {
    if (this.uploadedVoucher && this.uploadedVoucher.secure_url) {
      window.open(this.uploadedVoucher.secure_url, '_blank');
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
