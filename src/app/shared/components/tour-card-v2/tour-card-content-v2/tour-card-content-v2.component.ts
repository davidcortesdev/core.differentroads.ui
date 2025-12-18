import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { TourDataV2 } from '../tour-card-v2.model';
import { TourLocationService } from '../../../../core/services/tour/tour-location.service';
import { LocationNetService } from '../../../../core/services/locations/locationNet.service';
import { switchMap, map, catchError, of, forkJoin, finalize } from 'rxjs';

@Component({
  selector: 'app-tour-card-content-v2',
  standalone: false,
  templateUrl: './tour-card-content-v2.component.html',
  styleUrls: ['./tour-card-content-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TourCardContentV2Component implements OnInit, OnChanges {
  @Input() tourData!: TourDataV2;
  @Input() isLargeCard = false;
  @Input() theme: string = 'light';
  @Output() tourClick = new EventEmitter<void>();
  @Output() loaded = new EventEmitter<void>();

  filteredTripTypes: string[] = [];
  locationName: string | null = null;
  isLoadingLocation: boolean = false;

  readonly tripTypeMap: Record<string, { label: string; class: string }> = {
    single: { label: 'S', class: 'trip-type-s' },
    grupo: { label: 'G', class: 'trip-type-g' },
    propios: { label: 'P', class: 'trip-type-p' },
  };

  constructor(
    private tourLocationService: TourLocationService,
    private locationNetService: LocationNetService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateFilteredTripTypes();
    this.loadLocation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tourData'] && !changes['tourData'].firstChange) {
      this.updateFilteredTripTypes();
      this.loadLocation();
    }
  }

  private updateFilteredTripTypes(): void {
    if (!this.tourData.tripType) {
      this.filteredTripTypes = [];
      return;
    }

    this.filteredTripTypes = this.tourData.tripType.filter((type) => {
      const lowerType = type.toLowerCase();
      return (
        lowerType === 'single' ||
        lowerType === 'grupo' ||
        lowerType === 'propios'
      );
    });
  }

  getFilteredTripTypes(): string[] {
    return this.filteredTripTypes;
  }

  getTripTypeLabel(type: string): string {
    const lowerType = type.toLowerCase();
    return this.tripTypeMap[lowerType]?.label || type.charAt(0).toUpperCase();
  }

  getTripTypeClass(type: string): string {
    const lowerType = type.toLowerCase();
    return this.tripTypeMap[lowerType]?.class || '';
  }

  handleTourClick(): void {
    this.tourClick.emit();
  }

  private loadLocation(): void {
    if (!this.tourData.id) {
      this.locationName = null;
      this.loaded.emit();
      return;
    }

    this.isLoadingLocation = true;
    this.cdr.markForCheck();

    this.tourLocationService
      .getAll({ tourId: this.tourData.id })
      .pipe(
        switchMap((tourLocations) => {
          if (!tourLocations || tourLocations.length === 0) {
            return of(null);
          }

          // Obtener todas las locations en paralelo
          const locationObservables = tourLocations.map((tourLoc) =>
            this.locationNetService.getLocationById(tourLoc.locationId).pipe(
              map((location) => ({
                location,
                tourLocation: tourLoc,
              })),
              catchError(() => of(null))
            )
          );

          return forkJoin(locationObservables).pipe(
            map((locationData) => {
              // Filtrar nulos
              const validLocations = locationData.filter(
                (data) => data !== null && data.location !== null
              ) as Array<{ location: any; tourLocation: any }>;

              if (validLocations.length === 0) {
                return null;
              }

              // Buscar la localización con locationTypeId === 2 (COUNTRY)
              const countryLocationData = validLocations.find(
                (data) => data.location.locationTypeId === 2
              );

              if (countryLocationData) {
                return countryLocationData.location;
              }

              // Si no hay de tipo COUNTRY, ordenar por displayOrder y tomar el primer resultado como fallback
              const sortedLocations = [...validLocations].sort(
                (a, b) =>
                  (a.tourLocation.displayOrder || 0) -
                  (b.tourLocation.displayOrder || 0)
              );
              return sortedLocations[0]?.location || null;
            })
          );
        }),
        map((location) => (location?.name || null)),
        catchError((error) => {
          console.error('Error al cargar localización del tour:', error);
          return of(null);
        }),
        finalize(() => {
          this.isLoadingLocation = false;
          this.cdr.markForCheck();
          this.loaded.emit();
        })
      )
      .subscribe({
        next: (name) => {
          this.locationName = name;
        },
        error: (error) => {
          console.error('Error al cargar localización:', error);
          this.locationName = null;
        },
      });
  }
}
