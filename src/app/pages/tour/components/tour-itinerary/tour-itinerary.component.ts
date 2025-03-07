import { Component, OnInit, ViewChildren, QueryList } from '@angular/core';
import { ToursService } from '../../../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { GeoService } from '../../../../core/services/geo.service';
import { Itinerary, Tour } from '../../../../core/models/tours/tour.model';
import { Panel } from 'primeng/panel';
import { PeriodsService } from '../../../../core/services/periods.service';
import { Period } from '../../../../core/models/tours/period.model';
import { Activity } from '../../../../core/models/tours/activity.model';
import { TourDataService } from '../../../../core/services/tour-data.service';

interface City {
  nombre: string;
  lat: number;
  lng: number;
}
interface DateOption {
  label: string;
  value: string;
  price: number;
  isGroup: boolean;
  externalID?: string;
}
interface EventItem {
  status?: string;
  date?: string;
  icon?: string;
  color?: string;
  image?: string;
  description?: SafeHtml;
}
interface Highlight {
  title: string;
  description: string;
  image: string;
  optional: boolean;
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
  };
  markerOptions: google.maps.MarkerOptions = {
    draggable: false,
  };
  events: EventItem[];
  title: string = 'Itinerario';
  dateOptions: DateOption[] = [];

  selectedOption: DateOption = {
    label: '',
    value: '',
    price: 0,
    isGroup: false,
  };
  selectedDate: string = '';
  tripType: string = '';
  hotels: any[] = [];
  showPlaceholder: boolean = true;

  currentPeriod: Period | undefined;
  itinerariesData: Itinerary | undefined;
  itinerary: {
    title: string;
    description: SafeHtml;
    image: string;
    hotel: any;
    collapsed: boolean;
    color?: string;
    highlights?: Highlight[];
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
    private httpClient: HttpClient,
    private geoService: GeoService,
    private tourDataService: TourDataService
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
              console.log('Tour data:', tourData);
              this.dateOptions = tourData.activePeriods.map((period) => {
                console.log('Period___:', period);

                return {
                  label: period.name,
                  value: period.externalID + '',
                  price: (period.basePrice || 0) + (tourData.basePrice || 0),
                  isGroup: true,
                  tripType: period.tripType,
                };
              });
              this.selectedOption = this.dateOptions[0];
              this.selectedDate = this.dateOptions[0].label;
              this.itinerariesData = tourData['itinerary-section'];
              this.updateItinerary();

              this.title = tourData['itinerary-section'].title;

              this.periodsService
                .getPeriodDetail(this.selectedOption.value, [
                  'tripType',
                  'hotels',
                  'activities',
                ])
                .subscribe({
                  next: (period) => {
                    console.log('Period itinerary:', period);
                    this.currentPeriod = period;
                    this.tripType = period.tripType || '';
                    this.hotels = period.hotels as any[];
                    this.activities = [
                      ...(period.activities || []),
                      ...(period.includedActivities || []),
                    ];
                    this.updateItinerary();

                    // Share the selected date and trip type with the service
                    this.tourDataService.updateSelectedDateInfo(
                      this.selectedDate,
                      this.tripType
                    );
                  },
                  error: (error) => console.error('Error period:', error),
                });
            },
            error: (error) => console.error('Error itinerary section:', error),
          });

        this.toursService
          .getTourDetailBySlug(slug, ['cities'])
          .subscribe((tour) => {
            this.cities = tour['cities'];
            let loadedCities = 0;
            const totalCities = this.cities.length;
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
    if (this.citiesData.length === 0) return;
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
          this.hotels = period.hotels as any[];
          this.activities = [
            ...(period.activities || []),
            ...(period.includedActivities || []),
          ];
          console.log('Period itinerary 2:', period);

          this.updateItinerary();

          // Share the updated selected date and trip type with the service
          this.tourDataService.updateSelectedDateInfo(
            this.selectedDate,
            this.tripType
          );
        },
        error: (error) => console.error('Error period:', error),
      });
  }

  updateDateDisplay(): void {
    this.selectedDate = this.dateOptions.find(
      (option) => option.value === this.selectedOption.value
    )?.label!;
    this.tripType = this.currentPeriod?.tripType || '';
  }

  updateItinerary(): void {
    console.log(
      this.itinerariesData?.['itineraries'],
      this.selectedOption.value
    );

    const selectedItinerary = this.itinerariesData?.['itineraries'].filter(
      (itinerary) =>
        itinerary.periods
          .map((period) => period.split('-')[1])
          .includes(this.selectedOption.value)
    )[0];
    console.log('Selected itinerary:', selectedItinerary, this.hotels);

    this.itinerary = selectedItinerary!['days'].map((day, index) => {
      console.log(
        'itinerary activities',
        this.activities.filter((activity) => index + 1 === activity.day)
      );

      return {
        title: day.name,
        description: this.sanitizer.bypassSecurityTrustHtml(day.description),
        image: day.itimage?.[0]?.url || '',
        hotel: this.hotels.find(
          (hotel) =>
            `${hotel?.id}` === `${day.id}` ||
            hotel?.days?.includes(`${index + 1}`)
        ),
        collapsed: index !== 0,
        color: '#9C27B0',
        highlights:
          this.activities
            .filter((activity) => index + 1 === activity.day)
            .map((activity) => {
              return {
                title: activity.name,
                description: activity.description || '',
                image: activity.activityImage?.[0]?.url || '',
                optional: activity.optional,
              };
            }) || [],
      };
    });
    console.log('Itinerary:', this.itinerary);
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
    if (this.itineraryPanels && this.itineraryPanels.length > index) {
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
}
