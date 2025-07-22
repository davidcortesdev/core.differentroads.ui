import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TourNetService, Tour } from '../../core/services/tourNet.service';
import { catchError, of } from 'rxjs';
import { ItineraryService } from '../../core/services/itinerary/itinerary.service';
import { SelectedDepartureEvent } from './components/tour-itinerary-v2/components/selector-itinerary/selector-itinerary.component';
import { ActivityHighlight } from '../../shared/components/activity-card/activity-card.component';

// ✅ NUEVAS INTERFACES para tipado fuerte
interface PassengersData {
  adults: number;
  children: number;
  babies: number;
}

interface AgeGroupCategory {
  id: number | null;
  lowerAge: number | null;
  upperAge: number | null;
}

interface AgeGroupCategories {
  adults: AgeGroupCategory;
  children: AgeGroupCategory;
  babies: AgeGroupCategory;
}

@Component({
  selector: 'app-tour-v2',
  standalone: false,
  templateUrl: './tour-v2.component.html',
  styleUrls: ['./tour-v2.component.scss'],
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

  // ✅ NUEVO: Array para almacenar actividades seleccionadas
  selectedActivities: ActivityHighlight[] = [];

  // ✅ NUEVO: Flag para controlar cuándo mostrar el estado de actividades
  showActivitiesStatus: boolean = false;

  // ✅ NUEVAS PROPIEDADES para age groups y datos detallados de pasajeros con tipado fuerte
  passengersData: PassengersData = { adults: 1, children: 0, babies: 0 };
  ageGroupCategories: AgeGroupCategories = {
    adults: { id: null, lowerAge: null, upperAge: null },
    children: { id: null, lowerAge: null, upperAge: null },
    babies: { id: null, lowerAge: null, upperAge: null },
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourNetService: TourNetService,
    private ItineraryService: ItineraryService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
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

    this.tourNetService
      .getTours({ slug })
      .pipe(
        catchError((err) => {
          console.error('Error al cargar el tour:', err);
          this.error =
            'Error al cargar el tour. Por favor, inténtalo de nuevo más tarde.';
          return of([]);
        })
      )
      .subscribe((tours) => {
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

    // ✅ NUEVO: Limpiar actividades y activar la visualización del estado
    this.selectedActivities = [];
    this.showActivitiesStatus = true; // Activar para mostrar "Sin actividades opcionales"
  }

  // NUEVO: Manejar selección de actividad desde el componente hijo
  onActivitySelected(activityHighlight: ActivityHighlight): void {
    // Actualizar el array de actividades seleccionadas
    const existingIndex = this.selectedActivities.findIndex(
      (activity) => activity.id === activityHighlight.id
    );

    if (existingIndex !== -1) {
      // Si ya existe, actualizar el estado
      this.selectedActivities[existingIndex] = { ...activityHighlight };
    } else {
      // Si no existe, agregar nueva actividad
      this.selectedActivities.push({ ...activityHighlight });
    }

    // Remover actividades que ya no están agregadas
    this.selectedActivities = this.selectedActivities.filter(
      (activity) => activity.added
    );
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

  // ✅ MODIFICADO: Recibir actualización del total de pasajeros con interface
  onPassengersUpdate(passengersUpdateData: {
    adults: number;
    children: number;
    babies: number;
    total: number;
  }): void {
    // Calcular total de pasajeros (adultos + niños + bebés)
    this.totalPassengers =
      passengersUpdateData.adults +
      passengersUpdateData.children +
      passengersUpdateData.babies;

    // ✅ NUEVO: Guardar datos detallados de pasajeros
    this.passengersData = {
      adults: passengersUpdateData.adults,
      children: passengersUpdateData.children,
      babies: passengersUpdateData.babies,
    };
  }

  // ✅ NUEVO: Recibir información de age groups desde el componente TourDeparturesV2Component
  onAgeGroupsUpdate(ageGroupCategories: AgeGroupCategories): void {
    this.ageGroupCategories = ageGroupCategories;
  }
}
