import { Component, OnInit, ViewChildren, QueryList, ViewChild, OnDestroy } from '@angular/core';
import { ToursService } from '../../../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { GeoService } from '../../../../core/services/geo.service';
import {
  Hotel,
  Itinerary,
  PeriodHotel,
  Tour,
} from '../../../../core/models/tours/tour.model';
import { Panel } from 'primeng/panel';
import { PeriodsService } from '../../../../core/services/periods.service';
import { Period } from '../../../../core/models/tours/period.model';
import { Activity } from '../../../../core/models/tours/activity.model';
import { TourDataService } from '../../../../core/services/tour-data/tour-data.service';
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';
import { PeriodPricesService } from '../../../../core/services/tour-data/period-prices.service';
import { OptionalActivityRef } from '../../../../core/models/orders/order.model';
import { TourOrderService } from '../../../../core/services/tour-data/tour-order.service';
import { DateOption } from '../tour-date-selector/tour-date-selector.component';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HotelsService } from '../../../../core/services/hotels.service';
import { HotelCardComponent } from '../../../../shared/components/hotel-card/hotel-card.component';
import {
  ActivityCardComponent,
  ActivityHighlight,
} from '../../../../shared/components/activity-card/activity-card.component';
import { ActivitiesCarouselComponent } from '../../../../shared/components/activities-carousel/activities-carousel.component';
import { MessageService } from 'primeng/api';
// Importar el nuevo componente del mapa
import { TourMapComponent, City } from '../../../../shared/components/tour-map/tour-map.component';

// Add these interfaces for the coordinate queue system
interface PendingCity {
  city: string;
  index?: number;
}

interface CachedCoordinates {
  lat: number;
  lng: number;
}

interface EventItem {
  status?: string;
  date?: string;
  icon?: string;
  color?: string;
  image?: string;
  description?: SafeHtml;
}

@Component({
  selector: 'app-tour-itinerary',
  standalone: false,
  templateUrl: './tour-itinerary.component.html',
  styleUrl: './tour-itinerary.component.scss',
})
export class TourItineraryComponent implements OnInit, OnDestroy {
  @ViewChildren('itineraryPanel') itineraryPanels!: QueryList<Panel>;
  @ViewChild(TourMapComponent) tourMapComponent!: TourMapComponent;
  
  // Add properties for the coordinate queue system
  private destroy$ = new Subject<void>();
  private pendingCities: PendingCity[] = [];
  private processingQueue = false;
  private lastRequestTime = 0;
  private coordinatesCache = new Map<string, CachedCoordinates>();
  private failedAttempts = new Map<string, number>();
  private readonly MAX_ATTEMPTS = 3;
  
  // Mantener solo las propiedades necesarias para el componente principal
  cities: string[] = [];
  citiesData: City[] = [];
  events: EventItem[];
  title: string = 'Itinerario';
  dateOptions: DateOption[] = [];
  protected carouselConfig = CAROUSEL_CONFIG;

  selectedOption: DateOption = {
    id: 0,
    label: '',
    value: '',
    price: 0,
    isGroup: false,
  };
  selectedDate: string = '';
  tripType: string = '';
  hotels: Period['hotels'] | undefined;
  hotelsData: Hotel[] = [];
  showPlaceholder: boolean = true;

  currentPeriod: Period | undefined;
  itinerariesData: Itinerary | undefined;
  itinerary: {
    title: string;
    description: SafeHtml;
    image: string;
    hotel: Hotel | null;
    collapsed: boolean;
    color?: string;
    highlights?: ActivityHighlight[];
    extraInfo?: {
      title?: string;
      content?: string;
    };
  }[] = [];

  activities: Activity[] = [];
  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 2,
      numScroll: 2,
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 2,
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  tagsOptions: {
    type: string;
    color:
      | 'success'
      | 'secondary'
      | 'info'
      | 'warn'
      | 'danger'
      | 'contrast'
      | undefined;
    value: string;
  }[] = [
    {
      type: 'Grupo',
      color: 'info',
      value: 'G',
    },
    {
      type: 'Single',
      color: 'success',
      value: 'S',
    },
    {
      type: 'Propios',
      color: 'warn',
      value: 'P',
    },
  ];

