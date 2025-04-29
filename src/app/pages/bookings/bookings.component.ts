import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BookingsService } from '../../core/services/bookings.service';
import { BookingMappingService } from '../../core/services/booking-mapping.service';
import { PeriodsService } from '../../core/services/periods.service';
import { ToursService } from '../../core/services/tours.service';
import {
  RetailersService,
  Retailer,
} from '../../core/services/retailers.service';
import { Activity } from '../../core/models/tours/activity.model';
import { Flight } from '../../core/models/tours/flight.model';
import { finalize } from 'rxjs/operators';
import { catchError, of } from 'rxjs';
import {
  Payment,
  PaymentStatus,
} from '../../core/models/bookings/payment.model';

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
  nationality?: string;
  ageGroup?: string;
  _id?: string;
  bookingID?: string;
  bookingSID?: string;
  lead?: boolean;
}

@Component({
  selector: 'app-bookings',
  standalone: false,
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.scss'],
  providers: [MessageService, BookingMappingService],
})
export class BookingsComponent implements OnInit {
  // ID de la reserva actual
  bookingId: string = '';
  isLoading: boolean = false;
  bookingComplete: any = null; // Objeto de booking completo
  availableActivities: BookingActivity[] = []; // Array para actividades disponibles
  currentRetailer: Retailer | null = null; // Para almacenar información del retailer

