import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TourNetService, Tour } from '../../core/services/tourNet.service';
import { catchError, of } from 'rxjs';
import { ItineraryService } from '../../core/services/itinerary/itinerary.service';
import { SelectedDepartureEvent } from './components/tour-itinerary-v2/components/selector-itinerary/selector-itinerary.component';

@Component({
  selector: 'app-tour-v2',
  standalone: false,
  templateUrl: './tour-v2.component.html',
  styleUrls: ['./tour-v2.component.scss']
})
export class TourV2Component implements OnInit {
  tourSlug: string = '';
  tour: Tour | null = null;
  loading: boolean = true;
  error: string | null = null;
  selectedDepartureEvent: SelectedDepartureEvent | null = null;

  // ✅ AÑADIDO: Total del carrito
  totalPrice: number = 0;

  // ✅ CORREGIDO: Ciudad seleccionada - no debe tener valor inicial
  selectedCity: string = '';

  // ✅ AÑADIDO: Departure seleccionado
  selectedDepartureData: any = null;
  
  // ✅ AÑADIDO: Total de pasajeros
  totalPassengers: number = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourNetService: TourNetService,
    private ItineraryService: ItineraryService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.tourSlug = slug;
        this.loadTourBySlug(slug);
      } else {
        this.error = 'No se proporcionó un slug de tour válido';
        this.loading = false;
      }
    });
  }

  private loadTourBySlug(slug: string): void {
    this.loading = true;
    this.error = null;

    this.tourNetService.getTours({ slug })
      .pipe(
        catchError(err => {
          console.error('Error al cargar el tour:', err);
          this.error = 'Error al cargar el tour. Por favor, inténtalo de nuevo más tarde.';
          return of([]);
        })
      )
      .subscribe(tours => {
        if (tours && tours.length > 0) {
          this.tour = tours[0];
        } else {
          this.error = 'No se encontró el tour solicitado';
        }
        this.loading = false;
      });
  }

  onDepartureSelected(event: SelectedDepartureEvent): void {
    this.selectedDepartureEvent = event;
    // ✅ AÑADIDO: Reset precio al cambiar departure
    this.totalPrice = 0;
  }

  // ✅ AÑADIDO: Recibir actualización de precio
  onPriceUpdate(price: number): void {
    this.totalPrice = price;
  }

  // ✅ AÑADIDO: Recibir actualización de ciudad
  onCityUpdate(city: string): void {
    this.selectedCity = city;
  }

  // ✅ AÑADIDO: Recibir actualización de departure
  onDepartureUpdate(departure: any): void {
    this.selectedDepartureData = departure;
  }
  
  // ✅ AÑADIDO: Recibir actualización del total de pasajeros
  onPassengersUpdate(passengersData: any): void {
    // Calcular total de pasajeros (adultos + niños + bebés)
    this.totalPassengers = passengersData.adults + passengersData.children + passengersData.babies;
  }

}