  constructor(
    private toursService: ToursService,
    private periodsService: PeriodsService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private geoService: GeoService,
    private tourOrderService: TourOrderService,
    private tourDataService: TourDataService,
    private periodPricesService: PeriodPricesService,
    private hotelsService: HotelsService,
    private messageService: MessageService
  ) {
    this.events = [];
  }
  
  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.toursService
          .getTourDetailBySlug(slug, [
            'itinerary-section',
            'activePeriods',
            'basePrice',
          ])
          .subscribe({
            next: (tourData) => {
              this.dateOptions = tourData.activePeriods.map((period) => {
                let iti = tourData['itinerary-section'].itineraries;
                return {
                  id: period.id,
                  label: period.name,
                  value: period.externalID + '',
                  price: (period.basePrice || 0) + (tourData.basePrice || 0),
                  isGroup: true,
                  tripType: period.tripType,
                  itineraryId: iti.filter((f) =>
                    f.periods.some((p) => p.includes(period.id + ''))
                  )[0]?.id,
                  itineraryName: iti.filter((f) =>
                    f.periods.some((p) => p.includes(period.id + ''))
                  )[0]?.iname,
                  dayOne: period.dayOne,
                };
              });

              this.selectedOption = this.dateOptions[0];
              this.selectedDate = this.dateOptions[0].label;
              this.itinerariesData = tourData['itinerary-section'];

              this.title = tourData['itinerary-section'].title;

              // Manually trigger date change with the first option
              if (this.selectedOption) {
                // Call onDateChange with an event object containing the value of the first option
                this.onDateChange({ value: this.selectedOption.value });
              } else {
                console.warn('No period options available');
              }
            },
            error: (error) => console.error('Error itinerary section:', error),
          });

