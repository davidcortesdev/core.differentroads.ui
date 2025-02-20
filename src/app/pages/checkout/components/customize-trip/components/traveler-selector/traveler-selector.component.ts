import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

@Component({
  selector: 'app-traveler-selector',
  standalone: false,
  templateUrl: './traveler-selector.component.html',
  styleUrls: ['./traveler-selector.component.scss'],
})
export class TravelerSelectorComponent implements OnInit {
  @Output() travelersChange = new EventEmitter<{
    adults: number;
    childs: number;
    babies: number;
  }>();

  private _availableTravelers: string[] = [];

  @Input()
  set availableTravelers(value: string[]) {
    this._availableTravelers = value;
  }

  get availableTravelers(): string[] {
    return this._availableTravelers;
  }

  travelersNumbers: { adults: number; childs: number; babies: number } = {
    adults: 1,
    childs: 0,
    babies: 0,
  };

  ngOnInit() {}

  handlePassengers(value: number, type: 'adults' | 'childs' | 'babies'): void {
    this.travelersNumbers[type] = value;
    this.travelersChange.emit(this.travelersNumbers);
  }
}
