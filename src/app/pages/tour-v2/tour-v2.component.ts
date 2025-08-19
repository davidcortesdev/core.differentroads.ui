import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TourNetService, Tour } from '../../core/services/tourNet.service';
import { catchError, of } from 'rxjs';
import { ItineraryService } from '../../core/services/itinerary/itinerary.service';
import { SelectedDepartureEvent } from './components/tour-itinerary-v2/components/selector-itinerary/selector-itinerary.component';
import { ActivityHighlight } from '../../shared/components/activity-card/activity-card.component';

// ✅ INTERFACES para tipado fuerte
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

// ✅ NUEVA INTERFACE: Para el departure seleccionado
interface SelectedDepartureData {
  id: number;
  departureDate?: string;
  returnDate?: string;
  price?: number;
  status?: string;
  waitingList?: boolean;
  group?: string;
}

// ✅ NUEVA INTERFACE: Para los datos de actualización de pasajeros
interface PassengersUpdateData {
  adults: number;
  children: number;
  babies: number;
  total: number;
}

// ✅ NUEVA INTERFACE: Para análisis de tipos de actividades
interface ActivityTypesAnalysis {
  hasAct: boolean;
  hasPack: boolean;
  actCount: number;
  packCount: number;
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
  preview: boolean = false;
  // Total del carrito
  totalPrice: number = 0;

  // Ciudad seleccionada - no debe tener valor inicial
  selectedCity: string = '';

  // ✅ TIPADO FUERTE: Departure seleccionado
  selectedDepartureData: SelectedDepartureData | null = null;

  // Total de pasajeros
  totalPassengers: number = 1;

  // Array para almacenar actividades seleccionadas
  selectedActivities: ActivityHighlight[] = [];

  // Flag para controlar cuándo mostrar el estado de actividades
  showActivitiesStatus: boolean = false;

  // ✅ NUEVA PROPIEDAD: Análisis de tipos de actividades
  activityTypesAnalysis: ActivityTypesAnalysis = {
    hasAct: false,
    hasPack: false,
    actCount: 0,
    packCount: 0,
  };

  // Propiedades para age groups y datos detallados de pasajeros con tipado fuerte
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
      const slug: string | null = params.get('slug');
      
      // Detectar si estamos en modo preview basándonos en la URL
      const currentUrl = this.router.url;
      const isPreview = currentUrl.includes('/preview');
      
      console.log('URL actual:', currentUrl);
      console.log('¿Es preview?', isPreview);
      
      if (slug) {
        this.tourSlug = slug;
        this.preview = isPreview;
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
      .getTours({ slug, filterByVisible: !this.preview })
      .pipe(
        catchError((err: Error) => {
          console.error('Error al cargar el tour:', err);
          this.error =
            'Error al cargar el tour. Por favor, inténtalo de nuevo más tarde.';
          return of([]);
        })
      )
      .subscribe((tours: Tour[]) => {
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
    // Reset precio al cambiar departure
    this.totalPrice = 0;

    // Limpiar actividades y activar la visualización del estado
    this.selectedActivities = [];
    this.showActivitiesStatus = true; // Activar para mostrar "Sin actividades opcionales"

    // ✅ NUEVO: Reset del análisis de tipos al cambiar departure
    this.resetActivityTypesAnalysis();
  }

  // Manejar selección de actividad desde el componente hijo - MODIFICADO
  onActivitySelected(activityHighlight: ActivityHighlight): void {
    // Actualizar el array de actividades seleccionadas
    const existingIndex: number = this.selectedActivities.findIndex(
      (activity: ActivityHighlight) => activity.id === activityHighlight.id
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
      (activity: ActivityHighlight) => activity.added
    );

    // ✅ NUEVO: Analizar tipos de actividades después de cada cambio
    this.analyzeActivityTypes();
  }

  // ✅ NUEVO MÉTODO: Analizar tipos de actividades seleccionadas
  private analyzeActivityTypes(): void {
    const addedActivities = this.selectedActivities.filter(
      (activity) => activity.added
    );

    const actCount = addedActivities.filter(
      (activity) => activity.type === 'act'
    ).length;
    const packCount = addedActivities.filter(
      (activity) => activity.type === 'pack'
    ).length;

    this.activityTypesAnalysis = {
      hasAct: actCount > 0,
      hasPack: packCount > 0,
      actCount: actCount,
      packCount: packCount,
    };
  }

  // ✅ NUEVO MÉTODO: Reset del análisis de tipos
  private resetActivityTypesAnalysis(): void {
    this.activityTypesAnalysis = {
      hasAct: false,
      hasPack: false,
      actCount: 0,
      packCount: 0,
    };
  }

  // Recibir actualización de precio
  onPriceUpdate(price: number): void {
    this.totalPrice = price;
  }

  // Recibir actualización de ciudad
  onCityUpdate(city: string): void {
    this.selectedCity = city;
  }

  // ✅ TIPADO FUERTE: Recibir actualización de departure
  onDepartureUpdate(departure: SelectedDepartureData | null): void {
    this.selectedDepartureData = departure;
  }

  // ✅ TIPADO FUERTE: Recibir actualización del total de pasajeros con interface
  onPassengersUpdate(passengersUpdateData: PassengersUpdateData): void {
    // Calcular total de pasajeros (adultos + niños + bebés)
    this.totalPassengers =
      passengersUpdateData.adults +
      passengersUpdateData.children +
      passengersUpdateData.babies;

    // Guardar datos detallados de pasajeros
    this.passengersData = {
      adults: passengersUpdateData.adults,
      children: passengersUpdateData.children,
      babies: passengersUpdateData.babies,
    };
  }

  // Recibir información de age groups desde el componente TourDeparturesV2Component
  onAgeGroupsUpdate(ageGroupCategories: AgeGroupCategories): void {
    this.ageGroupCategories = ageGroupCategories;
  }
}
