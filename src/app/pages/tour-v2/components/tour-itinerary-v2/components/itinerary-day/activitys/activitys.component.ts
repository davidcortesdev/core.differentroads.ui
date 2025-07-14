import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ActivityService, IActivityResponse } from '../../../../../../../core/services/activity/activity.service';
import { ActivityPriceService, IActivityPriceResponse } from '../../../../../../../core/services/activity/activity-price.service';
import { catchError, of, forkJoin } from 'rxjs';
import { ActivityHighlight } from '../../../../../../../shared/components/activity-card/activity-card.component';
import { environment } from '../../../../../../../../environments/environment';

@Component({
  selector: 'app-activity',
  standalone: false,
  templateUrl: './activitys.component.html',
  styleUrl: './activitys.component.scss'
})
export class ActivitysComponent implements OnInit, OnChanges {
  @Input() itineraryId: number | undefined;
  @Input() itineraryDayId: number | undefined;
  @Input() departureId: number | undefined;

  loading = true;
  activities: IActivityResponse[] = [];
  error: string | null = null;

  // Datos para el carousel
  highlights: ActivityHighlight[] = [];

  constructor(
    private activityService: ActivityService,
    private activityPriceService: ActivityPriceService
  ) {}

  ngOnInit(): void {
    this.loadDataWithFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const itineraryChanged = changes['itineraryId'] && 
                           changes['itineraryId'].currentValue !== changes['itineraryId'].previousValue;
    const itineraryDayChanged = changes['itineraryDayId'] && 
                               changes['itineraryDayId'].currentValue !== changes['itineraryDayId'].previousValue;
    const departureChanged = changes['departureId'] && 
                            changes['departureId'].currentValue !== changes['departureId'].previousValue;
    
    if (itineraryChanged || itineraryDayChanged || departureChanged) {
      this.loadDataWithFilters();
    }
  }

  private loadDataWithFilters(): void {
    if (!this.itineraryId) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;
    this.activities = [];
    this.highlights = [];

    this.activityService.getForItinerary(this.itineraryId, this.departureId, this.itineraryDayId)
      .pipe(
        catchError(err => {
          console.error('Error al cargar actividades:', err);
          this.error = 'Error al cargar las actividades. Por favor intente nuevamente.';
          return of([]);
        })
      )
      .subscribe((activities: IActivityResponse[]) => {
        this.activities = activities;
        this.transformActivitiesToHighlights();
        this.loading = false;
      });
  }

  private transformActivitiesToHighlights(): void {
    const highlights: ActivityHighlight[] = this.activities.map((activity: IActivityResponse) => ({
      id: activity.id.toString(),
      title: activity.name || 'Sin título',
      description: activity.description || 'Sin descripción',
      image: activity.imageUrl || '',
      recommended: activity.isRecommended || false,
      optional: activity.isOptional || false,
      added: false,
      price: 0,
      imageAlt: activity.imageAlt || activity.name || 'Sin título'
    } as ActivityHighlight));

    // Si hay actividades opcionales, buscar el precio de adulto (ageGroupId=1) para todas en una sola petición
    const optionalActivities = this.activities.filter(a => a.isOptional);
    if (optionalActivities.length > 0) {
      const activityIds = optionalActivities.map(a => a.id);
      this.activityPriceService.getAll({ ActivityId: activityIds, AgeGroupId: 1, RetailerId: environment.retaileriddefault })
        .subscribe((prices: IActivityPriceResponse[]) => {
          optionalActivities.forEach(activity => {
            const priceObj = prices.find(p => p.activityId === activity.id && p.ageGroupId === 1);
            const price = priceObj ? priceObj.basePrice : 0;
            const highlightIdx = highlights.findIndex(h => h.id === activity.id.toString());
            if (highlightIdx !== -1) {
              highlights[highlightIdx].price = price;
            }
          });
          this.highlights = highlights;
        });
    } else {
      this.highlights = highlights;
    }
  }

  onAddActivity(highlight: ActivityHighlight): void {
    const index = this.highlights.findIndex(h => h.id === highlight.id);
    if (index !== -1) {
      this.highlights[index] = { ...highlight, added: !highlight.added };
    }
  }

  trackByActivityId(index: number, activity: IActivityResponse): number {
    return activity.id;
  }

  get hasValidData(): boolean {
    return !this.loading && this.itineraryId !== undefined;
  }

  get hasActivities(): boolean {
    return this.hasValidData && this.highlights.length > 0;
  }
}