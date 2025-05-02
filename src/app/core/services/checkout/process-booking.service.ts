import { Injectable } from '@angular/core';
import { BookingsService } from '../bookings.service';
import { SummaryService } from './summary.service';
import { PaymentOptionsService } from './paymentOptions.service';
import { TextsService } from './texts.service';
import { PricesService } from './prices.service';
import { TravelersService } from './travelers.service';
import { AmadeusService } from '../amadeus.service';
import {
  Booking,
  BookingCreateInput,
} from '../../models/bookings/booking.model';
import { Order } from '../../models/orders/order.model';
import { Flight } from '../../models/tours/flight.model';
import { Period } from '../../models/tours/period.model';
import { ActivitiesService } from './activities.service';

@Injectable({
  providedIn: 'root',
})
export class ProcessBookingService {
  private currentError: string | null = null;

  private stepsCompleted = {
    bookingCreated: false,
    travelersSaved: false,
    flightHandled: false,
    orderBooked: false,
  };

  private currentBookingID: string | null = null;
  private currentBookingSID: string | null = null;
  private currentOrder: Order | undefined;

  constructor(
    private bookingsService: BookingsService,
    private summaryService: SummaryService,
    private paymentOptionsService: PaymentOptionsService,
    private textsService: TextsService,
    private pricesService: PricesService,
    private travelersService: TravelersService,
    private amadeusService: AmadeusService,
    private activityService: ActivitiesService
  ) {}

