import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Flight } from '../../../core/models/tours/flight.model';
import { ReservationFlightService, IFlightPackDTO } from '../../../core/services/flight/reservationflight.service';
import { FlightSearchService, IAmadeusFlightCreateOrderResponse } from '../../../core/services/flight/flight-search.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-booking-flights-v2',
  templateUrl: './booking-flights.component.html',
  styleUrls: ['./booking-flights.component.scss'],
  standalone: false,
})
export class BookingFlightsV2Component implements OnInit, OnChanges {
  @Input() reservationId!: number; // Recibe el ID de la reserva
  @Input() flight!: Flight; // Mantener para compatibilidad, pero ahora se llena desde el servicio
  @Input() isATC: boolean = false; // NUEVO: Indicador si viene desde ATC
  @Input() reservationStatusId: number = 0; // NUEVO: ID del estado de la reserva

  isLoading: boolean = false;
  flightPackData: IFlightPackDTO | null = null;

  // NUEVO: Estados de reserva de vuelos del consolidador (similar a new-reservation)
  hasAmadeusFlight: boolean = false;
  flightBookingLoading: boolean = false;
  flightBookingError: boolean = false;
  flightBookingResponse: IAmadeusFlightCreateOrderResponse | undefined;
  lastTicketingDate: string | null = null; // NUEVO: Fecha límite para la emisión del vuelo