        this.toursService
          .getTourDetailBySlug(slug, ['cities'])
          .subscribe((tour) => {
            this.cities = tour['cities'];
            // Replace direct service calls with the queue system
            this.cities.forEach((city) => {
              this.getCoordinatesWithCache(city);
            });
          });
      }
    });
  }

  // Add this method to handle component cleanup
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Add these new methods for the coordinate queue system
  private getCoordinatesWithCache(city: string, index?: number): void {
    // Skip empty or invalid city names
    if (!city || typeof city !== 'string' || city.trim() === '') {
      console.warn('Skipping invalid city name:', city);
      return;
    }
    
    // Normalize city name to avoid case-sensitive duplicates
    const normalizedCity = city.trim().toLowerCase();
    
    // Check if we already have the coordinates in cache
    if (this.coordinatesCache.has(normalizedCity)) {
      console.log(`Using cached coordinates for "${city}"`);
      const cachedCoordinates = this.coordinatesCache.get(normalizedCity)!;
      this.addCityToData(
        city,
        cachedCoordinates.lat,
        cachedCoordinates.lng,
        index
      );
      return;
    }
  
    // Check if we've exceeded the maximum number of failed attempts
    const attempts = this.failedAttempts.get(normalizedCity) || 0;
    if (attempts >= this.MAX_ATTEMPTS) {
      console.warn(
        `Skipping geocoding for "${city}" after ${this.MAX_ATTEMPTS} failed attempts`
      );
      return;
    }
  
    // Check if this city is already in the pending queue
    if (this.pendingCities.some(pending => pending.city.toLowerCase() === normalizedCity)) {
      console.log(`City "${city}" is already in the pending queue`);
      return;
    }
  
    // Add to pending queue and process
    console.log(`Adding "${city}" to geocoding queue`);
    this.pendingCities.push({ city, index });
  
    // Start processing the queue if not already processing
    if (!this.processingQueue) {
      this.processCoordinateQueue();
    }
  }

  private processCoordinateQueue(): void {
    this.processingQueue = true;
  
    const processNext = () => {
      if (this.pendingCities.length === 0) {
        this.processingQueue = false;
        return;
      }

      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      // If less than 1.25 seconds have passed since the last request, wait
      if (timeSinceLastRequest < 1250 && this.lastRequestTime !== 0) {
        setTimeout(processNext, 1250 - timeSinceLastRequest);
        return;
      }

      // Process the next city in the queue
      const nextCity = this.pendingCities.shift();
      if (!nextCity) {
        this.processingQueue = false;
        return;
      }

      this.lastRequestTime = now;
      const normalizedCity = nextCity.city.trim().toLowerCase();
  
      // Double-check cache before making the request (in case it was added while in queue)
      if (this.coordinatesCache.has(normalizedCity)) {
        console.log(`Using cached coordinates for "${nextCity.city}" (added while in queue)`);
        const cachedCoordinates = this.coordinatesCache.get(normalizedCity)!;
        this.addCityToData(
          nextCity.city,
          cachedCoordinates.lat,
          cachedCoordinates.lng,
          nextCity.index
        );
        
        // Process the next city after a short delay
        setTimeout(processNext, 100);
        return;
      }

      this.geoService
        .getCoordinates(nextCity.city)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (coordinates) => {
            if (coordinates && coordinates.lat && coordinates.lon) {
              // Valid coordinates received, store in cache with normalized key
              this.coordinatesCache.set(normalizedCity, {
                lat: Number(coordinates.lat),
                lng: Number(coordinates.lon),
              });
  
              // Add to city data
              this.addCityToData(
                nextCity.city,
                Number(coordinates.lat),
                Number(coordinates.lon),
                nextCity.index
              );
  
              // Reset failed attempts counter on success
              this.failedAttempts.delete(normalizedCity);
            } else {
              // Invalid or empty coordinates, increment failed attempts
              const attempts =
                (this.failedAttempts.get(nextCity.city) || 0) + 1;
              this.failedAttempts.set(nextCity.city, attempts);
              console.warn(
                `Failed to get valid coordinates for "${nextCity.city}" (attempt ${attempts}/${this.MAX_ATTEMPTS})`
              );
            }

            // Process the next city after a delay of 1.5 seconds
            setTimeout(processNext, 1500);
          },
          error: (error) => {
            // Increment failed attempts on error
            const attempts = (this.failedAttempts.get(nextCity.city) || 0) + 1;
            this.failedAttempts.set(nextCity.city, attempts);

            console.error(
              `Error fetching coordinates for "${nextCity.city}" (attempt ${attempts}/${this.MAX_ATTEMPTS}):`,
              error
            );

            // Continue processing even if there's an error, with a delay of 1.5 seconds
            setTimeout(processNext, 1500);
          },
        });
    };

    // Start processing
    processNext();
  }

  private addCityToData(city: string, lat: number, lng: number, index?: number): void {
    const newCity = {
      nombre: city,
      lat: lat,
      lng: lng,
    };
    
    this.citiesData.push(newCity);
    
    // Actualizar el componente del mapa cuando esté disponible
    if (this.tourMapComponent) {
      this.tourMapComponent.updateCitiesData(this.citiesData);
    }
  }

  onDateChange(event: any): void {
    this.selectedOption =
      this.dateOptions.find((option) => option.value === event.value) ||
      this.dateOptions[0];
    this.updateDateDisplay();
    this.showPlaceholder = false;

    this.periodsService
      .getPeriodDetail(this.selectedOption.value, [
        'tripType',
        'hotels',
        'activities',
        'name',
      ])
      .subscribe({
        next: (period) => {
          this.currentPeriod = period;
          this.tripType = period.tripType || '';
          this.hotels = period.hotels;
          this.fetchHotels();

          const allActivities = [
            ...(period.activities || []),
            ...(period.includedActivities || []),
          ];

          // Create a temporary array to store activities
          this.activities = allActivities.map((activity) => ({
            ...activity,
            price: 0, // Initialize with 0, will be updated when prices load
          }));

          // For each activity, get its price and update the activities array
          allActivities.forEach((activity) => {
            this.periodPricesService
              .getPeriodPriceById(
                this.selectedOption.value,
                activity.activityId
              )
              .subscribe({
                next: (price) => {
                  // Find and update the activity's price in the activities array
                  const activityIndex = this.activities.findIndex(
                    (a) => a.activityId === activity.activityId
                  );
                  if (activityIndex !== -1) {
                    this.activities[activityIndex].price = price;

                    // Update the itinerary if it's already populated
                    if (this.itinerary.length > 0) {
                      this.updateItinerary();
                    }
                  }
                },
                error: (error) => {
                  console.error(
                    `Error getting price for activity ${activity.activityId}:`,
                    error
                  );
                  // Even if we have an error, keep the activity with price 0
                  const activityIndex = this.activities.findIndex(
                    (a) => a.activityId === activity.activityId
                  );
                },
              });
          });

          this.updateItinerary();

          // Share the updated selected date and trip type with the service
          this.tourOrderService.updateSelectedDateInfo(period.externalID, '');
        },
        error: (error) => {
          console.error('Error fetching period details:', error);
          // Handle the error - maybe show a notification to the user
        },
      });
  }

  updateDateDisplay(): void {
    this.selectedDate = this.dateOptions.find(
      (option) => option.value === this.selectedOption.value
    )?.label!;
    this.tripType = this.currentPeriod?.tripType || '';
  }

  updateItinerary(): void {
    const selectedItinerary = this.itinerariesData?.['itineraries'].filter(
      (itinerary) =>
        itinerary.periods
          .map((period) => period.split('-')[1])
          .includes(this.selectedOption.value)
    )[0];

    if (!selectedItinerary) {
      console.error(
        'No itinerary found for the selected option:',
        this.selectedOption.value
      );
      return;
    }

    this.itinerary = selectedItinerary['days'].map((day, index) => {
      const dayActivities = this.activities.filter(
        (activity) => index + 1 === activity.day
      );

      // Fix: Safely check if hotel.days exists before using includes
      const hotelByDay = this.hotels?.find((hotel) =>
        hotel.days && hotel.days.includes(`${index + 1}`)
      );

      const hotel = this.hotelsData.find(
        (hotelData) => hotelData.id === hotelByDay?.hotels?.[0]?.id
      );

      return {
        title: day.name,
        description: this.sanitizer.bypassSecurityTrustHtml(
          day.description || ''
        ),
        image: day.itimage?.[0]?.url || '',
        hotel: hotel || null,
        collapsed: index !== 0,
        color: '#9C27B0',
        extraInfo: day.extraInfo,
        highlights:
          dayActivities.map((activity) => {
            return {
              id: `${activity.activityId}`,
              title: activity.name,
              description: activity.description || '',
              image: activity.activityImage?.[0]?.url || '',
              optional: activity.optional,
              recommended: activity.recommended ?? false,
              price: activity.price,
            };
          }) || [],
      };
    });
  }

  markerClicked(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const index = element.getAttribute('data-index');
    if (index !== null) {
      const itemIndex = parseInt(index, 10);
      this.itinerary[itemIndex].collapsed =
        !this.itinerary[itemIndex].collapsed;
      if (!this.itinerary[itemIndex].collapsed) {
        setTimeout(() => {
          this.scrollToPanel(itemIndex);
        }, 100);
      }
    }
  }

  scrollToPanel(index: number): void {
    if (this.itineraryPanels && this.itineraryPanels?.length > index) {
      const panelArray = this.itineraryPanels.toArray();
      if (panelArray[index]) {
        const el = panelArray[index].el.nativeElement;
        let container = this.findScrollableParent(el);
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  private findScrollableParent(element: HTMLElement): HTMLElement | Window {
    if (!element) {
      return window;
    }
    const computedStyle = getComputedStyle(element);
    const overflowY = computedStyle.getPropertyValue('overflow-y');
    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';
    if (isScrollable && element.scrollHeight > element.clientHeight) {
      return element;
    }
    if (element.parentElement) {
      return this.findScrollableParent(element.parentElement);
    }
    return window;
  }

  getTagConfig(tripType: string) {
    return this.tagsOptions.find((tag) => tag.type === tripType);
  }

  onAddActivity(highlight: ActivityHighlight): void {
    // Toggle del estado de la actividad
    highlight.added = !highlight.added;

    this.tourOrderService.toggleActivity(highlight.id, highlight.title);
    // Show message when adding an activity
    if (highlight.added) {
      // You can use a proper notification service here if available
      this.showActivityAddedMessage();
    }
  }

  // Add this new method to show the message
  showActivityAddedMessage(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Actividad añadida',
      detail:
        'Las actividades se añaden para todos los pasajeros. Podrás personalizarlas por pasajero en el proceso de pago.',
      life: 5000,
    });
  }

  // Add this method to handle panel clicks
  handlePanelClick(index: number): void {
    this.itinerary[index].collapsed = !this.itinerary[index].collapsed;
    if (!this.itinerary[index].collapsed) {
      setTimeout(() => {
        this.scrollToPanel(index);
      }, 100);
    }
  }

  // Add these methods after handlePanelClick method
  
  /**
   * Expands all day panels in the itinerary
   */
  expandAllPanels(): void {
    if (this.itinerary && this.itinerary.length > 0) {
      this.itinerary.forEach(item => {
        item.collapsed = false;
      });
    }
  }
  
  /**
   * Collapses all day panels in the itinerary
   */
  collapseAllPanels(): void {
    if (this.itinerary && this.itinerary.length > 0) {
      this.itinerary.forEach(item => {
        item.collapsed = true;
      });
    }
  }
  fetchHotels(): void {
    if (!this.hotels) {
      console.warn('No hotels available to fetch.');
      return;
    }
    this.hotels.forEach((hotel) => {
      if (!hotel.hotels || hotel.hotels.length === 0) {
        console.warn(`No hotels found for period hotel: ${hotel}`);
        return;
      }
      hotel.hotels.forEach((hotel) => {
        // Check if the hotel already exists in hotelsData
        if (
          !this.hotelsData.some(
            (existingHotel) => existingHotel.id === hotel.id
          )
        ) {
          this.hotelsService.getHotelById(hotel.id).subscribe({
            next: (hotelData) => {
              this.hotelsData.push(hotelData);
              // Update the itinerary after fetching hotel data
              this.updateItinerary();
            },
            error: (error) => {
              console.error('Error fetching hotel:', error);
            },
          });
        }
      });
    });
  }
}
