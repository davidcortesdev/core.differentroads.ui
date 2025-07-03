import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ActivityService, IActivityResponse } from '../../../../../../../core/services/activity/activity.service';
import { DepartureActivityService, IDepartureActivityResponse } from '../../../../../../../core/services/departure/departure-activity.service';
import { ActivityItineraryDayService, IActivityItineraryDayResponse } from '../../../../../../../core/services/activity/activity-itinerary-day.service';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

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
    if (!this.itineraryId || !this.itineraryDayId || !this.departureId) {
      this.loading = false;
      return;
    }

    const queryKey = `${this.itineraryId}-${this.itineraryDayId}-${this.departureId}`;
    if (this.lastQuery === queryKey || this.isLoadingData) {
      return;
    }

    this.lastQuery = queryKey;
    this.isLoadingData = true;
    this.loading = true;
    this.error = null;
    this.activities = [];
    this.activityItineraryDays = [];

    // PASO 1: Obtener ActivityItineraryDay usando el servicio real
    this.activityItineraryDayService.getByItineraryDayId(this.itineraryDayId).pipe(
      switchMap((activityItineraryDays: IActivityItineraryDayResponse[]) => {
        // Guardar los ActivityItineraryDay obtenidos
        this.activityItineraryDays = activityItineraryDays;
        
        console.log('ActivityItineraryDays obtenidos:', activityItineraryDays);
        
        if (activityItineraryDays.length === 0) {
          return of([[], []]);
        }

        // Extraer los activityIds de los ActivityItineraryDay
        const activityIds = activityItineraryDays.map(aid => aid.activityId);
        console.log('Activity IDs extraídos:', activityIds);
        
        // PASO 2: Hacer las consultas en paralelo
        return forkJoin([
          // Obtener las actividades usando los IDs extraídos
          forkJoin(activityIds.map(activityId => 
            this.activityService.getById(activityId).pipe(
              catchError(err => {
                console.error(`Error loading activity ${activityId}:`, err);
                return of(null);
              })
            )
          )).pipe(
            catchError(err => {
              console.error('Error loading activities:', err);
              return of([]);
            })
          ),
          // Obtener departure activities
          this.departureActivityService.getByDeparture(this.departureId!).pipe(
            catchError(err => {
              console.error('Error loading departure activities:', err);
              return of([] as IDepartureActivityResponse[]);
            })
          )
        ]);
      }),
      catchError(err => {
        console.error('Error loading ActivityItineraryDay:', err);
        this.error = 'Error al cargar ActivityItineraryDay.';
        return of([[], []]);
      })
    ).subscribe({
      next: (result: any) => {
        const [activities, departureActivities] = result;
        
        // Filtrar actividades nulas
        const validActivities = (activities || [])
          .filter((activity: any) => activity !== null) as IActivityResponse[];
        
        // Filtrar actividades que están en el departure
        const departureActivityIds = (departureActivities || []).map((da: any) => da.activityId);
        this.activities = validActivities.filter((activity: IActivityResponse) => 
          departureActivityIds.includes(activity.id)
        );
        
        console.log('Actividades finales:', this.activities);
        console.log('ActivityItineraryDays:', this.activityItineraryDays);
      },
      error: (err) => {
        console.error('Error loading activities:', err);
        this.error = 'Error al cargar las actividades. Por favor intente nuevamente.';
      },
      complete: () => {
        this.loading = false;
        this.isLoadingData = false;
      }
    });
  }

  get hasValidData(): boolean {
    return !this.loading && 
           this.itineraryId !== undefined && 
           this.itineraryDayId !== undefined && 
           this.departureId !== undefined;
  }
}