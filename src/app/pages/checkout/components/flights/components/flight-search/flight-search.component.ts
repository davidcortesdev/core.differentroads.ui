import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AmadeusService } from '../../../../../../core/services/amadeus.service';
import { FlightOffersParams, ITempFlightOffer } from '../../../../../../core/types/flight.types';

interface Ciudad {
  nombre: string;
  codigo: string;
}

@Component({
  selector: 'app-flight-search',
  standalone: false,
  templateUrl: './flight-search.component.html',
  styleUrls: ['./flight-search.component.scss']
})
export class FlightSearchComponent implements OnInit {
  @Output() filteredFlightsChange = new EventEmitter<any[]>();
  
  flightForm: FormGroup;
  
  tipoViaje: string = 'idaVuelta';
  equipajeMano: boolean = false;
  equipajeBodega: boolean = false;
  
  ciudades: Ciudad[] = [
    { nombre: 'Madrid', codigo: 'MAD' },
    { nombre: 'Nueva York', codigo: 'NYC' },
    { nombre: 'Lisboa', codigo: 'LIS' },
    { nombre: 'Casablanca', codigo: 'CMN' },
    { nombre: 'Sevilla', codigo: 'SVQ' },
    { nombre: 'Noruega - Oslo Gardemoen', codigo: 'OSL' },
    { nombre: 'Sevilla - San Pablo', codigo: 'SVQ' }
  ];

  aerolineas: Ciudad[] = [
    { nombre: 'Todas', codigo: 'ALL' },
    { nombre: 'Royal Air Maroc', codigo: 'AT' },
    { nombre: 'TAP Air Portugal', codigo: 'TP' }
  ];
  
  escalaOptions = [
    { label: 'Directos', value: 'directos' },
    { label: '1 Escala', value: 'unaEscala' },
    { label: '2+ Escalas', value: 'multiples' }
  ];
  
  aerolineaOptions = this.aerolineas.map(a => ({
    label: a.nombre,
    value: a.codigo
  }));
  
  fechaIda: Date = new Date('2025-04-03');
  fechaRegreso: Date = new Date('2025-04-10');
  
  flightOffers: ITempFlightOffer[] = [];
  filteredOffers: ITempFlightOffer[] = [];
  isLoading: boolean = false;
  
  constructor(
    private fb: FormBuilder,
    private amadeusService: AmadeusService
  ) {
    this.flightForm = this.fb.group({
      origen: ['Madrid'],
      destino: ['Nueva York'],
      fechaIda: [this.fechaIda],
      fechaRegreso: [this.fechaRegreso],
      tipoViaje: [this.tipoViaje],
      equipajeMano: [this.equipajeMano],
      equipajeBodega: [this.equipajeBodega],
      adults: [1],
      aerolinea: [null],
      escala: [null]
    });
  }
  
  ngOnInit() {
    // Al iniciar, buscar vuelos con los valores por defecto
    this.getFlightOffers();
    
    // Actualizar el tipo de viaje al cambiar en el formulario
    this.flightForm.get('tipoViaje')?.valueChanges.subscribe(value => {
      this.tipoViaje = value;
    });
    
    // Actualizar los checkboxes al cambiar en el formulario
    this.flightForm.get('equipajeMano')?.valueChanges.subscribe(value => {
      this.equipajeMano = value;
    });
    
    this.flightForm.get('equipajeBodega')?.valueChanges.subscribe(value => {
      this.equipajeBodega = value;
    });
  }
  
  buscar() {
    console.log('Búsqueda iniciada con los siguientes parámetros:', this.flightForm.value);
    this.getFlightOffers();
  }
  
