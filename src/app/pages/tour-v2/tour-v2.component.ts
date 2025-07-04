import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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

  constructor(
    private route: ActivatedRoute,
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
    console.log('🎯 Departure seleccionado en tour-v2 (padre):', event);
    this.selectedDepartureEvent = event;
  }
}
