import { Component, OnInit } from '@angular/core';
import { OrdersService } from '../../core/services/orders.service';
import { PeriodsService } from '../../core/services/periods.service';
import { PriceData } from '../../core/models/commons/price-data.model';
import { TravelersService } from '../../core/services/checkout/travelers.service';
import { SummaryService } from '../../core/services/checkout/summary.service';
import { Order } from '../../core/models/orders/order.model';
import { RoomsService } from '../../core/services/checkout/rooms.service';
import { ReservationMode } from '../../core/models/tours/reservation-mode.model';
import { PricesService } from '../../core/services/checkout/prices.service';
import { ActivitiesService } from '../../core/services/checkout/activities.service';
import { Activity } from '../../core/models/tours/activity.model';
import { FlightsService } from '../../core/services/checkout/flights.service';
import { Flight } from '../../core/models/tours/flight.model';
import { ActivatedRoute } from '@angular/router';
import { BookingsService } from '../../core/services/bookings.service';
import { BookingCreateInput } from '../../core/models/bookings/booking.model';
import { Period } from '../../core/models/tours/period.model';
import { InsurancesService } from '../../core/services/checkout/insurances.service';
import { Insurance } from '../../core/models/tours/insurance.model';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-checkout',
  standalone: false,
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnInit {
  currentStep: number = 1;
  orderDetails: Order | null = null;
  availableTravelers: string[] = [];

  // Tour information
  tourName: string = '';
  tourDates: string = '';
  travelers: number = 0;
  travelersSelected = {
    adults: 0,
    childs: 0,
    babies: 0,
  };

  // Cart information
  activities: Activity[] = [];
  selectedFlight: Flight | null = null;
  selectedInsurances: Insurance[] = [];
  summary: { qty: number; value: number; description: string }[] = [];
  subtotal: number = 0;
  total: number = 0;
  prices:
    | {
        [key: string]: {
          priceData: PriceData[];
          availability?: number | undefined;
        };
      }
    | undefined = undefined;

  order: Order | null = null;

  // summary
  rooms: ReservationMode[] = [];
  tourID: string = '';
  periodID: string = '';
  periodData!: Period;
  flightlessOption: Flight | null = null;

  constructor(
    private ordersService: OrdersService,
    private periodsService: PeriodsService,
    private travelersService: TravelersService,
    private summaryService: SummaryService,
    private roomsService: RoomsService,
    private pricesService: PricesService,
    private activitiesService: ActivitiesService,
    private flightsService: FlightsService,
    private route: ActivatedRoute,
    private bookingsService: BookingsService,
    private insurancesService: InsurancesService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    const orderId =
      this.route.snapshot.paramMap.get('id') || '67b702314d0586617b90606b';
    this.ordersService.getOrderDetails(orderId).subscribe((order) => {
      console.log('Order details:', order);

      this.orderDetails = order;
      this.summaryService.updateOrder(order);

      const periodID = order.periodID;
      this.periodID = periodID;

      this.initializeTravelers(order.travelers || []);
      this.initializeActivities(order.optionalActivitiesRef || []);
      this.initializeFlights(order.flights || []);
      this.initializeInsurances(order.insurancesRef || []);

      this.periodsService
        .getPeriodDetail(periodID, [
          'tourID',
          'tourName',
          'name',
          'dayOne',
          'returnDate',
        ])
        .subscribe((period) => {
          console.log('Period details:', period);
          this.periodData = period;
          this.tourName = period.tourName;

          this.tourID = period.tourID;
          this.tourDates = `
            ${new Date(period.dayOne).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'long',
              timeZone: 'UTC',
            })} - 
            ${new Date(period.returnDate).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'long',
              timeZone: 'UTC',
            })}
          `;
        });

      this.periodsService.getPeriodPrices(periodID).subscribe((prices) => {
        this.prices = prices;
        this.pricesService.updatePrices(prices);
        this.updateOrderSummary();
      });
    });

    this.travelersService.travelersNumbers$.subscribe((data) => {
      this.travelers = data.adults + data.childs + data.babies;
      this.travelersSelected = data;
      this.updateOrderSummary();
    });
    this.travelersService.travelers$.subscribe((travelers) => {
      //this.updateOrderSummary();
    });

    this.summaryService.order$.subscribe((order) => {
      this.order = order;
    });

    this.roomsService.selectedRooms$.subscribe((rooms) => {
      console.log('Selected rooms:', rooms);
      this.rooms = rooms;
      this.updateOrderSummary();
    });

    this.activitiesService.activities$.subscribe((activities) => {
      this.activities = activities;
      this.updateOrderSummary();
    });

    this.flightsService.selectedFlight$.subscribe((flight) => {
      this.selectedFlight = flight;
      this.updateOrderSummary();
    });

    this.insurancesService.selectedInsurances$.subscribe((insurances) => {
      this.selectedInsurances = insurances;
      this.updateOrderSummary();
    });

    this.flightsService.flightlessOption$.subscribe((option) => {
      this.flightlessOption = option;
    });
  }

  /* Inicialization */

  initializeTravelers(travelers: any[]) {
    const travelersCount = {
      adults: 0,
      childs: 0,
      babies: 0,
    };

    const rooms: ReservationMode[] = [];

    travelers.forEach((traveler) => {
      if (traveler.travelerData.ageGroup === 'Adultos') {
        travelersCount.adults++;
      } else if (traveler.travelerData.ageGroup === 'Niños') {
        travelersCount.childs++;
      } else if (traveler.travelerData.ageGroup === 'Bebes') {
        travelersCount.babies++;
      }

      const roomExternalID = traveler.periodReservationModeID;
      const existingRoom = rooms.find(
        (room) => room.externalID === roomExternalID
      );

      if (existingRoom) {
        existingRoom.qty = (existingRoom.qty || 0) + 1;
      } else {
        rooms.push({
          id: '',
          status: '',
          description: '',
          externalID: roomExternalID,
          name: '',
          places: 0,
          qty: 1,
          price: 0,
        });
      }
    });

    if (travelersCount.adults === 0) {
      travelersCount.adults = 1;
    }

    this.travelersService.updateTravelersNumbers(travelersCount);
    this.travelersService.updateTravelers(travelers);
    this.roomsService.updateSelectedRooms(rooms);
  }

  initializeActivities(optionalActivitiesRef: any[]) {
    const activities = optionalActivitiesRef.map((activityRef) => {
      return {
        id: activityRef.id,
        externalID: activityRef.id,
        name: '',
        description: '',
        price: 0,
        status: '',
        activityId: activityRef.id,
        optional: true,
        periodId: this.periodID,
        productType: '',
        travelersAssigned: activityRef.travelersAssigned,
      };
    });

    this.activitiesService.updateActivities(activities);
  }

  initializeFlights(flights: Flight[] | { id: string; externalID: string }[]) {
    if (flights.length > 0) {
      if ('externalID' in flights[0]) {
        this.periodsService.getFlights(this.periodID).subscribe({
          next: (flightsData) => {
            const filteredFlights = flightsData
              .filter(
                (flight) => flight.name && !flight.name.includes('Sin vuelos')
              )
              .map((flight) => {
                return {
                  ...flight,
                  price:
                    this.pricesService.getPriceById(
                      `${flight.outbound.activityID}`,
                      'Adultos'
                    ) +
                    this.pricesService.getPriceById(
                      `${flight.inbound.activityID}`,
                      'Adultos'
                    ),
                };
              });
            const selectedFlight = filteredFlights.find(
              (flight) => flight.externalID === flights[0].externalID
            );

            this.flightsService.updateSelectedFlight(selectedFlight as Flight);
          },
          error: (error) => {
            console.error('Error fetching flights:', error);
          },
        });
      } else {
        this.selectedFlight = null;
      }
      this.flightsService.updateSelectedFlight(this.selectedFlight);
    }
  }

  initializeInsurances(insurancesRef: any[]) {
    const insurances: Insurance[] = insurancesRef.map((insuranceRef) => {
      return {
        id: insuranceRef.id,
        externalID: insuranceRef.id,
        name: '',
        description: '',
        price: 0,
        activityId: insuranceRef.id,
        status: '',
        optional: true,
        periodId: this.periodID,
        productType: '',
        travelersAssigned: insuranceRef.travelersAssigned,
      };
    });

    this.insurancesService.updateSelectedInsurances(insurances);
  }

  /* Summary */
  updateOrderSummary() {
    this.summary = [];

    this.travelersService.updateTravelersWithRooms();

    this.travelersSelected.adults > 0 &&
      this.summary.push({
        qty: this.travelersSelected.adults,
        value:
          this.pricesService.getPriceById(this.tourID, 'Adultos') +
          this.pricesService.getPriceById(this.periodID, 'Adultos'),
        description: 'Paquete básico adultos',
      });

    this.travelersSelected.childs > 0 &&
      this.summary.push({
        qty: this.travelersSelected.childs,
        value:
          this.pricesService.getPriceById(this.tourID, 'Niños') +
          this.pricesService.getPriceById(this.periodID, 'Niños'),
        description: 'Paquete básico niños',
      });

    this.travelersSelected.babies > 0 &&
      this.summary.push({
        qty: this.travelersSelected.babies,
        value:
          this.pricesService.getPriceById(this.tourID, 'Bebes') +
          this.pricesService.getPriceById(this.periodID, 'Bebes'),
        description: 'Bebes',
      });

    this.rooms.forEach((room) => {
      const price =
        this.pricesService.getPriceById(room.externalID, 'Adultos') || 0;
      if (price === 0) return;
      this.summary.push({
        qty: room.qty || 0,
        value: price,
        description: 'Suplemento hab. ' + room.name,
      });
    });

    this.activities.forEach((activity) => {
      const adultsPrice = this.pricesService.getPriceById(
        activity.activityId,
        'Adultos'
      );
      const childsPrice = this.pricesService.getPriceById(
        activity.activityId,
        'Niños'
      );

      const babiesPrice = this.pricesService.getPriceById(
        activity.activityId,
        'Bebes'
      );
      if (adultsPrice === childsPrice) {
        this.summary.push({
          qty: this.travelersSelected.adults + this.travelersSelected.childs,
          value: adultsPrice,
          description: activity.name,
        });
      } else {
        if (adultsPrice) {
          this.summary.push({
            qty: this.travelersSelected.adults,
            value: adultsPrice,
            description: activity.name + ' (adultos)',
          });
        }
        if (childsPrice && this.travelersSelected.childs) {
          this.summary.push({
            qty: this.travelersSelected.childs,
            value: childsPrice,
            description: activity.name + ' (niños)',
          });
        }
      }
      if (babiesPrice) {
        this.summary.push({
          qty: this.travelersSelected.babies,
          value: babiesPrice,
          description: activity.name + ' (bebes)',
        });
      }
    });

    let tempOrderData: Order = { ...this.summaryService.getOrderValue()! };
    const travelersData = this.travelersService.getTravelers();

    tempOrderData['travelers'] = travelersData;
    tempOrderData['optionalActivitiesRef'] = this.activities.map(
      (activity) => ({
        id: activity.activityId,
        _id: activity.id,
        travelersAssigned: travelersData.map(
          (traveler) => traveler._id || '123'
        ),
      })
    );

    if (
      this.selectedFlight &&
      this.selectedFlight.externalID! !== 'undefined'
    ) {
      if (!this.selectedFlight.name.toLowerCase().includes('sin ')) {
        this.summary.push({
          qty:
            this.travelersSelected.adults +
            this.travelersSelected.childs +
            this.travelersSelected.babies,
          value:
            this.selectedFlight.price ||
            this.pricesService.getPriceById(
              this.selectedFlight.externalID,
              'Adultos'
            ) ||
            0,
          description: this.selectedFlight.name,
        });
      }

      tempOrderData['flights'] = [this.selectedFlight];
    }

    if (this.selectedInsurances.length === 0) {
      this.summary.push({
        qty:
          this.travelersSelected.adults +
          this.travelersSelected.childs +
          this.travelersSelected.babies,
        value: 0,
        description: 'Seguro básico',
      });
    }

    if (this.selectedInsurances.length > 0) {
      this.selectedInsurances.forEach((insurance) => {
        this.summary.push({
          qty:
            this.travelersSelected.adults +
            this.travelersSelected.childs +
            this.travelersSelected.babies,
          value: insurance.price || 0,
          description: insurance.name,
        });
      });
      tempOrderData['insurancesRef'] = this.selectedInsurances.map(
        (insurance) => ({
          id: insurance.activityId,
          travelersAssigned: travelersData.map(
            (traveler) => traveler._id || '123'
          ),
        })
      );
    } else {
      tempOrderData['insurancesRef'] = [];
    }

    this.summaryService.updateOrder(tempOrderData);

    this.calculateTotals();
  }

  handleTravelersChange(event: {
    adults: number;
    childs: number;
    babies: number;
  }) {
    this.travelers = event.adults + event.childs + event.babies;
  }

  calculateTotals() {
    this.subtotal = this.summary.reduce(
      (acc, item) => acc + item.value * item.qty,
      0
    );
    this.total = this.subtotal;
  }

  /* Steps and validations */

  nextStep(step: number): boolean {
    switch (step) {
      case 2:
        const { adults, childs, babies } = this.travelersSelected;
        if (childs + babies > adults) {
          this.messageService.add({
            severity: 'error',
            summary: 'Número incorrecto de viajeros',
            detail:
              'La cantidad de niños y bebés no puede superar el número de adultos. Por favor, ajusta la selección.',
          });

          return false;
        }
        const totalTravelers = adults + childs + babies;
        const totalCapacity = this.rooms.reduce(
          (acc, room) => acc + room.places * (room.qty || 1),
          0
        );
        if (totalTravelers > totalCapacity) {
          this.messageService.add({
            severity: 'error',
            summary: 'Selección de habitaciones incorrecta',
            detail:
              'La cantidad de habitaciones seleccionadas no coincide con el número de viajeros.',
          });

          return false;
        }
        break;
      case 3:
        break;
      case 4:
        const travelersComponent =
          this.travelersService.getTravelersComponent();
        if (!travelersComponent.areAllTravelersValid()) {
          return false;
        }
        break;
      default:
        return false;
    }

    this.updateOrderSummary();
    // Llamada a updateOrder sin suscribirse para evitar retraso en la validación de navigation.
    this.updateOrder();
    return true;
  }

  selectFlightlessAndContinue(): boolean {
    if (this.flightlessOption) {
      this.flightsService.updateSelectedFlight(this.flightlessOption);
      return true;
    }
    return false;
  }

  /* Order update */

  updateOrder() {
    console.log('Updating order:', this.summaryService.getOrderValue());

    this.ordersService
      .updateOrder(
        this.summaryService.getOrderValue()!._id,
        this.summaryService.getOrderValue()!
      )
      .subscribe({
        next: (response) => {
          console.log('Order updated:', response);
          return response;
        },
        error: (error) => {
          console.error('Error updating order:', error);
          return error;
        },
      });
  }

  /* Booking create */

  processBooking(): Promise<{ bookingID: string; ID: string }> {
    return new Promise((resolve, reject) => {
      const bookingData: BookingCreateInput = {
        tour: {
          id: this.tourID,
          name: this.tourName,
          priceData: this.pricesService.getPriceDataById(this.tourID),
        },
        summary: '',
        total: this.total,
        priceData: this.pricesService.getPriceDataById(this.periodID),
        id: this.orderDetails?._id || '',
        extendedTotal: this.summary,
        dayOne: this.periodData.dayOne,
        numberOfDays: this.periodData.numberOfDays,
        returnDate: this.periodData.returnDate,
        tourID: this.tourID,
        paymentTerms: '',
        redeemPoints: 0,
        usePoints: {},
        name: this.periodData.name,
        externalID: this.periodID,
      };
      let bookingID = '';
      let bookingSID = '';
      let order: Order | undefined;

      this.bookingsService
        .createBooking(this.orderDetails?._id!, bookingData)
        .subscribe({
          next: (response) => {
            console.log('Booking created:', response);
            bookingID = response.bookingID;
            bookingSID = response.ID;
            order = response.order;

            this.bookingsService
              .saveTravelers(response.bookingID, {
                bookingSID: response.ID,
                bookingID: this.orderDetails?._id!,
                order: response.order as Order,
              })
              .subscribe({
                next: (response) => {
                  console.log('Travelers saved:', response);

                  this.bookingsService
                    .bookOrder(bookingID, {
                      order: order,
                      ID: bookingSID,
                    })
                    .subscribe({
                      next: (response) => {
                        console.log('Order booked:', response);
                        resolve({
                          bookingID: bookingID,
                          ID: bookingSID,
                        });
                      },
                      error: (error) => {
                        console.error('Error booking order:', error);
                        reject(error);
                      },
                    });
                },
                error: (error) => {
                  console.error('Error saving travelers:', error);
                  reject(error);
                },
              });
          },
          error: (error) => {
            console.error('Error creating booking:', error);
            reject(error);
          },
        });
    });
  }
}