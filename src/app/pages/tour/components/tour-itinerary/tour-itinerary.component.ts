import { Component, OnInit, ViewChildren, QueryList } from '@angular/core';
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
import { forkJoin } from 'rxjs';
import { HotelsService } from '../../../../core/services/hotels.service';
// Add this import
import { HotelCardComponent } from '../../../../shared/components/hotel-card/hotel-card.component';
// Add these imports at the top of the file
import { ActivityCardComponent, ActivityHighlight } from '../../../../shared/components/activity-card/activity-card.component';
import { ActivitiesCarouselComponent } from '../../../../shared/components/activities-carousel/activities-carousel.component';

// Then in the @Component decorator, add these to the imports array if it's a standalone component
// If it's not standalone, you'll need to add them to the module's declarations
interface City {
  nombre: string;
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
export class TourItineraryComponent implements OnInit {
  @ViewChildren('itineraryPanel') itineraryPanels!: QueryList<Panel>;
  mapTypeId: google.maps.MapTypeId | undefined;
  mapId: string | undefined;
  getLatLog(
    city: City
  ):
    | google.maps.LatLngLiteral
    | google.maps.LatLng
    | google.maps.LatLngAltitude
    | google.maps.LatLngAltitudeLiteral {
    return { lat: city.lat, lng: city.lng };
  }
  markers: any = [];
  infoContent = '';
  cities: string[] = [];
  citiesData: City[] = [];
  center: google.maps.LatLngLiteral = { lat: 40.73061, lng: -73.935242 };
  zoom = 8;
  sizeMapaWidth = '100%';
  sizeMapaHeight = '100%';
  advancedMarkerOptions: google.maps.marker.AdvancedMarkerElementOptions = {
    gmpDraggable: false,
  };
  advancedMarkerPositions: google.maps.LatLngLiteral[] = [];
  apiLoaded: boolean = false;
  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    maxZoom: 15,
    minZoom: 1,
    styles: [
      {
        elementType: 'geometry',
        stylers: [{ color: '#f5f5f5' }],
      },
      {
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
      },
      {
        elementType: 'labels.text.fill',
        stylers: [{ color: '#616161' }],
      },
      {
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#f5f5f5' }],
      },
      {
        featureType: 'administrative.land_parcel',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#bdbdbd' }],
      },
      {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [{ color: '#eeeeee' }],
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#757575' }],
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#e5e5e5' }],
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }],
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#ffffff' }],
      },
      {
        featureType: 'road.arterial',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#757575' }],
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#dadada' }],
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#616161' }],
      },
      {
        featureType: 'road.local',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }],
      },
      {
        featureType: 'transit.line',
        elementType: 'geometry',
        stylers: [{ color: '#e5e5e5' }],
      },
      {
        featureType: 'transit.station',
        elementType: 'geometry',
        stylers: [{ color: '#eeeeee' }],
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#c9c9c9' }],
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }],
      },
    ],
  };
  markerOptions: google.maps.MarkerOptions = {
    draggable: false,
  };
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
    private hotelsService: HotelsService
  ) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    script.addEventListener('load', () => {
      this.mapTypeId = google.maps.MapTypeId.ROADMAP;
      this.mapId = google.maps.Map.DEMO_MAP_ID;
      this.apiLoaded = true;
    });
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
            let loadedCities = 0;
            const totalCities = this.cities?.length;
            this.cities.forEach((city) => {
              this.geoService.getCoordinates(city).subscribe((coordinates) => {
                if (coordinates) {
                  this.citiesData.push({
                    nombre: city,
                    lat: Number(coordinates.lat),
                    lng: Number(coordinates.lon),
                  });
                  this.addMarker({
                    nombre: city,
                    lat: Number(coordinates.lat),
                    lng: Number(coordinates.lon),
                  });
                  loadedCities++;
                  this.calculateMapCenter();
                }
              });
            });
          });
      }
    });
  }
  private calculateMapCenter(): void {
    if (this.citiesData?.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    this.citiesData.forEach((city) => {
      bounds.extend({ lat: city.lat, lng: city.lng });
    });
    this.center = {
      lat: bounds.getCenter().lat(),
      lng: bounds.getCenter().lng(),
    };
    const PADDING = 10;
    if (this.mapOptions.maxZoom) {
      this.zoom = Math.min(
        this.getZoomLevel(bounds, PADDING),
        this.mapOptions.maxZoom
      );
    }
  }
  private getZoomLevel(
    bounds: google.maps.LatLngBounds,
    padding: number
  ): number {
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 21;
    function latRad(lat: number) {
      const sin = Math.sin((lat * Math.PI) / 180);
      const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
      return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    }
    function zoom(mapPx: number, worldPx: number, fraction: number) {
      return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    }
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latFraction = (latRad(ne.lat()) - latRad(sw.lat())) / Math.PI;
    const lngDiff = ne.lng() - sw.lng();
    const lngFraction = (lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360;
    const latZoom = zoom(400 - padding * 2, WORLD_DIM.height, latFraction);
    const lngZoom = zoom(800 - padding * 2, WORLD_DIM.width, lngFraction);
    return Math.min(latZoom, lngZoom, ZOOM_MAX);
  }
  addMarker(ciudad: City) {
    this.markers.push({
      position: {
        lat: ciudad.lat,
        lng: ciudad.lng,
      },
      label: {
        color: 'red',
        text: ciudad.nombre,
      },
      title: ciudad.nombre,
      info: ciudad.nombre,
      options: {},
    });
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

      const hotelByDay = this.hotels?.find((hotel) =>
        hotel.days.includes(`${index + 1}`)
      );

      const hotel = this.hotelsData.find(
        (hotelData) => hotelData.id === hotelByDay?.hotels[0].id
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
  }

  fetchHotels(): void {
    this.hotels?.forEach((hotel) => {
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
