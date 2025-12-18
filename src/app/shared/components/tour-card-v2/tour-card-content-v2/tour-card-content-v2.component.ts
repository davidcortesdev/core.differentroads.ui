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
import { switchMap, map, catchError, of } from 'rxjs';

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
  @Output() tourClick = new EventEmitter<void>();

  filteredTripTypes: string[] = [];
  locationName: string | null = null;
  isLoadingLocation: boolean = false;

  readonly tripTypeMap: Record<string, { label: string; class: string }> = {
    single: { label: 'S', class: 'trip-type-s' },
    grupo: { label: 'G', class: 'trip-type-g' },
    propios: { label: 'P', class: 'trip-type-p' },
    fit: { label: 'F', class: 'trip-type-f' },
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
      return;
    }

    this.isLoadingLocation = true;
    this.cdr.markForCheck();

    this.tourLocationService
      .getAll({ tourId: this.tourData.id })
      .pipe(
        map((tourLocations) => {
          if (!tourLocations || tourLocations.length === 0) {
            return null;
          }

          // Ordenar por displayOrder (ascendente) y tomar el primer resultado
          const sortedLocations = [...tourLocations].sort(
            (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
          );
          return sortedLocations[0]?.locationId || null;
        }),
        switchMap((locationId) => {
          if (!locationId) {
            return of(null);
          }
          return this.locationNetService.getLocationById(locationId);
        }),
        map((location) => (location?.name || null)),
        catchError((error) => {
          console.error('Error al cargar localización del tour:', error);
          return of(null);
        })
      )
      .subscribe({
        next: (name) => {
          this.locationName = name;
          this.isLoadingLocation = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error al cargar localización:', error);
          this.locationName = null;
          this.isLoadingLocation = false;
          this.cdr.markForCheck();
        },
      });
  }
}
