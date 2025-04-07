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
import { ActivatedRoute, Router } from '@angular/router';
import { BookingsService } from '../../core/services/bookings.service';
import { BookingCreateInput } from '../../core/models/bookings/booking.model';
import { Period } from '../../core/models/tours/period.model';
import { InsurancesService } from '../../core/services/checkout/insurances.service';
import { Insurance } from '../../core/models/tours/insurance.model';
import { PaymentOptionsService } from '../../core/services/checkout/paymentOptions.service';
import { MessageService, MenuItem } from 'primeng/api';
import { DiscountsService } from '../../core/services/checkout/discounts.service';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { TextsService } from '../../core/services/checkout/texts.service';
import { AmadeusService } from '../../core/services/amadeus.service';
import { ProcessBookingService } from '../../core/services/checkout/process-booking.service';

import { Subscription } from 'rxjs';
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
  hasValidDocument: boolean = false;
  private subscription: Subscription = new Subscription();
  isAuthenticated: boolean = false;

  // PrimeNG Steps
  activeIndex: number = 0;
  items: MenuItem[] = [
    {
      label: 'Personaliza tu viaje',
      command: (event) => {
        this.onActiveIndexChange(0);
      },
    },
    {
      label: 'Vuelos',
      command: (event) => {
        this.onActiveIndexChange(1);
      },
    },
    {
      label: 'Viajeros',
      command: (event) => {
        this.onActiveIndexChange(2);
      },
    },
    {
      label: 'Pago',
      command: (event) => {
        this.onActiveIndexChange(3);
      },
    },
  ];

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

  // Add property to control budget dialog visibility
  budgetDialogVisible: boolean = false;

  discountInfo: {
    code?: string;
    amount: number;
    description: string;
    type: string;
  } | null = null;

  points: number = 0;

  // Add a new property to control the login modal visibility in checkout
  loginDialogVisible: boolean = false;

  constructor(
    private ordersService: OrdersService,
    private periodsService: PeriodsService,
    private travelersService: TravelersService,
    private summaryService: SummaryService,
    private roomsService: RoomsService,
    private pricesService: PricesService,
    private activitiesService: ActivitiesService,
    private flightsService: FlightsService,
    private authService: AuthenticateService,
    private route: ActivatedRoute,
    private router: Router,
    private bookingsService: BookingsService,
    private insurancesService: InsurancesService,
    private paymentOptionsService: PaymentOptionsService,
    private messageService: MessageService,
    private discountsService: DiscountsService,
    private textsService: TextsService,
    private amadeusService: AmadeusService, // <-- Nueva inyección
    private processBookingService: ProcessBookingService // New service injection
  ) {}

  ngOnInit() {
    // Read step from URL if present
    this.route.queryParams.subscribe((params) => {
      if (params['step']) {
        const stepParam = parseInt(params['step']);
        if (!isNaN(stepParam) && stepParam >= 1 && stepParam <= 4) {
          this.currentStep = stepParam;
          // Also update the activeIndex (0-based) to match the currentStep (1-based)
          this.activeIndex = stepParam - 1;
        }
      }
    });

    const authSubscription = this.authService.isLoggedIn().subscribe({
      next: (isAuthenticated) => {
        this.isAuthenticated = isAuthenticated;
      },
    });
    this.subscription.add(authSubscription);
    const orderId =
      this.route.snapshot.paramMap.get('id') || '67b702314d0586617b90606b';
    this.ordersService.getOrderDetails(orderId).subscribe((order) => {
      console.log('Order details:', order);

      this.orderDetails = order;
      this.summaryService.updateOrder(order);

      const periodID = order.periodID;
      this.periodID = periodID;

      // Initialize discounts if present in the order
      if (order.discounts && order.discounts.length > 0) {
        this.discountInfo = order.discounts[0];
      }

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

    this.discountsService.selectedDiscounts$.subscribe((discounts) => {
      console.log('Discounts updated:', discounts);
      this.updateOrderSummary();
    });
  }

  /* Steps Navigation Methods */
  onActiveIndexChange(index: number): void {
    // Sin validaciones: permitir el cambio de índice directamente
    this.activeIndex = index;
    this.currentStep = index + 1; // Actualizar currentStep (base 1) para que coincida con activeIndex (base 0)

    // Actualizar la URL para reflejar el paso actual
    this.updateStepInUrl(this.currentStep);

    // Actualizar el resumen del pedido después de cambiar el paso
    this.updateOrderSummary();
    this.updateOrder();
  }

  nextStepWithValidation(targetIndex: number): void {
    // Usar nextStep para validar antes de cambiar el paso
    if (this.nextStep(targetIndex + 1)) {
      this.activeIndex = targetIndex;
      this.currentStep = targetIndex + 1;
    }
  }

  // Method to update URL when step changes
  updateStepInUrl(step: any): void {
    // Extract the step number if it's an event object, otherwise use the value directly
    const stepNumber =
      typeof step === 'object' && step !== null ? step.value : step;

    // Make sure we have a valid number
    if (typeof stepNumber === 'number' && !isNaN(stepNumber)) {
      this.currentStep = stepNumber;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { step: stepNumber },
        queryParamsHandling: 'merge',
      });
    } else {
      console.error('Invalid step value:', step);
    }
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
    const travelersDatainfo = this.travelersService.getTravelers();

    // Verifica si AL MENOS UN viajero tiene DNI o pasaporte válido
    const hasValidDocument = travelersDatainfo.some((traveler) => {
      const documents = traveler.travelerData || {};

      return (
        (documents.dni && documents.dni.trim() !== '') ||
        (documents.passportID && documents.passportID.trim() !== '')
      );
    });
    this.hasValidDocument = hasValidDocument;

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

    // Save the entire summary to the order
    tempOrderData['summary'] = this.summary;
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

    // Get all flights for the order from the FlightsService
    const orderFlights = this.flightsService.getOrderFlights();

    if (
      this.selectedFlight &&
      this.selectedFlight.externalID! !== 'undefined'
    ) {
      if (!this.selectedFlight.name.toLowerCase().includes('sin ')) {
        // Check if flight is from Amadeus and has separate price data
        if (
          this.selectedFlight.source === 'amadeus' &&
          this.selectedFlight.priceData
        ) {
          // Get adult price data
          const adultPrice = this.selectedFlight.priceData.find(
            (price) => price.age_group_name === 'Adultos'
          );

          // Get child price data
          const childPrice = this.selectedFlight.priceData.find(
            (price) => price.age_group_name === 'Niños'
          );

          // Add adult price to summary if there are adults
          if (adultPrice && this.travelersSelected.adults > 0) {
            this.summary.push({
              qty: this.travelersSelected.adults,
              value: adultPrice.value,
              description: `${this.selectedFlight.name} (Adultos)`,
            });
          }

          // Add child price to summary if there are children
          if (childPrice && this.travelersSelected.childs > 0) {
            this.summary.push({
              qty: this.travelersSelected.childs,
              value: childPrice.value,
              description: `${this.selectedFlight.name} (Niños)`,
            });
          }

          // Add baby price if available
          if (this.travelersSelected.babies > 0) {
            const babyPrice = this.selectedFlight.priceData.find(
              (price) => price.age_group_name === 'Bebes'
            );

            if (babyPrice) {
              this.summary.push({
                qty: this.travelersSelected.babies,
                value: babyPrice.value,
                description: `${this.selectedFlight.name} (Bebes)`,
              });
            } else {
              // If no specific baby price, add with zero value
              this.summary.push({
                qty: this.travelersSelected.babies,
                value: 0,
                description: `${this.selectedFlight.name} (Bebes)`,
              });
            }
          }
        } else {
          // Keep original code for non-Amadeus flights
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
            description:
              this.selectedFlight.outbound.activityName ||
              this.selectedFlight.name,
          });
        }
      }

      // Use all flights from the service instead of just the selected one
      tempOrderData['flights'] =
        orderFlights.length > 0 ? orderFlights : [this.selectedFlight];
      console.log('Setting flights in order:', tempOrderData['flights']);
    }

    // Append all discounts from DiscountsService
    const discounts = this.discountsService.getSelectedDiscounts();

    if (discounts && discounts.length > 0) {
      discounts.forEach((discount) => {
        if (discount.source === 'coupon') {
          this.summary.push({
            qty: 1,
            value: -discount.amount,
            description: `Descuento cupon: ${discount.description}`,
          });
        } else {
          this.summary.push({
            qty: 1,
            value: -discount.amount,
            description: `${discount.description}`,
          });
        }
      });
      tempOrderData['discounts'] = discounts;
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

  // Método para manejar el descuento
  handleDiscountApplied(discountInfo: {
    code?: string;
    amount: number;
    description: string;
    type: string;
  }): void {
    // Verificar si ya tenemos un descuento de cupón
    const currentDiscounts = this.discountsService.getSelectedDiscounts();
    const nonCouponDiscounts = currentDiscounts.filter(
      (d) => d.source !== 'coupon'
    );

    // Si el monto es 0, significa que estamos eliminando el descuento
    if (discountInfo.amount === 0) {
      this.discountsService.updateSelectedDiscounts(nonCouponDiscounts);
    } else {
      const couponDiscount = {
        type: discountInfo.type,
        amount: discountInfo.amount,
        description: discountInfo.code || '',
        source: 'coupon',
      };

      this.discountsService.updateSelectedDiscounts([
        ...nonCouponDiscounts,
        couponDiscount,
      ]);
    }

    // Actualizar manualmente el resumen
    this.updateOrderSummary();
  }

  // Método para calcular totales
  calculateTotals(): void {
    // Calcular subtotal a partir de elementos del resumen, excluyendo elementos de descuento
    this.subtotal = this.summary.reduce((acc, item) => {
      // Solo agregar valores positivos al subtotal (ignorar elementos de descuento con valores negativos)
      if (item.value >= 0) {
        return acc + item.value * item.qty;
      }
      return acc;
    }, 0);

    // Calcular total incluyendo todos los elementos (tanto valores positivos como negativos)
    this.total = this.summary.reduce(
      (acc, item) => acc + item.value * item.qty,
      0
    );
  }

  /* Steps and validations */

  // Helper method to apply 12% markup to prices - same as in flight-search component
  applyPriceMarkup(price: number | string): number {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numericPrice * 1.12; // Adding 12% markup
  }

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
        if (!travelersComponent) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error en viajeros',
            detail: 'No se han cargado los datos de viajeros.',
          });
          return false;
        }
        if (!travelersComponent.areAllTravelersValid()) {
          return false;
        }
        // NEW: If selected flight is from Amadeus, update its price data BEFORE moving to step 4
        if (this.selectedFlight?.source === 'amadeus') {
          // Store old flight price for comparison (using Adult price)
          const oldPrice = this.selectedFlight.price;
          this.amadeusService
            .getFlightPriceById(this.selectedFlight.id)
            .subscribe({
              next: (response) => {
                console.log(
                  'Updated flight price data from Amadeus:',
                  response
                );
                // Usar el nuevo método del AmadeusService para transformar la respuesta
                const transformedPriceData =
                  this.amadeusService.transformFlightPriceData(
                    response.flightOffers
                  );
                const newAdultPrice = transformedPriceData.find(
                  (price) => price.age_group_name === 'Adultos'
                )?.value;

                if (newAdultPrice !== undefined && oldPrice !== newAdultPrice) {
                  this.messageService.add({
                    severity: 'warn',
                    summary: 'Precio de vuelo actualizado',
                    detail:
                      'El precio del vuelo ha cambiado, por favor verifique.',
                  });
                }

                // Update the selected flight's priceData with transformed data:
                if (this.selectedFlight) {
                  this.selectedFlight.priceData = transformedPriceData;
                }
              },
              error: (err) => {
                console.error('Error fetching flight price:', err);
              },
            });
        }
        break;
      default:
        return false;
    }

    this.updateOrderSummary();
    this.updateOrder();

    // Update URL with new step if validations pass
    if (step !== this.currentStep) {
      this.updateStepInUrl(step);
    }

    return true;
  }

  // New method to check auth before continuing from flights step
  checkAuthAndContinue(
    nextStep: number,
    activateCallback: any,
    useFlightless: boolean = false
  ): void {
    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        // User is logged in, proceed normally
        if (useFlightless) {
          // Handle "Lo quiero sin vuelos" button
          if (this.flightlessOption) {
            this.flightsService.updateSelectedFlight(this.flightlessOption);
            if (this.nextStep(nextStep)) {
              activateCallback(nextStep);
            }
          }
        } else {
          // Handle "Continuar" button
          if (this.nextStep(nextStep)) {
            activateCallback(nextStep);
          }
        }
      } else {
        // User is not logged in, save URL and show login dialog
        sessionStorage.setItem('redirectUrl', window.location.pathname);
        // Show the login modal instead of redirecting
        this.loginDialogVisible = true;
      }
    });
  }

  // Add method to close the login modal
  closeLoginModal(): void {
    this.loginDialogVisible = false;
  }

  // Add method to navigate to login page
  navigateToLogin(): void {
    this.closeLoginModal();
    this.router.navigate(['/login']);
  }

  // Add method to navigate to register page
  navigateToRegister(): void {
    this.closeLoginModal();
    this.router.navigate(['/sign-up']); // Changed from '/register' to '/sign-up'
  }

  // Remove authentication check from here since it's now handled in checkAuthAndContinue
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
    return this.processBookingService
      .processBooking(
        this.orderDetails,
        this.tourID,
        this.tourName,
        this.periodID,
        this.periodData,
        this.selectedFlight,
        this.summary,
        this.total
      )
      .catch((error) => {
        // Handle specific error from flight processing
        if (error.message === 'FLIGHT_PROCESSING_FAILED') {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al procesar vuelo',
            detail:
              'No se pudo procesar la reserva del vuelo. Por favor, inténtelo de nuevo o contacte con atención al cliente.',
            life: 10000,
          });
        } else {
          // Handle other errors
          this.messageService.add({
            severity: 'error',
            summary: 'Error en el proceso de reserva',
            detail:
              'Ha ocurrido un error durante el proceso de reserva. Por favor, inténtelo de nuevo.',
            life: 8000,
          });
        }
        throw error; // Re-throw to stop the booking process
      });
  }

  // Método para guardar viaje
  saveTrip(): void {
    this.budgetDialogVisible = true;
  }

  // Método para manejar el cierre del diálogo
  handleCloseBudgetDialog(): void {
    this.budgetDialogVisible = false;
  }
}