  constructor(
    private reservationFlightService: ReservationFlightService,
    private flightSearchService: FlightSearchService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    if (this.reservationId) {
      this.loadFlightData();
      // NUEVO: Si es ATC y está PAID, verificar si hay vuelo del consolidador
      if (this.isATC && this.reservationStatusId === 7) {
        this.checkConsolidatorFlight();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationId'] && changes['reservationId'].currentValue) {
      this.loadFlightData();
    }
    // NUEVO: Re-verificar vuelo del consolidador si cambian isATC o reservationStatusId
    if ((changes['isATC'] || changes['reservationStatusId']) && this.reservationId) {
      if (this.isATC && this.reservationStatusId === 7) {
        this.checkConsolidatorFlight();
      } else {
        this.hasAmadeusFlight = false;
      }
    }
  }

  /**
   * Verifica si hay información válida de vuelos
   * @returns true si hay al menos un segmento válido en ida o vuelta
   */
  hasValidFlightData(): boolean {
    // Verificar si hay datos de vuelo
    if (!this.flight) {
      return false;
    }

    // Verificar si hay segmentos de ida válidos
    const hasOutbound = this.hasValidSegments(this.flight.outbound?.segments);

    // Verificar si hay segmentos de vuelta válidos
    const hasInbound = this.hasValidSegments(this.flight.inbound?.segments);

    // Devolver true si hay al menos un segmento válido en ida o vuelta
    return hasOutbound || hasInbound;
  }

  /**
   * Verifica si los segmentos proporcionados son válidos
   * @param segments Array de segmentos a verificar
   * @returns true si hay al menos un segmento válido
   */
  private hasValidSegments(segments: any[] | undefined): boolean {
    // Si no hay segmentos, devolver false
    if (!segments || !segments.length) {
      return false;
    }

    // Verificar cada segmento para determinar si al menos uno tiene información válida
    return segments.some((segment) => {
      // Verificar si el número de vuelo no es "SV" (Sin Vuelos)
      const hasValidFlightNumber =
        segment.flightNumber && segment.flightNumber !== 'SV';

      // Verificar si hay ciudades de origen y destino válidas
      const hasValidCities =
        segment.departureCity &&
        segment.departureCity !== 'SV' &&
        segment.arrivalCity &&
        segment.arrivalCity !== 'SV';

      // Verificar que la aerolínea no contenga la palabra "sin"
      const hasValidAirline =
        segment.airline?.name &&
        !segment.airline.name.toLowerCase().includes('sin ') &&
        !segment.airline.name.toLowerCase().includes('sinvue');

      // Un segmento es válido si tiene número de vuelo, ciudades válidas y aerolínea válida
      return hasValidFlightNumber && hasValidCities && hasValidAirline;
    });
  }

  /**
   * Carga los datos de vuelos desde el servicio
   * PRIORIDAD: Primero verifica si hay un vuelo del consolidador seleccionado,
   * si no hay, lee desde reservationFlightService (vuelos legacy)
   */
  private loadFlightData(): void {
    if (!this.reservationId) {
      return;
    }

    this.isLoading = true;

    // PASO 1: Verificar si hay un vuelo del consolidador seleccionado
    this.flightSearchService.getSelectionStatus(this.reservationId).subscribe({
      next: (hasConsolidatorFlight: boolean) => {
        if (hasConsolidatorFlight) {
          // Si hay vuelo del consolidador, obtenerlo desde Amadeus
          this.flightSearchService.getConsolidatorSelected(this.reservationId).subscribe({
            next: (consolidatorFlightPack: IFlightPackDTO | null) => {
              if (consolidatorFlightPack) {
                this.flightPackData = consolidatorFlightPack;
                this.flight = this.mapFlightPackToFlight(this.flightPackData);
                this.hasAmadeusFlight = true;
              } else {
                // Si no se pudo obtener, intentar con el método legacy
                this.loadLegacyFlightData();
              }
              this.isLoading = false;
            },
            error: (error) => {
              // Si hay error al obtener el vuelo del consolidador, intentar con el método legacy
              this.loadLegacyFlightData();
            }
          });
        } else {
          // Si no hay vuelo del consolidador, usar el método legacy
          this.hasAmadeusFlight = false;
          this.loadLegacyFlightData();
        }
      },
      error: (error) => {
        // Si hay error al verificar el estado, intentar con el método legacy
        this.loadLegacyFlightData();
      }
    });
  }

  /**
   * Carga los datos de vuelos desde el servicio legacy (reservationFlightService)
   */
  private loadLegacyFlightData(): void {
    this.reservationFlightService.getSelectedFlightPack(this.reservationId)
      .subscribe({
        next: (flightPacks: IFlightPackDTO | IFlightPackDTO[]) => {
          // Manejar tanto arrays como objetos individuales
          let flightPackData: IFlightPackDTO | null = null;
          
          if (Array.isArray(flightPacks)) {
            if (flightPacks.length > 0) {
              flightPackData = flightPacks[0];
            }
          } else if (flightPacks && typeof flightPacks === 'object') {
            flightPackData = flightPacks as IFlightPackDTO;
          }
          
          if (flightPackData) {
            // Verificar si es "Pack sin vuelos" y no mostrarlo si hay vuelo del consolidador
            const isSinVuelos = this.isSinVuelosPack(flightPackData);
            if (isSinVuelos && this.hasAmadeusFlight) {
              // Si hay vuelo del consolidador, no mostrar "Pack sin vuelos"
              this.flight = this.createEmptyFlight();
            } else {
              this.flightPackData = flightPackData;
              this.flight = this.mapFlightPackToFlight(this.flightPackData);
            }
          } else {
            this.flight = this.createEmptyFlight();
          }
          
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.flight = this.createEmptyFlight();
        }
      });
  }

  /**
   * Verifica si un flightPack es "Pack sin vuelos"
   */
  private isSinVuelosPack(flightPack: IFlightPackDTO): boolean {
    if (!flightPack) return false;
    
    const name = flightPack.name?.toLowerCase() || '';
    const description = flightPack.description?.toLowerCase() || '';
    const code = flightPack.code?.toLowerCase() || '';
    
    return name.includes('sin vuelos') || 
           name.includes('without flights') ||
           description.includes('sin vuelos') ||
           description.includes('without flights') ||
           code.includes('sin vuelos') ||
           code.includes('actpack');
  }

  /**
   * Mapea los datos del flight pack al formato Flight esperado
   * GENÉRICO: No depende de valores específicos, solo de patrones lógicos
   */
  private mapFlightPackToFlight(flightPack: IFlightPackDTO): Flight {
    if (!flightPack.flights || flightPack.flights.length === 0) {
      return this.createEmptyFlight();
    }

    // PASO 1: Ordenar vuelos por fecha (CLAVE PARA PRIORIDAD CRONOLÓGICA)
    const sortedFlights = [...flightPack.flights].sort((a, b) => {
      const dateA = new Date(a.departureDate || a.date || '').getTime();
      const dateB = new Date(b.departureDate || b.date || '').getTime();
      return dateA - dateB;
    });

    let outboundFlights: any[] = [];
    let inboundFlights: any[] = [];

    // PASO 2: ESTRATEGIAS DE CLASIFICACIÓN (EN ORDEN DE PRIORIDAD)
    
    if (sortedFlights.length === 1) {
      // 🥇 PRIORIDAD 1: Un solo vuelo = siempre outbound
      outboundFlights = sortedFlights;
      inboundFlights = [];
    } 
    else if (sortedFlights.length === 2) {
      // 🥈 PRIORIDAD 2: Dos vuelos = CRONOLÓGICO (primero=outbound, segundo=inbound)
      outboundFlights = [sortedFlights[0]]; // El MÁS TEMPRANO
      inboundFlights = [sortedFlights[1]];   // El MÁS TARDÍO
    }
    else {
      // 🥉 PRIORIDAD 3: Múltiples vuelos - analizar patrones
      const flightTypes = [...new Set(sortedFlights.map(f => f.flightTypeId))];
      
      if (flightTypes.length === 2) {
        // Sub-estrategia A: Dos tipos diferentes, agrupar por tipo
        const minType = Math.min(...flightTypes);
        const maxType = Math.max(...flightTypes);
        
        outboundFlights = sortedFlights.filter(f => f.flightTypeId === minType);
        inboundFlights = sortedFlights.filter(f => f.flightTypeId === maxType);
      }
      else {
        // Sub-estrategia B: Dividir cronológicamente por la mitad
        const midPoint = Math.ceil(sortedFlights.length / 2);
        outboundFlights = sortedFlights.slice(0, midPoint);
        inboundFlights = sortedFlights.slice(midPoint);
      }
    }

    // PASO 3: 🔍 VALIDACIÓN FINAL POR FECHAS (CORRECCIÓN AUTOMÁTICA)
    if (outboundFlights.length && inboundFlights.length) {
      const outboundDate = new Date(outboundFlights[0].departureDate || outboundFlights[0].date);
      const inboundDate = new Date(inboundFlights[0].departureDate || inboundFlights[0].date);
      
      if (inboundDate < outboundDate) {
        [outboundFlights, inboundFlights] = [inboundFlights, outboundFlights];
      }
    }

    const mappedFlight: Flight = {
      id: flightPack.id.toString(),
      externalID: flightPack.tkId || flightPack.code || '',
      source: 'ReservationFlightService',
      name: flightPack.name || 'Flight Details',
      outbound: {
        activityID: outboundFlights[0]?.activityId || 0,
        availability: 1,
        date: outboundFlights[0]?.date || outboundFlights[0]?.departureDate || '',
        name: 'Outbound Flight',
        segments: this.mapFlightsToSegments(outboundFlights),
        serviceCombinationID: this.parseServiceCombinationId(outboundFlights[0]),
        activityName: outboundFlights[0]?.name || 'Outbound Flight'
      },
      inbound: {
        activityID: inboundFlights[0]?.activityId || 0,
        availability: 1,
        date: inboundFlights[0]?.date || inboundFlights[0]?.departureDate || '',
        name: 'Inbound Flight',
        segments: this.mapFlightsToSegments(inboundFlights),
        serviceCombinationID: this.parseServiceCombinationId(inboundFlights[0]),
        activityName: inboundFlights[0]?.name || 'Inbound Flight'
      },
      price: this.calculateTotalPrice(flightPack.ageGroupPrices || []),
      priceData: this.mapAgeGroupPricesToPriceData(flightPack.ageGroupPrices || [])
    };

    return mappedFlight;
  }

  /**
   * Helper para parsear serviceCombinationID de manera segura
   */
  private parseServiceCombinationId(flight: any): number {
    if (!flight) return 0;
    
    const id = flight.tkServiceCombinationId || flight.serviceCombinationId;
    return id ? parseInt(id.toString()) : 0;
  }

  /**
   * Mapea los vuelos a segmentos de manera genérica
   */
  private mapFlightsToSegments(flights: any[]): any[] {
    if (!flights || flights.length === 0) return [];

    return flights.map((flight, index) => {
      const segment = {
        departureCity: flight.departureCity || flight.departure || '',
        arrivalCity: flight.arrivalCity || flight.arrival || '',
        flightNumber: this.extractFlightNumber(flight),
        departureIata: flight.departureIATACode || flight.departureCode || '',
        departureTime: flight.departureTime || '',
        arrivalTime: flight.arrivalTime || '',
        arrivalIata: flight.arrivalIATACode || flight.arrivalCode || '',
        numNights: 0,
        differential: 0,
        order: index + 1,
        airline: {
          name: this.extractAirlineName(flight),
          email: '',
          logo: '',
          code: this.extractAirlineCode(flight)
        }
      };
      
      return segment;
    });
  }

  /**
   * Extrae el número de vuelo de manera genérica
   */
  private extractFlightNumber(flight: any): string {
    // Priorizar diferentes campos que podrían contener el número de vuelo
    return flight.flightNumber || 
           flight.tkId || 
           flight.code ||
           flight.id?.toString() || 
           'FL000';
  }

  /**
   * Extrae el nombre de aerolínea de manera genérica
   */
  private extractAirlineName(flight: any): string {
    // Buscar en diferentes posibles campos
    if (flight.airline?.name) return flight.airline.name;
    if (flight.airlineName) return flight.airlineName;
    if (flight.carrier) return flight.carrier;
    
    // Si no encuentra, intentar derivar del nombre del vuelo o código
    const flightName = flight.name || '';
    const flightNumber = this.extractFlightNumber(flight);
    
    // Buscar patrones en el nombre como "Vuelo EDI - VLC - KL928"
    const airlineCodeMatch = flightName.match(/([A-Z]{2}\d+)/);
    if (airlineCodeMatch) {
      const code = airlineCodeMatch[1].substring(0, 2);
      return this.getAirlineNameFromCode(code);
    }
    
    // Derivar de códigos IATA si es posible
    return this.deriveAirlineFromRoute(
      flight.departureIATACode || flight.departureCode,
      flight.arrivalIATACode || flight.arrivalCode
    );
  }

  /**
   * Extrae el código de aerolínea de manera genérica
   */
  private extractAirlineCode(flight: any): string {
    if (flight.airline?.code) return flight.airline.code;
    if (flight.airlineCode) return flight.airlineCode;
    
    // Extraer del nombre del vuelo si hay patrón como "KL928"
    const flightName = flight.name || '';
    const codeMatch = flightName.match(/([A-Z]{2})\d+/);
    if (codeMatch) return codeMatch[1];
    
    return 'XX';
  }

  /**
   * Mapeo básico de códigos de aerolínea a nombres (solo los más comunes)
   */
  private getAirlineNameFromCode(code: string): string {
    const commonCodes: { [key: string]: string } = {
      'IB': 'Iberia',
      'VY': 'Vueling', 
      'FR': 'Ryanair',
      'KL': 'KLM',
      'UX': 'Air Europa',
      'AV': 'Avianca',
      'LA': 'LATAM'
    };
    
    return commonCodes[code] || 'Aerolínea';
  }

  /**
   * Deriva aerolínea basada en ruta (lógica muy básica)
   */
  private deriveAirlineFromRoute(departureIata: string, arrivalIata: string): string {
    // Lógica muy básica basada en aeropuertos principales
    if (!departureIata || !arrivalIata) return 'Aerolínea';
    
    // Si es una ruta europea, probablemente low-cost
    const europeanAirports = ['MAD', 'BCN', 'VLC', 'EDI', 'LGW', 'STN'];
    if (europeanAirports.includes(departureIata) && europeanAirports.includes(arrivalIata)) {
      return 'Aerolínea Europea';
    }
    
    return 'Aerolínea';
  }

  /**
   * Calcula el precio total basado en los precios por grupo de edad
   */
  private calculateTotalPrice(ageGroupPrices: any[]): number {
    if (!ageGroupPrices || ageGroupPrices.length === 0) return 0;
    return ageGroupPrices.reduce((total, price) => total + (price.price || 0), 0);
  }

  /**
   * Mapea los precios por grupo de edad al formato PriceData
   */
  private mapAgeGroupPricesToPriceData(ageGroupPrices: any[]): any[] {
    if (!ageGroupPrices || ageGroupPrices.length === 0) return [];
    
    return ageGroupPrices.map((price, index) => ({
      id: index + 1,
      value: price.price || 0,
      value_with_campaign: price.price || 0,
      campaign: null,
      ageGroupId: price.ageGroupId || 0,
      ageGroupName: price.ageGroupName || 'Unknown'
    }));
  }

  /**
   * Crea un vuelo vacío cuando no hay datos
   */
  private createEmptyFlight(): Flight {
    return {
      id: '',
      externalID: '',
      name: 'No Flight Data',
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
  }

  /**
   * Registra todos los identificadores de vuelos para rastrear su origen
   */
  private logFlightIdentifiers(): void {
    // Método vaciado - los logs han sido removidos
  }

  private validateFlightData(): void {
    // Método vaciado - los logs han sido removidos
  }

  /**
   * NUEVO: Verifica si existe un vuelo del consolidador seleccionado (similar a new-reservation)
   */
  private checkConsolidatorFlight(): void {
    if (!this.reservationId) {
      return;
    }

    this.flightSearchService.getSelectionStatus(this.reservationId).subscribe({
      next: (hasSelection: boolean) => {
        this.hasAmadeusFlight = hasSelection;
        // Si hay vuelo del consolidador, intentar obtener la fecha límite
        if (hasSelection) {
          this.loadLastTicketingDate();
        }
      },
      error: (error) => {
        this.hasAmadeusFlight = false;
      }
    });
  }

  /**
   * NUEVO: Obtiene la fecha límite para la emisión del vuelo
   * Por ahora, se obtiene desde booking requirements. Si no está disponible, se puede obtener desde otro endpoint.
   */
  private loadLastTicketingDate(): void {
    if (!this.reservationId) {
      return;
    }

    // Intentar obtener la fecha límite desde booking requirements
    // Nota: Si la fecha límite no viene en booking requirements, se puede obtener desde otro endpoint
    this.flightSearchService.getBookingRequirements(this.reservationId).subscribe({
      next: (requirements) => {
        // La fecha límite debería estar en algún campo de requirements o en el flightPackData
        // Por ahora, se deja como null si no está disponible
        // TODO: Obtener lastTicketingDate desde el endpoint adecuado cuando esté disponible
      },
      error: (error) => {
        // Si no se puede obtener, dejar como null
        this.lastTicketingDate = null;
      }
    });
  }

  /**
   * NUEVO: Verifica y emite el vuelo del consolidador (similar a new-reservation)
   */
  public checkAndBookAmadeusFlight(): void {
    if (!this.reservationId) {
      return;
    }

    this.flightSearchService.getSelectionStatus(this.reservationId).subscribe({
      next: (hasSelection: boolean) => {
        this.hasAmadeusFlight = hasSelection;

        if (hasSelection) {
          this.bookAmadeusFlight();
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Atención',
            detail: 'No hay vuelo del consolidador seleccionado para emitir.',
            life: 5000,
          });
        }
      },
      error: (error) => {
        this.flightBookingError = true;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al verificar el estado del vuelo del consolidador.',
          life: 5000,
        });
      },
    });
  }

  /**
   * NUEVO: Realiza la reserva del vuelo Amadeus (similar a new-reservation)
   */
  private bookAmadeusFlight(): void {
    if (!this.reservationId) {
      return;
    }

    this.flightBookingLoading = true;
    this.flightBookingError = false;

    this.flightSearchService.bookFlight(this.reservationId).subscribe({
      next: (response: IAmadeusFlightCreateOrderResponse) => {
        this.flightBookingResponse = response;
        this.flightBookingLoading = false;

        this.messageService.add({
          severity: 'success',
          summary: 'Vuelo reservado',
          detail: 'El vuelo se ha reservado correctamente en Amadeus.',
          life: 5000,
        });

        // Recargar los datos del vuelo para reflejar el cambio
        this.loadFlightData();
      },
      error: (error) => {
        this.flightBookingError = true;
        this.flightBookingLoading = false;

        this.messageService.add({
          severity: 'error',
          summary: 'Error en reserva de vuelo',
          detail: 'No se pudo completar la reserva del vuelo. Contacta con soporte.',
          life: 5000,
        });
      },
    });
  }

  /**
   * NUEVO: Determina si se debe mostrar el botón de emisión
   */
  get shouldShowEmitButton(): boolean {
    return this.isATC && 
           this.reservationStatusId === 7 && 
           this.hasAmadeusFlight && 
           !this.flightBookingResponse;
  }

  /**
   * NUEVO: Determina si el botón de emisión está deshabilitado
   */
  get isEmitButtonDisabled(): boolean {
    return this.flightBookingLoading || !this.hasAmadeusFlight;
  }

  /**
   * NUEVO: Formatea la fecha límite para mostrar
   */
  formatLastTicketingDate(): string {
    if (!this.lastTicketingDate) {
      return '';
    }

    try {
      const date = new Date(this.lastTicketingDate);
      if (isNaN(date.getTime())) {
        return '';
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return '';
    }
  }
}