  getFlightOffers() {
    this.isLoading = true;
    
    // Obtener los códigos de origen y destino
    const formValue = this.flightForm.value;
    const originCode = typeof formValue.origen === 'string' 
      ? this.getCityCode(formValue.origen) 
      : formValue.origen.codigo;
      
    const destinationCode = typeof formValue.destino === 'string'
      ? this.getCityCode(formValue.destino)
      : formValue.destino.codigo;
    
    // Formatear la fecha como YYYY-MM-DD
    const departureDate = this.formatDate(formValue.fechaIda);
    
    // Parámetros para la búsqueda
    const searchParams: FlightOffersParams = {
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate: departureDate,
      adults: formValue.adults || 1,
      max: 10 // Número máximo de resultados
    };
    
    // Si es ida y vuelta, añadir la fecha de regreso
    if (formValue.tipoViaje === 'idaVuelta') {
      searchParams.returnDate = this.formatDate(formValue.fechaRegreso);
    }
    
    // Si se seleccionó una aerolínea específica
    if (formValue.aerolinea && formValue.aerolinea.codigo !== 'ALL') {
      searchParams.includedAirlineCodes = formValue.aerolinea.codigo;
    }
    
    console.log('Buscando vuelos con parámetros:', searchParams);
    
    this.amadeusService.getFlightOffers(searchParams).subscribe({
      next: (offers) => {
        this.isLoading = false;
        this.flightOffers = offers;
        this.filterOffers();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error al obtener ofertas de vuelo:', err);
        // Mostrar mensaje de error al usuario
        this.flightOffers = [];
        this.filteredOffers = [];
        this.filteredFlightsChange.emit([]);
      }
    });
  }
  
  getCityCode(cityName: string): string {
    const city = this.ciudades.find(c => c.nombre.toLowerCase() === cityName.toLowerCase());
    return city ? city.codigo : 'MAD'; // Default to Madrid if not found
  }
  
