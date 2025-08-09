// summary-info.component.ts
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'app-summary-info',
  standalone: false,
  templateUrl: './summary-info.component.html',
  styleUrl: './summary-info.component.scss',
})
export class SummaryInfoComponent implements OnInit, OnChanges {
  @Input() reservationId: number | undefined;

  // Datos de ejemplo hasta que tengas el servicio
  priceDetails: any[] = [
    { description: 'Tour Base', amount: 1200, quantity: 2, total: 2400 },
    { description: 'Hotel Premium', amount: 150, quantity: 3, total: 450 },
    { description: 'Seguro de viaje', amount: 50, quantity: 2, total: 100 },
  ];

  get totalPrice(): number {
    return this.priceDetails.reduce((sum, item) => sum + item.total, 0);
  }

  constructor() {}

  ngOnInit(): void {
    // Aquí cargarás los datos cuando tengas el servicio
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reaccionar a cambios en los inputs
  }
}
