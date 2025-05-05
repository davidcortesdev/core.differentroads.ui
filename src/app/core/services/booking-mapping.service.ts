import { Injectable } from '@angular/core';
import { Booking } from '../models/bookings/booking.model';
import {
  ReservationInfo,
  PriceDetail,
  PaymentInfo,
  TravelerInfo,
} from '../models/reservation/reservation.model';
import { BookingTraveler } from '../models/bookings/booking-traveler.model';
import { Payment, PaymentStatus } from '../models/bookings/payment.model';

@Injectable()
export class BookingMappingService {
  mapToReservationInfo(booking: Booking, payment?: Payment): ReservationInfo {
    let status: 'confirm' | 'rq' | 'transfer';

    // Si se dispone de información del pago, se determina el estado basándose en él.

    status =
      booking.status?.toLowerCase() === 'booked'
        ? 'confirm'
        : ['on_request', 'rq'].includes(booking.status?.toLowerCase())
        ? 'rq'
        : 'confirm';

    // Extract travelers information
    const travelers: TravelerInfo[] =
      booking.travelers?.map((t: BookingTraveler) => {
        // Get room name from periodData if available
        let roomName = t.periodReservationModeID || 'Individual';

        // Check if we have room information in periodData
        if (
          booking.periodData?.['textSummary']?.['rooms'] &&
          t.periodReservationModeID
        ) {
          const roomInfo =
            booking.periodData['textSummary']['rooms'][
              t.periodReservationModeID
            ];
          if (roomInfo && roomInfo.name) {
            roomName = roomInfo.name;
          }
        }

        return {
          name: `${t.travelerData?.['name']} ${t.travelerData?.['surname']}`,
          email: t.travelerData?.['email'] || booking.owner || '',
          phone: t.travelerData?.['phone'] || '',
          gender: this.formatGender(t.travelerData?.['sex'] || ''),
          room: roomName,
        };
      }) || [];

    // Nuevo cálculo basado en ageGroup (values: 'Adultos' o 'Niños')
    const travelerAgeSummary =
      booking.travelers?.reduce((acc, t) => {
        const ageGroup = t.travelerData?.ageGroup || 'Adultos';
        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    const summaryParts: string[] = [];
    if (travelerAgeSummary['Adultos']) {
      summaryParts.push(
        `${travelerAgeSummary['Adultos']} ${
          travelerAgeSummary['Adultos'] === 1 ? 'Adulto' : 'Adultos'
        }`
      );
    }
    if (travelerAgeSummary['Niños']) {
      summaryParts.push(
        `${travelerAgeSummary['Niños']} ${
          travelerAgeSummary['Niños'] === 1 ? 'Niño' : 'Niños'
        }`
      );
    }
    const travelersSummary = summaryParts.join(', ');

    // Obtener el traveler que sea lead para extraer customerName
    const leadTraveler = booking.travelers?.find((t) => t.lead);
    const customerName = leadTraveler
      ? `${leadTraveler.travelerData?.name} ${leadTraveler.travelerData?.surname}`.trim()
      : '';

    // Store the ReservationInfo in a variable
    const reservationInfo: ReservationInfo = {
      status: status,
      reservationNumber: `#${booking.code || booking.externalID}`,
      date: new Date(booking.createdAt || Date.now()).toLocaleDateString(
        'es-ES'
      ),
      amount: this.calculatePaidAmount(booking),
      customerName: customerName, // Cambiado para usar leadTraveler
      tripDetails: {
        destination:
          booking.periodData?.['tour']?.name ||
          booking.extraData?.destination ||
          '',
        period: this.formatTripPeriod(booking),
        travelers: travelersSummary,
      },
      travelers: travelers,
      totalAmount: booking.periodData?.['total'],
    };

    return reservationInfo;
  }

  mapToPriceDetails(booking: Booking): PriceDetail[] {
    if (booking.periodData && booking.periodData['extendedTotal']) {
      return booking.periodData['extendedTotal'].map((item: any) => ({
        description: item.description || '',
        amount: item.value || 0,
        quantity: item.qty || 0,
        total: item.value * item.qty || 0,
      }));
    }
    return [];
  }

  mapToPaymentInfo(booking: Booking): PaymentInfo {
    return {
      totalAmount: booking.periodData?.['total'] || 0,
    };
  }

  private formatGender(gender: string): string {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'Hombre';
      case 'female':
        return 'Mujer';
      default:
        return '';
    }
  }

  private formatTripPeriod(booking: any): string {
    const startDate =
      booking?.periodData?.dayOne || booking.extraData?.startDate;
    const endDate =
      booking?.periodData?.returnDate || booking.extraData?.endDate;

    if (!startDate || !endDate) return '';

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', { timeZone: 'UTC' });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  private calculatePaidAmount(booking: any): string {
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
}
