import { Component, OnInit } from '@angular/core';
import { catchError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ToursService } from '../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';

interface ITour {
  imageUrl: string;
  title: string;
  description: string;
  rating: number;
  tag: string;
  price: number;
  availableMonths: string[];
  isByDr: boolean;
  webSlug: string;
}

@Component({
  selector: 'app-tours',
  standalone: false,

  templateUrl: './tours.component.html',
  styleUrl: './tours.component.scss',
})
export class ToursComponent implements OnInit {
  layout: 'grid' | 'list' = 'grid';
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

  displayedTours: ITour[] = [];
  destination: string = '';
  minDate: Date | null = null;
  maxDate: Date | null = null;
  tourType: string = '';

  constructor(
    private readonly toursService: ToursService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.destination = params['destination'] || '';
      this.minDate = params['departureDate']
        ? new Date(params['departureDate'])
        : null;
      this.maxDate = params['returnDate']
        ? new Date(params['returnDate'])
        : null;
      this.tourType = params['tripType'] || '';
      this.selectedOrderOption = params['order'] || 'next-departures'; // Ensure the default value is set
      this.selectedPriceOption = params['price'] || '';
      this.selectedSeasonOption = params['season'] || '';
      this.selectedMonthOption = params['month'] || '';

      this.loadTours();
    });
  }

  loadTours() {
    const filters = {
      destination: this.destination,
      minDate: this.minDate ? this.minDate.toISOString() : '',
      maxDate: this.maxDate ? this.maxDate.toISOString() : '',
      tourType: this.tourType,
      price: this.selectedPriceOption,
      tourSeason: this.selectedSeasonOption,
      month: this.selectedMonthOption,
      sort: this.selectedOrderOption,
    };

    this.toursService
      .getFilteredToursList(filters)
      .pipe(
        catchError((error: Error) => {
          console.error('Error loading tours:', error);
          return [];
        })
      )
      .subscribe((tours: any) => {
        this.monthOptions = tours.filtersOptions?.month?.map(
          (month: string) => {
            return {
              name: month.toUpperCase(),
              value: month,
            };
          }
        );

        this.displayedTours = tours.data.map((tour: any) => {
          const days = tour.activePeriods?.[0]?.days || '';

          return {
            imageUrl: tour.image?.[0]?.url || '',
            title: tour.name || '',
            description:
              tour.country && days ? `${tour.country} en: ${days} dias` : '',
            rating: 5,
            tag: tour.marketingSection?.marketingSeasonTag || '',
            price: tour.price || 0,
            availableMonths:
              tour.monthTags?.map((month: string) =>
                month.substring(0, 3).toUpperCase()
              ) || [],
            isByDr: true,
            webSlug: tour.webSlug || '',
          };
        });
      });
  }

  onFilterChange() {
    this.loadTours();
  }
}
