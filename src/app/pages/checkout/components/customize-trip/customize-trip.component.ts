import { Component, Input, OnInit } from '@angular/core';
import { PriceData } from '../../../../core/models/commons/price-data.model';
import { TravelersService } from '../../../../core/services/checkout/travelers.service';

@Component({
  selector: 'app-customize-trip',
  standalone: false,
  templateUrl: './customize-trip.component.html',
  styleUrl: './customize-trip.component.scss',
})
export class CustomizeTripComponent implements OnInit {
  @Input() orderDetails: any;
  @Input() availableTravelers: string[] = [];
  @Input() prices!: {
    [key: string]: { priceData: PriceData[]; availability?: number };
  };
  travelersNumbers: { adults: number; childs: number; babies: number } = {
    adults: 1,
    childs: 0,
    babies: 0,
  };

  constructor(private travelersService: TravelersService) {}

  ngOnInit(): void {
    if (this.orderDetails) {
      const periodId = this.orderDetails.periodID;
      // Removed the getReservationModes service call from here

      const priceData = this.prices[periodId].priceData;
      const children = priceData.filter(
        (data: { age_group_name: string }) => data.age_group_name === 'Niños'
      );
      const adults = priceData.filter(
        (data: { age_group_name: string }) => data.age_group_name === 'Adultos'
      );
      const infants = priceData.filter(
        (data: { age_group_name: string }) => data.age_group_name === 'Bebés'
      );

      this.availableTravelers = [];
      if (children.length) {
        this.availableTravelers.push('Niños');
      }
      if (adults.length) {
        this.availableTravelers.push('Adultos');
      }
      if (infants.length) {
        this.availableTravelers.push('Bebés');
      }
    }

    this.travelersService.travelersNumbers$.subscribe((data) => {
      this.travelersNumbers = data;
    });
  }

  handleTravelersChange(event: {
    adults: number;
    childs: number;
    babies: number;
  }) {
    console.log('Travelers changed:', event);

    this.travelersNumbers = event;
    this.travelersService.updateTravelersNumbers(this.travelersNumbers);
  }
}