  formatDate(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  
  filterOffers() {
    const formValue = this.flightForm.value;
    
    this.filteredOffers = this.flightOffers.filter(offer => {
      const offerData = offer.offerData;
      
      // Filtro por equipaje
      let matchesHandBaggage = true;
      let matchesCheckedBaggage = true;
      
      if (formValue.equipajeMano) {
        // Verificar si incluye equipaje de mano
        const hasCabinBag = offerData.travelerPricings.some((pricing: any) => 
          pricing.fareDetailsBySegment.some((segment: any) => 
            segment.includedCabinBags && segment.includedCabinBags.quantity > 0
          )
        );
        matchesHandBaggage = hasCabinBag;
      }
      
      if (formValue.equipajeBodega) {
        // Verificar si incluye equipaje facturado
        const hasCheckedBag = offerData.travelerPricings.some((pricing: any) => 
          pricing.fareDetailsBySegment.some((segment: any) => 
            segment.includedCheckedBags && segment.includedCheckedBags.quantity > 0
          )
        );
        matchesCheckedBaggage = hasCheckedBag;
      }
      
      // Filtro por aerolínea (si se seleccionó una específica)
      let matchesAirline = true;
      if (formValue.aerolinea && formValue.aerolinea.codigo !== 'ALL') {
        const airlineCode = formValue.aerolinea.codigo;
        matchesAirline = offerData.validatingAirlineCodes.includes(airlineCode);
      }
      
      // Filtro por número de escalas
      let matchesStops = true;
      if (formValue.escala) {
        const outboundStops = offerData.itineraries[0].segments.length - 1;
        
        switch(formValue.escala) {
          case 'directos':
            matchesStops = outboundStops === 0;
            break;
          case 'unaEscala':
            matchesStops = outboundStops === 1;
            break;
          case 'multiples':
            matchesStops = outboundStops >= 2;
            break;
        }
      }
      
      return matchesHandBaggage && matchesCheckedBaggage && matchesAirline && matchesStops;
    });
    
    // Transformar datos para el componente padre
    const transformedOffers = this.transformOffersForParent(this.filteredOffers);
    this.filteredFlightsChange.emit(transformedOffers);
    
    console.log('Ofertas filtradas:', this.filteredOffers);
  }
  
  transformOffersForParent(offers: ITempFlightOffer[]): any[] {
    return offers.map(offer => {
      const offerData = offer.offerData;
      
      // Para simplificar, tomamos el primer itinerario y segmento
      const outbound = offerData.itineraries[0];
      const inbound = offerData.itineraries.length > 1 ? offerData.itineraries[1] : null;
      
      // Adaptamos la estructura para que sea compatible con el componente padre
      return {
        externalID: offerData.id,
        name: `${offerData.validatingAirlineCodes[0]} - ${outbound?.segments[0]?.departure?.iataCode} to ${outbound?.segments[outbound.segments.length-1]?.arrival?.iataCode}`,
        outbound: {
          origin: { 
            name: outbound?.segments[0]?.departure?.iataCode, 
            code: outbound?.segments[0]?.departure?.iataCode 
          },
          destination: { 
            name: outbound?.segments[outbound.segments.length-1]?.arrival?.iataCode, 
            code: outbound?.segments[outbound.segments.length-1]?.arrival?.iataCode 
          },
          departureDate: outbound?.segments[0]?.departure?.at,
          arrivalDate: outbound?.segments[outbound.segments.length-1]?.arrival?.at,
          airline: outbound?.segments[0]?.carrierCode,
          flightNumber: outbound?.segments[0]?.number,
          duration: outbound?.duration,
          stops: outbound?.segments.length - 1,
          prices: offerData.travelerPricings.map((tp: any) => ({
            age_group_name: tp.travelerType === 'ADULT' ? 'Adultos' : 'Niños',
            value: parseFloat(tp.price.total) / 2 // Dividir el precio total entre ida y vuelta
          }))
        },
        inbound: inbound ? {
          origin: { 
            name: inbound.segments[0]?.departure?.iataCode, 
            code: inbound.segments[0]?.departure?.iataCode 
          },
          destination: { 
            name: inbound.segments[inbound.segments.length-1]?.arrival?.iataCode, 
            code: inbound.segments[inbound.segments.length-1]?.arrival?.iataCode 
          },
          departureDate: inbound.segments[0]?.departure?.at,
          arrivalDate: inbound.segments[inbound.segments.length-1]?.arrival?.at,
          airline: inbound.segments[0]?.carrierCode,
          flightNumber: inbound.segments[0]?.number,
          duration: inbound.duration,
          stops: inbound.segments.length - 1,
          prices: offerData.travelerPricings.map((tp: any) => ({
            age_group_name: tp.travelerType === 'ADULT' ? 'Adultos' : 'Niños',
            value: parseFloat(tp.price.total) / 2 // Dividir el precio total entre ida y vuelta
          }))
        } : {
          // Si es solo ida, crear datos vacíos para inbound
          origin: { name: '', code: '' },
          destination: { name: '', code: '' },
          departureDate: '',
          arrivalDate: '',
          airline: '',
          flightNumber: '',
          duration: '',
          stops: 0,
          prices: []
        },
        price: parseFloat(offerData.price.total),
        hasHandBaggage: offerData.travelerPricings.some((tp: any) => 
          tp.fareDetailsBySegment.some((seg: any) => 
            seg.includedCabinBags && seg.includedCabinBags.quantity > 0)
        ),
        hasCheckedBaggage: offerData.travelerPricings.some((tp: any) => 
          tp.fareDetailsBySegment.some((seg: any) => 
            seg.includedCheckedBags && seg.includedCheckedBags.quantity > 0)
        )
      };
    });
  }
  
  // Formatear la duración (convertir de formato PT2H30M a 2h 30m)
  formatDuration(duration: string): string {
    if (!duration) return '';
    
    const hours = duration.match(/(\d+)H/);
    const minutes = duration.match(/(\d+)M/);
    
    let formatted = '';
    if (hours) formatted += `${hours[1]}h `;
    if (minutes) formatted += `${minutes[1]}m`;
    
    return formatted.trim();
  }

  // Obtener el nombre de la aerolínea a partir del código
  getAirlineName(code: string): string {
    const airline = this.aerolineas.find(a => a.codigo === code);
    return airline ? airline.nombre : code;
  }

  // Verificar si un vuelo incluye equipaje de mano
  hasHandBaggage(offer: ITempFlightOffer): boolean {
    return offer.offerData.travelerPricings.some((tp: any) => 
      tp.fareDetailsBySegment.some((seg: any) => 
        seg.includedCabinBags && seg.includedCabinBags.quantity > 0)
    );
  }

  // Verificar si un vuelo incluye equipaje facturado
  hasCheckedBaggage(offer: ITempFlightOffer): boolean {
    return offer.offerData.travelerPricings.some((tp: any) => 
      tp.fareDetailsBySegment.some((seg: any) => 
        seg.includedCheckedBags && seg.includedCheckedBags.quantity > 0)
    );
  }

  // Método para seleccionar un vuelo
  selectFlight(offer: ITempFlightOffer): void {
    // Adaptamos la oferta al formato que espera el componente padre
    const transformedOffer = this.transformOffersForParent([offer])[0];
    this.filteredFlightsChange.emit([transformedOffer]);
  }
}