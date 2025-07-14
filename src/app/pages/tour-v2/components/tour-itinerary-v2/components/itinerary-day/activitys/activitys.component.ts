import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ActivityService, IActivityResponse } from '../../../../../../../core/services/activity/activity.service';
import { DepartureActivityService, IDepartureActivityResponse } from '../../../../../../../core/services/departure/departure-activity.service';
import { ActivityItineraryDayService, IActivityItineraryDayResponse } from '../../../../../../../core/services/activity/activity-itinerary-day.service';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { ActivityHighlight } from '../../../../../../../shared/components/activity-card/activity-card.component';

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
  activityItineraryDays: IActivityItineraryDayResponse[] = [];
  error: string | null = null;

  // Datos para el carousel
  highlights: ActivityHighlight[] = [];

  private lastQuery: string = '';
  private isLoadingData = false;

  constructor(
    private activityService: ActivityService,
    private departureActivityService: DepartureActivityService,
    private activityItineraryDayService: ActivityItineraryDayService
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
    this.highlights = this.activities.map((activity: IActivityResponse) => ({
      id: activity.id.toString(),
      title: activity.name || 'Sin título',
      description: activity.description || 'Sin descripción',
      image: activity.imageUrl || '',
      recommended: activity.isRecommended || false,
      optional: activity.isOptional || false,
      added: false,
      price: 0
    } as ActivityHighlight));
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
    return !this.loading && 
           this.itineraryId !== undefined && 
           this.itineraryDayId !== undefined && 
           this.departureId !== undefined;
  }

  get hasActivities(): boolean {
    return this.hasValidData && this.highlights.length > 0;
  }
}