  // Datos básicos que se actualizarán dinámicamente
  bookingData: BookingData = {
    title: '',
    date: '',
    bookingCode: '',
    bookingReference: '',
    status: '',
    retailer: '',
    creationDate: '',
    price: '',
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

  bookingActivities: BookingActivity[] = [];

  paymentForm: FormGroup;
  displayPaymentModal: boolean = false;

  // Nueva propiedad para almacenar el total de la reserva
  bookingTotal: number = 0;

  // Getter para combinar actividades incluidas y disponibles
  get combinedActivities(): BookingActivity[] {
    return [...this.availableActivities];
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private fb: FormBuilder,
    private bookingsService: BookingsService,
    private bookingMappingService: BookingMappingService,
    private periodsService: PeriodsService,
    private retailersService: RetailersService, // Nuevo servicio añadido
    private toursService: ToursService
  ) {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
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

    this.bookingsService
      .getBookingById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (booking) => {
          this.bookingComplete = booking;

          // Actualizar datos básicos de la reserva
          this.updateBasicBookingData(booking);

          // Actualizar información de la imagen
          this.updateBookingImages(booking);

          // Cargar información del retailer
          const retailerId = booking?.retailerID || '';
          this.loadRetailerInfo(retailerId);

          // Actualizar datos de elementos del viaje de forma dinámica
          this.updateTripItemsData(booking);

          // Actualizar información de pagos
          this.updatePaymentInfo(booking);

          // Actualizar vuelos si están disponibles - ahora directamente para Flight
          if (booking.flights && booking.flights.length > 0) {
            this.adaptFlightData(booking);
          }

          // Actualizar pasajeros si están disponibles
          if (booking.travelers && booking.travelers.length > 0) {
            this.updatePassengersData(booking);
          }

          // Actualizar actividades si están disponibles
          if (
            booking.optionalActivitiesRef &&
            booking.optionalActivitiesRef.length > 0
          ) {
            this.updateActivitiesData(booking);
          }

          // Cargar actividades del período usando el externalID correcto
          if (booking.periodData && booking.periodData['externalID']) {
            this.loadPeriodActivities(booking.periodData['externalID']);
          }
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

  // Método para cargar la información del retailer
  loadRetailerInfo(retailerId: string): void {
    if (!retailerId) {
      // Establecer valores por defecto si no hay ID
      this.currentRetailer = null;
      this.bookingData.retailer = 'Sin asignar';
      if (this.bookingImages.length > 0) {
        this.bookingImages[0].retailer = 'Sin asignar';
      }

      return;
    }

    // Usar el método preloadRetailerName para cargar el nombre rápidamente
    this.retailersService.preloadRetailerName(retailerId);

    // Obtener información completa del retailer
    this.retailersService.getRetailerById(retailerId).subscribe({
      next: (retailerData) => {
        this.currentRetailer = retailerData;

        // Actualizar bookingData
        this.bookingData.retailer = retailerData.name || 'Sin nombre';

        // Actualizar retailerInfo

        // Actualizar bookingImages
        if (this.bookingImages.length > 0) {
          this.bookingImages[0].retailer = retailerData.name || 'Sin nombre';
        }
      },
      error: (error) => {
        this.currentRetailer = null;

        // Establecer valores por defecto en caso de error
        this.bookingData.retailer = 'No disponible';

        if (this.bookingImages.length > 0) {
          this.bookingImages[0].retailer = 'No disponible';
        }
      },
    });
  }

  // Método para cargar actividades del período
  loadPeriodActivities(externalId: string): void {
    this.periodsService
      .getActivities(externalId)
      .pipe(
        catchError((error) => {
          this.messageService.add({
            key: 'center',
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar las actividades disponibles',
            life: 3000,
          });
          return of([]);
        })
      )
      .subscribe((activities) => {
        // Convertir actividades de la API al formato del componente
        this.availableActivities = activities
          .map((activity: Activity, index: number) => {
            // Verificar si esta actividad ya está incluida en las actividades actuales
            const isAlreadyIncluded = this.bookingActivities.some(
              (bookingActivity) => bookingActivity.title === activity.name
            );

            if (isAlreadyIncluded) {
              return null; // Para filtrar después
            }

            // Extraer la URL de la imagen si existe
            let imageUrl = 'https://picsum.photos/400/200'; // Imagen predeterminada
            if (
              activity.activityImage &&
              activity.activityImage.length > 0 &&
              activity.activityImage[0].url
            ) {
              imageUrl = activity.activityImage[0].url;
            }

            return {
              id: 1000 + index, // ID arbitrario que no entre en conflicto con los existentes
              title: activity.name || `Actividad ${index + 1}`,
              description: activity.description || 'Sin descripción disponible',
              imageUrl: imageUrl,
              price: activity.price ? `+${activity.price}€` : '+0€',
              priceValue: activity.price || 0,
              isOptional: true,
              perPerson: true, // Valor predeterminado ya que perPerson no está en Activity
              isIncluded: false,
            };
          })
          .filter((activity) => activity !== null); // Filtrar las actividades que ya están incluidas
      });
  }

  // Método ACTUALIZADO para los datos de elementos del viaje
  updateTripItemsData(booking: any): void {
    // Limpiar el array de elementos del viaje
    this.tripItems = [];

    // Verificar si extendedTotal existe en periodData
    if (
      booking?.periodData?.extendedTotal &&
      Array.isArray(booking.periodData.extendedTotal)
    ) {
      const extendedTotal = booking.periodData.extendedTotal;

      // Recorrer los elementos de extendedTotal y agregarlos al array
      extendedTotal.forEach((item: any) => {
        const qty = item.qty || 0;
        const value = item.value || 0;
        const description = item.description || '';

        // Agregar el item al array - ahora unitPrice es el valor individual
        // y value se mantiene como el valor total (qty * value individual)
        this.tripItems.push({
          quantity: qty,
          unitPrice: value, // Guardar el valor total en unitPrice para compatibilidad
          value: value, // Valor total sin modificar
          description: description,
        });
      });
    }
  }

  // Actualizar datos básicos de la reserva
  updateBasicBookingData(booking: any): void {
    this.bookingData = {
      title: booking?.periodData?.['tour']?.name || 'Sin título',
      date: booking?.periodData?.['dayOne']
        ? booking.periodData['dayOne']
        : 'Fecha no disponible',
      bookingCode: booking?.code || '',
      bookingReference: booking?.externalID || '',
      status: booking?.status || '',
      retailer: '', // Se actualizará en loadRetailerInfo
      creationDate: booking?.createdAt ? booking.createdAt : '',
      price: booking?.total || booking?.periodData?.total || 0,
    };
  }

  // Actualizar información de las imágenes
  updateBookingImages(booking: any): void {
    if (this.bookingImages.length > 0) {
      const tourName = booking?.periodData?.['tour']?.name || 'Sin título';
      const tourID = booking?.periodData?.tourID || '';

      // Inicializar con valores básicos
      this.bookingImages[0] = {
        ...this.bookingImages[0],
        name: tourName,
        tourName: tourName, // Añadimos el nombre del tour
        imageUrl: '', // Imagen temporal mientras carga
        retailer: '', // Se actualizará en loadRetailerInfo
        creationDate: booking?.createdAt
          ? booking.createdAt
          : this.bookingImages[0].creationDate,
        departureDate: booking?.periodData?.['dayOne']
          ? booking.periodData['dayOne']
          : this.bookingImages[0].departureDate,
        passengers:
          booking?.travelersNumber || this.bookingImages[0].passengers,
        price: booking?.total || booking?.periodData?.total || 0,
      };

      // Si tenemos un tourID, intentamos cargar la imagen real
      if (tourID) {
        this.loadTourImage(tourID);
      }
    }
  }

  // Método para cargar la imagen del tour
  loadTourImage(tourID: string): void {
    const filters = { externalID: tourID };
    this.toursService.getFilteredToursList(filters).subscribe({
      next: (tourData) => {
        if (
          tourData?.data?.length > 0 &&
          tourData.data[0].image?.length > 0 &&
          tourData.data[0].image[0].url
        ) {
          // Actualizar la imagen con la URL real
          this.bookingImages[0].imageUrl = tourData.data[0].image[0].url;
        }
      },
      error: (err) => {
        console.error('Error fetching tour image:', err);
      },
    });
  }

  // Actualizar información de pagos
  updatePaymentInfo(booking: any): void {
    // Se obtiene el total de la reserva desde booking o periodData
    const total = booking?.total || booking?.periodData?.total || 0;
    // Guardamos el total para pasarlo al componente de pagos
    this.bookingTotal = total;

    // Actualizamos la información de pagos a nivel local (si se usa en otro lado)
    this.paymentInfo = {
      totalPrice: total,
      pendingAmount: total - (booking?.paidAmount || 0),
      paidAmount: booking?.paidAmount || 0,
    };

    // Actualizar el historial de pagos si existe
    if (booking.payments && Array.isArray(booking.payments)) {
      this.paymentHistory = booking.payments;
    } else {
      // Si no hay pagos, crear un historial básico con el total como pendiente
      this.paymentHistory = [
        {
          bookingID: this.bookingId,
          amount: total,
          publicID: '', // default empty until set by backend
          status: PaymentStatus.PENDING,
          createdAt: booking.createdAt || new Date().toISOString(),
          updatedAt: booking.createdAt || new Date().toISOString(),
        },
      ];
    }

    // Actualizar pagos programados (ejemplo, se puede adaptar según los datos reales)
    this.upcomingPayments = [];
    if (this.paymentInfo.pendingAmount > 0) {
      // Si hay un monto pendiente, crear un pago programado a futuro
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      this.upcomingPayments.push({
        date: futureDate.toISOString().split('T')[0],
        amount: this.paymentInfo.pendingAmount,
      });
    }
  }

  // Método adaptado para trabajar directamente con FlightSectionComponent
  adaptFlightData(booking: any): void {
    if (booking.flights && booking.flights.length > 0) {
      try {
        // Inicializar el objeto Flight
        this.adaptedFlightData = {
          id: this.bookingId || '',
          externalID: this.bookingData.bookingReference || '',
          name: 'Flight Details',
          outbound: {
            activityID: 0,
            availability: 1,
            date: '',
            name: 'Outbound Flight',
            serviceCombinationID: 0,
            segments: [],
          },
          inbound: {
            activityID: 0,
            availability: 1,
            date: '',
            name: 'Inbound Flight',
            serviceCombinationID: 0,
            segments: [],
          },
        };

        // Procesar vuelos
        const flight = booking.flights[0]; // Tomamos el primer vuelo

        // Procesar segmentos de ida (outbound)
        if (
          flight.outbound &&
          flight.outbound.segments &&
          flight.outbound.segments.length > 0
        ) {
          this.adaptedFlightData.outbound.date = flight.outbound.date || '';

          // Mapear cada segmento
          this.adaptedFlightData.outbound.segments =
            flight.outbound.segments.map((segment: any, index: number) => ({
              departureCity: segment.departureCity || '',
              arrivalCity: segment.arrivalCity || '',
              flightNumber: segment.flightNumber || 'XX123',
              departureIata: segment.departureIata || '',
              departureTime: segment.departureTime || '',
              arrivalTime: segment.arrivalTime || '',
              arrivalIata: segment.arrivalIata || '',
              numNights: segment.numNights || 0,
              differential: segment.differential || 0,
              order: index,
              airline: {
                name: segment.airline?.name || 'Airline',
                email: segment.airline?.email || 'info@airline.com',
                logo: segment.airline?.logo || '',
                code: segment.airline?.code || '',
              },
            }));
        }

        // Procesar segmentos de vuelta (inbound)
        if (
          flight.inbound &&
          flight.inbound.segments &&
          flight.inbound.segments.length > 0
        ) {
          this.adaptedFlightData.inbound.date = flight.inbound.date || '';

          // Mapear cada segmento
          this.adaptedFlightData.inbound.segments = flight.inbound.segments.map(
            (segment: any, index: number) => ({
              departureCity: segment.departureCity || '',
              arrivalCity: segment.arrivalCity || '',
              flightNumber: segment.flightNumber || 'XX456',
              departureIata: segment.departureIata || '',
              departureTime: segment.departureTime || '',
              arrivalTime: segment.arrivalTime || '',
              arrivalIata: segment.arrivalIata || '',
              numNights: segment.numNights || 0,
              differential: segment.differential || 0,
              order: index,
              airline: {
                name: segment.airline?.name || 'Airline',
                email: segment.airline?.email || 'info@airline.com',
                logo: segment.airline?.logo || '',
                code: segment.airline?.code || segment.airline?.name,
              },
            })
          );
        }
      } catch (error) {
        // Si hay error al procesar, continúa sin mostrar datos de vuelo
      }
    }
  }

  // Actualizar actividades
  updateActivitiesData(booking: any): void {
    // Limpiar actividades existentes
    this.bookingActivities = [];

    // Verificar si hay actividades opcionales
    if (
      booking.optionalActivitiesRef &&
      Array.isArray(booking.optionalActivitiesRef)
    ) {
      booking.optionalActivitiesRef.forEach((activity: any, index: number) => {
        this.bookingActivities.push({
          id: index + 1,
          title: activity.name || `Actividad ${index + 1}`,
          description: activity.description || 'Sin descripción disponible',
          imageUrl: activity.image || 'https://picsum.photos/400/200', // Imagen predeterminada
          price: activity.price ? `+${activity.price}€` : '+0€',
          priceValue: activity.price || 0,
          isOptional: true,
          perPerson: activity.perPerson || true,
          isIncluded: true, // Si está en optionalActivitiesRef, ya está incluida
        });
      });
    }
  }

  // Actualizar información de pasajeros
  updatePassengersData(booking: any): void {
    if (booking.travelers && booking.travelers.length > 0) {
      // Limpiar el array de pasajeros
      this.passengers = [];

      // Procesar los datos de los viajeros y mapearlos a nuestra interfaz
      booking.travelers.forEach((traveler: any, index: number) => {
        // Extraer los datos del viajero
        const travelerData = traveler.travelerData || {};

        // Construir el nombre completo
        const firstName = travelerData.name || '';
        const lastName = travelerData.surname || '';
        const fullName = `${firstName} ${lastName}`.trim();

        // Extraer tipo de documento
        let documentType = travelerData.documentType || '';
        if (documentType.toLowerCase() === 'dni' || travelerData.dni) {
          documentType = 'DNI';
        } else if (
          documentType.toLowerCase().includes('passport') ||
          travelerData.passportID
        ) {
          documentType = 'Pasaporte';
        }

        // Obtener número de documento
        const documentNumber =
          travelerData.dni ||
          travelerData.passportID ||
          travelerData.docNum ||
          '';
          
        // Obtener la descripción de la habitación si está disponible
        let roomDescription = 'Sin asignar';
      
        // Intentar obtener la descripción de la habitación desde los datos del periodo
        if (booking.periodData?.textSummary?.rooms && traveler.periodReservationModeID) {
          const roomInfo = booking.periodData.textSummary.rooms[traveler.periodReservationModeID];
          if (roomInfo && roomInfo.name) {
            roomDescription = roomInfo.name;
          } else if (roomInfo && roomInfo.description) {
            roomDescription = roomInfo.description;
          }
        } else if (traveler.roomType) {
          // Si no hay información detallada, usar el tipo de habitación
          roomDescription = traveler.roomType;
        }
        
        // Manejar la fecha de nacimiento - verificar ambos campos posibles
        let birthDate = '';
        if (travelerData.birthDate) {
          birthDate = travelerData.birthDate;
        } else if (travelerData.birthdate) {
          birthDate = travelerData.birthdate;
        }
        
        console.log(`Traveler ${index} birthDate:`, birthDate);

        let comfortPlanName = '';
        if (
          booking?.periodData?.textSummary?.insurances &&
          typeof booking.periodData.textSummary.insurances === 'object'
        ) {
          // Tomar el primer seguro (puedes ajustar la lógica si hay varios)
          const insurancesObj = booking.periodData.textSummary.insurances;
          const insuranceKeys = Object.keys(insurancesObj);
          if (insuranceKeys.length > 0) {
            const firstInsurance = insurancesObj[insuranceKeys[0]];
            comfortPlanName = firstInsurance?.name || '';
          }
        }
        
        // Mapear datos del pasajero - importante: ID debe ser number
        const passenger: PassengerData = {
          id: index + 1, // Convertir a number usando el índice
          _id: traveler._id || '', // Asegurarnos de incluir el _id del viajero
          fullName: fullName,
          documentType: documentType,
          documentNumber: documentNumber,
          birthDate: birthDate,
          email: travelerData.email || '',
          phone: travelerData.phone || '',
          type:
            (travelerData.ageGroup || '').toLowerCase() === 'adultos'
              ? 'adult'
              : 'child',
          room: roomDescription, // Requerido por el componente hijo
          gender: travelerData.sex || '',
          comfortPlan: comfortPlanName, // Campo necesario para el componente hijo
          insurance: 'Básico', // Campo necesario para el componente hijo
          documentExpeditionDate: travelerData.passportIssueDate || travelerData.minorIdIssueDate || '',
          documentExpirationDate: travelerData.passportExpirationDate || travelerData.minorIdExpirationDate || '',
          nationality: travelerData.nationality || '',
          ageGroup: travelerData.ageGroup || '',
          bookingID: this.bookingId, // Añadir el ID de la reserva
          bookingSID: booking.bookingSID || this.bookingId, // Añadir el bookingSID
          lead: traveler.lead || false,
        };

        // Añadir al array de pasajeros
        this.passengers.push(passenger);
        
        // Debug para verificar que los IDs se están pasando correctamente
        console.log(`Passenger ${index} - _id: ${passenger._id}, bookingID: ${passenger.bookingID}, bookingSID: ${passenger.bookingSID}, birthDate: ${passenger.birthDate}`);
      });
    }
  }

  // Método eliminateActivity adaptado para trabajar con el componente hijo
  eliminateActivity(activityId: number): void {
    const activityIndex = this.bookingActivities.findIndex(
      (act) => act.id === activityId
    );

    if (activityIndex !== -1) {
      const removedActivity = this.bookingActivities[activityIndex];

      // Quitar la actividad de las incluidas
      this.bookingActivities.splice(activityIndex, 1);

      // Añadir a las disponibles si no está ya
      if (
        !this.availableActivities.some((a) => a.title === removedActivity.title)
      ) {
        this.availableActivities.push({
          ...removedActivity,
          isIncluded: false,
        });
      }

      // Buscar y eliminar del resumen del viaje
      const tripItemIndex = this.tripItems.findIndex(
        (item) => item.description === removedActivity.title
      );

      if (tripItemIndex !== -1) {
        this.tripItems.splice(tripItemIndex, 1);
      }

      this.messageService.add({
        key: 'center',
        severity: 'success',
        summary: 'Actividad eliminada',
        detail: `Se ha eliminado la actividad ${removedActivity.title}`,
        life: 3000,
      });
    }
  }

  // Método addActivity adaptado para trabajar con el componente hijo
  addActivity(activityId: number): void {
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
