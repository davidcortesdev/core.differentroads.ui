import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface FilterChangeEvent {
  orderOption?: string;
  priceOption?: string[];
  seasonOption?: string[];
  monthOption?: string[];
}

@Component({
  selector: 'app-tours-filter-list',
  standalone: false,
  templateUrl: './tours-filter-list.component.html',
  styleUrl: './tours-filter-list.component.scss',
})
export class ToursFilterListComponent {
  // Inputs requeridos
  @Input() tourIds: number[] = [];
  @Input() itemListId: string = '';
  @Input() itemListName: string = '';
  @Input() isLoadingTours: boolean = false;

  // Outputs para notificar cambios en filtros
  @Output() filterChange = new EventEmitter<FilterChangeEvent>();

  // Opciones de filtros
  orderOptions = [
    { name: 'Próximas salidas', value: 'next-departures' },
    { name: 'Precio (de menor a mayor)', value: 'min-price' },
    { name: 'Precio (de mayor a menor)', value: 'max-price' },
  ];
  selectedOrderOption: string = 'next-departures';

  priceOptions: { name: string; value: string }[] = [
    { name: 'Menos de $1000', value: '0-1000' },
    { name: '$1000 - $3000', value: '1000-3000' },
    { name: '+ 3000', value: '3000+' },
  ];
  selectedPriceOption: string[] = [];

  seasonOptions: { name: string; value: string }[] = [
    { name: 'Verano', value: 'Verano' },
    { name: 'Invierno', value: 'invierno' },
    { name: 'Primavera', value: 'Primavera' },
    { name: 'Otoño', value: 'otono' },
  ];
  selectedSeasonOption: string[] = [];

  monthOptions: { name: string; value: string }[] = [];
  selectedMonthOption: string[] = [];

  // Métodos para manejar cambios en filtros
  onOrderChange() {
    this.filterChange.emit({
      orderOption: this.selectedOrderOption,
      priceOption: this.selectedPriceOption,
      seasonOption: this.selectedSeasonOption,
      monthOption: this.selectedMonthOption,
    });
  }

  onPriceFilterChange() {
    this.filterChange.emit({
      orderOption: this.selectedOrderOption,
      priceOption: this.selectedPriceOption,
      seasonOption: this.selectedSeasonOption,
      monthOption: this.selectedMonthOption,
    });
  }

  onSeasonFilterChange() {
    this.filterChange.emit({
      orderOption: this.selectedOrderOption,
      priceOption: this.selectedPriceOption,
      seasonOption: this.selectedSeasonOption,
      monthOption: this.selectedMonthOption,
    });
  }

  onMonthFilterChange() {
    this.filterChange.emit({
      orderOption: this.selectedOrderOption,
      priceOption: this.selectedPriceOption,
      seasonOption: this.selectedSeasonOption,
      monthOption: this.selectedMonthOption,
    });
  }
}
