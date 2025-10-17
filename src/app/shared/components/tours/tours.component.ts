import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { TourSearchParams, TourService } from '../../../core/services/tour/tour.service';

@Component({
  selector: 'app-tours',
  standalone: false,
  templateUrl: './tours.component.html',
  styleUrl: './tours.component.scss',
})
export class ToursComponent implements OnInit, OnChanges, OnDestroy {
  // Inputs
  @Input() initialTags: string[] = [];
  @Input() showTours: boolean = true;
  @Input() isOffersCollection: boolean = false;

  // Core data
  tourIds: number[] = [];
  destination: string = '';
  minDate: Date | null = null;
  maxDate: Date | null = null;
  tourType: string = '';
  flexDays: number | null = null;
  isLoadingTours: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly titleService: Title,
    private readonly route: ActivatedRoute,
    private readonly tourService: TourService
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Tours y Experiencias - Different Roads');

    // Suscribirse a cambios en los parámetros de la ruta
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.destination = params['destination'] || '';
        this.minDate = params['departureDate']
          ? new Date(params['departureDate'])
          : null;
        this.maxDate = params['returnDate']
          ? new Date(params['returnDate'])
          : null;
        this.tourType = params['tripType'] || '';
        this.flexDays = params['flexDays']
          ? Number(params['flexDays'])
          : null;

        this.loadTours();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recargar tours si cambian los tags desde el componente padre
    if (changes['initialTags'] && !changes['initialTags'].firstChange) {
      this.loadTours();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar tours basados en los parámetros de búsqueda
   */
  private loadTours(): void {
    const normalizedSearch = this.destination
      ? this.destination.normalize('NFD').replace(/\p{Diacritic}/gu, '')
      : undefined;

    const searchParams: TourSearchParams = {
      searchText: normalizedSearch,
      startDate: this.minDate?.toISOString(),
      endDate: this.maxDate?.toISOString(),
      tripTypeId: this.tourType ? Number(this.tourType) : undefined,
      flexDays: this.flexDays !== null ? this.flexDays : undefined,
    };

    this.isLoadingTours = true;

    this.tourService
      .search(searchParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.tourIds = results.map((result) => result.tourId);
          this.isLoadingTours = false;
        },
        error: (error) => {
          console.error('Error al buscar tours:', error);
          this.tourIds = [];
          this.isLoadingTours = false;
        },
      });
  }

  /**
   * Obtener ID de lista para analytics
   */
  getListId(): string {
    if (this.destination) {
      return `destination_${this.destination.toLowerCase().replace(/\s+/g, '_')}`;
    }
    if (this.isOffersCollection) {
      return 'ofertas';
    }
    if (this.initialTags.length > 0) {
      return `tags_${this.initialTags[0].toLowerCase().replace(/\s+/g, '_')}`;
    }
    return 'todos_los_tours';
  }

  /**
   * Obtener nombre de lista para analytics
   */
  getListName(): string {
    if (this.destination) {
      return `Tours en ${this.destination}`;
    }
    if (this.isOffersCollection) {
      return 'Ofertas especiales';
    }
    if (this.initialTags.length > 0) {
      return `Tours ${this.initialTags[0]}`;
    }
    return 'Todos los tours';
  }
}
