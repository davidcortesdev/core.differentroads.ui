import { Component, OnInit } from '@angular/core';
import { ToursService } from '../../../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import {
  GoogleMap,
  GoogleMapsModule,
  MapInfoWindow,
  MapMarker,
} from '@angular/google-maps';
import { GeoService } from '../../../../core/services/geo.service';
import { Tour } from '../../../../core/models/tours/tour.model';

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
  highlights: any[] = [];

  itinerary: {
    title: string;
    description: SafeHtml;
    image: string;
    hotel: any;
    collapsed: boolean;
  }[] = [];

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

  constructor(
    private toursService: ToursService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private httpClient: HttpClient,
    private geoService: GeoService
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

    this.events = [
      {
        status: 'Ordered',
        date: '15/10/2020 10:30',
        icon: 'pi pi-shopping-cart',
        color: '#9C27B0',
        image: 'game-controller.jpg',
      },
      {
        status: 'Processing',
        date: '15/10/2020 14:00',
        icon: 'pi pi-cog',
        color: '#673AB7',
      },
      {
        status: 'Shipped',
        date: '15/10/2020 16:15',
        icon: 'pi pi-shopping-cart',
        color: '#FF9800',
      },
      {
        status: 'Delivered',
        date: '16/10/2020 10:00',
        icon: 'pi pi-check',
        color: '#607D8B',
      },
    ];

    this.highlights = [
      /*  {
        title: 'Highlight 1',
        description: 'Description for highlight 1',
        image: 'https://picsum.photos/200',
        optional: false,
      },
      {
        title: 'Highlight 2',
        description: 'Description for highlight 2',
        image: 'https://picsum.photos/200',

        optional: true,
      }, */
    ];
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.toursService
          .getTourDetailBySlug(slug, ['itinerary-section'])
          .subscribe({
            next: (tourData) => {
              this.title = tourData['itinerary-section'].title;
              this.itinerary = tourData['itinerary-section']['day-card'].map(
                (section, index) => {
                  return {
                    title: section.name,
                    description: this.sanitizer.bypassSecurityTrustHtml(
                      section.description
                    ),
                    image: section.itimage?.[0]?.url || '',
                    hotel: section.hotel,
                    collapsed: index !== 0, // Solo el primer panel estará expandido
                  };
                }
              );
            },
            error: (error) =>
              console.error('Error fetching itinerary section:', error),
          });
          const selectedFields: (keyof Tour | 'all' | undefined)[] = ['cities'];
      this.toursService
        .getTourDetailBySlug(slug, selectedFields)
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
              console.log('this.citiesData', this.citiesData);
              console.log('this.markers', this.markers);
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

    // Adjust zoom based on bounds
    const PADDING = 10; // Padding in pixels
    if (this.mapOptions.maxZoom) {
      this.zoom = Math.min(
        this.getZoomLevel(bounds, PADDING),
        this.mapOptions.maxZoom
      );
      console.log(this.zoom);
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
      options: {
        //animation: google.maps.Animation.BOUNCE,
      },
    });
  }
}
