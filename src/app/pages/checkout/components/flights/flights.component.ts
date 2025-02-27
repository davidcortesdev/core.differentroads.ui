import { Component, Input, OnInit } from '@angular/core';
import { PeriodsService } from '../../../../core/services/periods.service';
import { FlightsService } from '../../../../core/services/checkout/flights.service';
import { PricesService } from '../../../../core/services/checkout/prices.service';
import { Flight } from '../../../../core/models/tours/flight.model';
import { PriceData } from '../../../../core/models/commons/price-data.model';
import { Order } from '../../../../core/models/orders/order.model';

@Component({
  selector: 'app-flights',
  standalone: false,
  templateUrl: './flights.component.html',
  styleUrl: './flights.component.scss',
})
export class FlightsComponent implements OnInit {
  @Input() orderDetails: Order | null = null;

  selectedFlight: Flight | null = null;
  flights: Flight[] = [];
  filteredFlights: Flight[] = [];

  constructor(
    private periodsService: PeriodsService,
    private flightsService: FlightsService
  ) {}

  ngOnInit(): void {
    if (this.orderDetails) {
      const periodID = this.orderDetails.periodID;
      this.periodsService.getFlights(periodID).subscribe((flights) => {
        this.flights = flights;

        this.filteredFlights = this.flights
          .filter(
            (flight) => flight.name && !flight.name.includes('Sin vuelos')
          )
          .map((flight) => {
            /*
              const activityID = flight.outbound.activityID;
               return {
              ...flight,
              price: this.pricesService.getPriceById(activityID, 'Adultos'),
              priceData: this.pricesService.getPriceDataById(activityID),
            }; */
            return {
              ...flight,
              price: this.calculateTotalPrice(flight),
              priceData: this.calculateTotalPriceData(flight),
            };
          });

        console.log('Flights: ', this.filteredFlights);
      });
    }

    this.flightsService.selectedFlight$.subscribe((flight) => {
      this.selectedFlight = flight;
    });
  }

  // Calcula el precio total para adultos
  calculateTotalPrice(flight: any): number {
    const outboundPrice =
      flight.outbound.prices.find((p: any) => p.age_group_name === 'Adultos')
        ?.value || 0;
    const inboundPrice =
      flight.inbound.prices.find((p: any) => p.age_group_name === 'Adultos')
        ?.value || 0;
    return outboundPrice + inboundPrice;
  }

  calculateTotalPriceData(flight: Flight): PriceData[] | undefined {
    const outboundPriceData = flight.outbound.prices;
    const inboundPriceData = flight.inbound.prices;
    const priceData = outboundPriceData?.map((price: PriceData) => {
      return {
        ...price,
        value:
          price.value +
          (inboundPriceData?.filter(
            (p: PriceData) => p.age_group_name === price.age_group_name
          )[0]?.value || 0),
      };
    });
    return priceData;
  }

  // Selecciona un vuelo
  selectFlight(flight: any): void {
    this.selectedFlight = flight;
    this.flightsService.updateSelectedFlight(flight); // Update selected flight in FlightsService
  }

  // Verifica si un vuelo está seleccionado
  isFlightSelected(flight: any): boolean {
    return this.selectedFlight?.id === flight.id;
  }
}