  async processBooking(
    orderDetails: Order | null,
    tourID: string,
    tourName: string,
    periodID: string,
    periodData: Period,
    selectedFlight: Flight | null,
    summary: { qty: number; value: number; description: string }[],
    total: number
  ): Promise<{ bookingID: string; code: string }> {
    try {
      // Evita reprocesamiento si ya se completó la orden
      if (
        this.currentBookingID &&
        this.currentBookingSID &&
        this.stepsCompleted.orderBooked
      ) {
        console.log('Booking already completed, returning existing values.');
        return {
          bookingID: this.currentBookingID,
          code: this.currentBookingSID,
        };
      }

      // Paso 1: actualizar pago
      this.updatePaymentInformation();

      // Paso 2: preparar datos booking
      const bookingData = this.prepareBookingData(
        orderDetails,
        tourID,
        tourName,
        periodID,
        periodData,
        summary,
        total
      );

      // Paso 3: guardar textos
      this.savePeriodAndTourInfo(periodID, periodData, tourID);

      // Paso 4: crear booking si no existe
      if (!this.currentBookingID || !this.stepsCompleted.bookingCreated) {
        const response = await this.createBooking(
          orderDetails?._id!,
          bookingData
        );
        this.currentBookingID = response.bookingID;
        this.currentBookingSID = response.code;
        this.currentOrder = response.order;
        this.stepsCompleted.bookingCreated = true;
      } else {
        // Actualizar booking existente
        const response = await this.updateBooking(this.currentBookingID, {
          periodData: bookingData,
          optionalActivitiesRef: this.activityService.getSelectedActivities(),
          flights: selectedFlight ? [selectedFlight] : [],
        });
      }

      // Paso 5: manejar vuelo
      if (
        selectedFlight?.source === 'amadeus' &&
        !this.stepsCompleted.flightHandled
      ) {
        try {
          await this.handleAmadeusFlight(
            selectedFlight,
            this.currentBookingID!,
            this.currentBookingSID!,
            this.currentOrder
          );
          this.stepsCompleted.flightHandled = true;
        } catch (flightError) {
          // Capturar y propagar el error de vuelo específicamente
          console.error('Flight booking error:', flightError);
          throw flightError;
        }
      }

      // Paso 6: guardar viajeros
      if (!this.stepsCompleted.travelersSaved) {
        await this.saveTravelers(
          this.currentBookingID!,
          this.currentBookingSID!,
          this.currentOrder
        );
        this.stepsCompleted.travelersSaved = true;
      }

      // Paso 7: reservar orden
      if (!this.stepsCompleted.orderBooked) {
        await this.bookOrder(
          this.currentBookingID!,
          this.currentBookingSID!,
          this.currentOrder
        );
        this.stepsCompleted.orderBooked = true;
      }

      // Almacenar resultado y reiniciar estado
      const result = {
        bookingID: this.currentBookingID!,
        code: this.currentBookingSID!,
      };
      this.resetState();
      return result;
    } catch (error) {
      console.error('Error in processBooking:', error);
      this.currentError =
        error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  public resetState(): void {
    console.log('Resetting booking state');
    this.currentBookingID = null;
    this.currentBookingSID = null;
    this.currentOrder = undefined;
    this.stepsCompleted = {
      bookingCreated: false,
      travelersSaved: false,
      flightHandled: false,
      orderBooked: false,
    };
  }

  private updatePaymentInformation(): void {
    const currentOrder = this.summaryService.getOrderValue();
    if (currentOrder) {
      const paymentOption = this.paymentOptionsService.getPaymentOption();
      if (paymentOption) {
        currentOrder.payment = paymentOption;
        this.summaryService.updateOrder(currentOrder);
      }
    }
  }

  private prepareBookingData(
    orderDetails: Order | null,
    tourID: string,
    tourName: string,
    periodID: string,
    periodData: Period,
    summary: { qty: number; value: number; description: string }[],
    total: number
  ): BookingCreateInput {
    return {
      tour: {
        id: tourID,
        name: tourName,
        priceData: this.pricesService.getPriceDataById(tourID),
      },
      textSummary: this.textsService.getTextsData(),
      total,
      priceData: this.pricesService.getPriceDataById(periodID),
      id: orderDetails?._id || '',
      extendedTotal: summary,
      dayOne: periodData.dayOne,
      numberOfDays: periodData.numberOfDays,
      returnDate: periodData.returnDate,
      tourID,
      paymentTerms: '',
      redeemPoints: 0,
      usePoints: {},
      name: periodData.name,
      externalID: periodID,
      payment: this.paymentOptionsService.getPaymentOption() || undefined,
    };
  }

  private savePeriodAndTourInfo(
    periodID: string,
    periodData: Period,
    tourID: string
  ): void {
    this.textsService.updateText('period', periodID, periodData);
    if (periodData?.tourName) {
      this.textsService.updateText('tour', tourID, {
        name: periodData.tourName,
      });
    }
  }

  private async createBooking(
    orderId: string,
    bookingData: BookingCreateInput
  ): Promise<{ bookingID: string; code: string; order: Order }> {
    return new Promise((resolve, reject) => {
      this.bookingsService.createBooking(orderId, bookingData).subscribe({
        next: (response) => {
          resolve({
            bookingID: response.bookingID,
            code: response.code,
            order: {
              ...response.order,
              payment:
                this.paymentOptionsService.getPaymentOption() || undefined,
            },
          });
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  private async updateBooking(
    bookingID: string,
    bookingData: Partial<Booking>
  ): Promise<{ code: string }> {
    return new Promise((resolve, reject) => {
      this.bookingsService.updateBooking(bookingID, bookingData).subscribe({
        next: (response) => {
          resolve({
            code: response.code,
          });
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  private async handleAmadeusFlight(
    selectedFlight: Flight,
    bookingID: string,
    bookingSID: string,
    order: Order | undefined
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const travelers = this.travelersService.getTravelers();

      const missingData = travelers.some(
        (t) =>
          !t.travelerData?.passportID ||
          !t.travelerData?.name ||
          !t.travelerData?.surname
      );

      if (missingData) {
        reject(
          new Error('Información de viajeros incompleta para reserva de vuelo')
        );
        return;
      }

      const passengerData = travelers.map((traveler) => ({
        id: traveler._id || '',
        dateOfBirth: traveler.travelerData?.birthdate || '1982-01-16',
        name: {
          firstName: traveler.travelerData?.name || 'Usuario',
          lastName: traveler.travelerData?.surname || 'Different',
        },
        gender: (traveler.travelerData?.sex as 'MALE' | 'FEMALE') || 'MALE',
        contact: {
          emailAddress:
            traveler.travelerData?.email || 'info@differenttours.es',
          phones: [
            {
              deviceType: 'MOBILE' as 'MOBILE',
              countryCallingCode: '34',
              number: traveler.travelerData?.phone || '300000000',
            },
          ],
        },
        documents: [
          {
            documentType: 'PASSPORT' as 'PASSPORT',
            number: traveler.travelerData?.passportID || 'AA000000',
            issuanceCountry: traveler.travelerData?.nationality || 'ES',
            expiryDate:
              traveler.travelerData?.passportExpirationDate || '2030-01-01',
            validityCountry: traveler.travelerData?.nationality || 'ES',
            nationality: traveler.travelerData?.nationality || 'ES',
            holder: true,
          },
        ],
      }));

      this.amadeusService
        .createFlightOrder(selectedFlight.id, passengerData)
        .subscribe({
          next: () => resolve(),
          error: (err) => {
            console.error('Amadeus flight booking error:', err);
            // Crear un error específico que incluya el código FLIGHT_BOOKING_FAILED
            const errorMessage =
              err.error?.message || 'Error al procesar el vuelo con Amadeus';
            const flightError = new Error(
              `FLIGHT_BOOKING_FAILED: ${errorMessage}`
            );
            reject(flightError);
          },
        });
    });
  }

  private async saveTravelers(
    bookingID: string,
    bookingSID: string,
    order: Order | undefined
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bookingsService
        .saveTravelers(bookingID, {
          bookingSID,
          bookingID,
          order: order as Order,
        })
        .subscribe({
          next: () => resolve(),
          error: (err) => reject(err),
        });
    });
  }

  private async bookOrder(
    bookingID: string,
    bookingSID: string,
    order: Order | undefined
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bookingsService
        .bookOrder(bookingID, {
          order,
          code: bookingSID,
        })
        .subscribe({
          next: () => resolve(),
          error: (err) => reject(err),
        });
    });
  }
}
