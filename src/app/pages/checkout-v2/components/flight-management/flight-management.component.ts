import { Component, Input, OnInit } from '@angular/core';
import { DepartureService, IDepartureResponse } from '../../../../core/services/departure/departure.service';

@Component({
  selector: 'app-flight-management',
  standalone: false,

  templateUrl: './flight-management.component.html',
  styleUrls: ['./flight-management.component.scss']
})
export class FlightManagementComponent implements OnInit {
  @Input() departureId!: number;
  @Input() reservationId!: number;

  isConsolidadorVuelosActive: boolean = false;

  constructor(private departureService: DepartureService,
  ) { }

  ngOnInit(): void {
    if (this.departureId) {
      this.departureService.getById(this.departureId).subscribe({
        next: (departure: IDepartureResponse) => {
          this.isConsolidadorVuelosActive = !!departure.isConsolidadorVuelosActive;
        },
        error: () => {
          this.isConsolidadorVuelosActive = false;
        }
      });
    }
  }
}
