import {
  Component,
  OnInit,
  ViewChildren,
  QueryList,
  ViewChild,
  OnDestroy,
} from '@angular/core';
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
import {
  TourMapComponent,
  City,
} from '../../../../shared/components/tour-map/tour-map.component';

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

  // Mantener solo el Subject para la limpieza
  private destroy$ = new Subject<void>();

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
  country: string | undefined;

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
    private messageService: MessageService,
  ) {
    this.events = [];
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        // Obtener el parámetro filterByStatus de los query params
        const filterByStatus =
          this.route.snapshot.queryParamMap.get('filterByStatus') !== 'false';

        this.toursService
          .getTourDetailBySlug(
            slug,
            ['itinerary-section', 'activePeriods', 'basePrice'],
            filterByStatus
          )
          .subscribe({
            next: (tourData) => {
              // Crear las opciones de fecha sin ordenar
              const unsortedDateOptions = tourData.activePeriods.map(
                (period) => {
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
                }
              );

              // Ordenar las opciones de fecha por dayOne (fecha de inicio) de forma ascendente
              this.dateOptions = unsortedDateOptions.sort((a, b) => {
                const dateA = new Date(a.dayOne).getTime();
                const dateB = new Date(b.dayOne).getTime();
                return dateA - dateB;
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
          .getTourDetailBySlug(slug, ['cities','country'], filterByStatus)
          .subscribe((tour) => {
            this.cities = tour['cities'];
            this.country = tour['country'];
            // Eliminamos la lógica de procesamiento de ciudades
          });
      }
    });
  }

  // Eliminamos el método addCityToData ya que no lo necesitamos más

  // Método para manejar la limpieza del componente
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Método para agregar una ciudad a los datos
  addCityToData(city: string,country:string, lat: number, lng: number, index?: number): void {
    const cityData: City = {
      nombre: city,
      lat: lat,
      lng: lng,
      country: country,
    };

    // Agregar la ciudad a los datos
    this.citiesData.push(cityData);

    // Actualizar el mapa si está disponible
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
        'externalID',
      ])
      .subscribe({
        next: (period) => {
          console.log('Period details:', period);

          this.currentPeriod = period;
          this.tripType = period.tripType || '';
          this.hotels = period.hotels;
          this.fetchHotels();

          // Get activities from period details
          const allActivities = [
            ...(period.activities || []),
            ...(period.includedActivities || []),
          ];
          console.log('periodallActivities:', allActivities);

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
      const hotelByDay = this.hotels?.find(
        (hotel) => hotel.days && hotel.days.includes(`${index + 1}`)
      );

      const hotel = this.hotelsData.find(
        (hotelData) =>
          hotelData.externalID === hotelByDay?.hotels?.[0]?.externalID
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
      this.itinerary.forEach((item) => {
        item.collapsed = false;
      });
    }
  }

  /**
   * Collapses all day panels in the itinerary
   */
  collapseAllPanels(): void {
    if (this.itinerary && this.itinerary.length > 0) {
      this.itinerary.forEach((item) => {
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
            (existingHotel) => existingHotel.externalID === hotel.externalID
          )
        ) {
          this.hotelsService.getHotelByExternalId(hotel.externalID).subscribe({
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
