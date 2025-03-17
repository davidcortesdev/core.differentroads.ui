import { Component, Input, OnInit } from '@angular/core';
import { TravelersService } from '../../../../../../core/services/checkout/travelers.service';

@Component({
  selector: 'app-traveler-selector',
  standalone: false,
  templateUrl: './traveler-selector.component.html',
  styleUrls: ['./traveler-selector.component.scss'],
})
export class TravelerSelectorComponent implements OnInit {
  @Input() availableTravelers: string[] = [];

  travelersNumbers: { adults: number; childs: number; babies: number } = {
    adults: 1,
    childs: 0,
    babies: 0,
  };

  adultsErrorMsg = '';

  constructor(private travelersService: TravelersService) {}

  ngOnInit() {
    this.travelersService.travelersNumbers$.subscribe((data) => {
      this.travelersNumbers = data;
    });
  }

  handlePassengers(value: number, type: 'adults' | 'childs' | 'babies'): void {
    this.travelersNumbers[type] = value;
    if (
      this.travelersNumbers.adults <
      this.travelersNumbers.childs + this.travelersNumbers.babies
    ) {
      this.adultsErrorMsg =
        'La cantidad de niños y bebés debe ser menor o igual a la de adultos.';
    } else {
      this.adultsErrorMsg = '';
    }
    this.travelersService.updateTravelersNumbers(this.travelersNumbers);
  }
}
