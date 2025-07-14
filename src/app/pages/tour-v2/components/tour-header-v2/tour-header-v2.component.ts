import {
  Component,
  Input,
  Output,
  OnInit,
  EventEmitter,
  HostListener,
  ElementRef,
  Renderer2,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { TourNetService, Tour } from '../../../../core/services/tourNet.service';
import { TourLocationService, ITourLocationResponse } from '../../../../core/services/tour/tour-location.service';
import { LocationNetService, Location } from '../../../../core/services/locations/locationNet.service';
import { ReservationService, ReservationCreate, IReservationResponse } from '../../../../core/services/reservation/reservation.service';
import { ReservationTravelerService } from '../../../../core/services/reservation/reservation-traveler.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tour-header-v2',
  standalone: false,
  templateUrl: './tour-header-v2.component.html',
  styleUrls: ['./tour-header-v2.component.scss']
})
export class TourHeaderV2Component implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() tourId: number | undefined;
  @Input() totalPrice: number = 0;
  @Input() selectedCity: string = '';
  @Input() selectedDeparture: any = null;
  @Input() totalPassengers: number = 1;

  // Tour data
  tour: Partial<Tour> = {};
  
  // Información geográfica
  country: string = '';
  continent: string = '';

  // Scroll effect
  private isScrolled = false;
  private headerHeight = 0;
  private subscriptions = new Subscription();

  // Estado para controlar el proceso de reservación
  isCreatingReservation = false;

  constructor(
    private tourNetService: TourNetService,
    private tourLocationService: TourLocationService,
    private locationNetService: LocationNetService,
    private reservationService: ReservationService,
    private reservationTravelerService: ReservationTravelerService,
    private el: ElementRef,
    private renderer: Renderer2,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.tourId) {
      this.loadTourData(this.tourId);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tourId'] && changes['tourId'].currentValue) {
      this.loadTourData(changes['tourId'].currentValue);
    }
  }

  ngAfterViewInit() {
    this.setHeaderHeight();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.handleScrollEffect();
  }

  get hasPrice(): boolean {
    return this.totalPrice > 0;
  }

  get formattedPrice(): string {
    if (this.totalPrice <= 0) return '';
    
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(this.totalPrice);
  }

  get formattedFlights(): string {
    return this.selectedCity || '';
  }

  get formattedDepartureWithType(): string {
    if (!this.selectedDeparture || !this.selectedDeparture.departureDate) return '';
    
    try {
      const dateString = this.selectedDeparture.departureDate;
      const dateParts = dateString.split('-');
      
      if (dateParts.length !== 3) return dateString;
      
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);
      
      const date = new Date(year, month, day);
      
      const formattedDate = date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long'
      });
      
      const isSingle = this.selectedDeparture.group?.toLowerCase().includes('single');
      
      if (isSingle) {
        return `${formattedDate} (S) - Single`;
      }
      
      return formattedDate;
    } catch {
      return this.selectedDeparture.departureDate;
    }
  }

  private getTripTypeInfoForConsole(group: string): any {
    if (!group) return undefined;

    const type = group.toLowerCase();

    if (type.includes('single') || type.includes('singles')) {
      return { title: 'Single', description: 'Viaje individual', class: 'single' };
    }

    if (type.includes('group') || type.includes('grupo')) {
      return { title: 'Group', description: 'Viaje en grupo', class: 'group' };
    }

    if (type.includes('private') || type.includes('privado')) {
      return { title: 'Private', description: 'Viaje privado', class: 'private' };
    }

    return undefined;
  }

  private loadTourData(tourId: number) {
    this.subscriptions.add(
      this.tourNetService.getTourById(tourId).subscribe({
        next: (tourData) => {
          this.tour = { ...tourData };
          this.loadCountryAndContinent(tourId);
        },
        error: (error) => {
          console.error('Error cargando tour:', error);
        }
      })
    );
  }

  private loadCountryAndContinent(tourId: number): void {
    this.subscriptions.add(
      forkJoin([
        this.tourLocationService.getByTourAndType(tourId, "COUNTRY").pipe(
          map(response => Array.isArray(response) ? response : (response ? [response] : [])),
          catchError(error => {
            return of([]);
          })
        ),
        this.tourLocationService.getByTourAndType(tourId, "CONTINENT").pipe(
          map(response => Array.isArray(response) ? response : (response ? [response] : [])),
          catchError(error => {
            return of([]);
          })
        )
      ]).pipe(
        switchMap(([countryLocations, continentLocations]) => {
          const validCountryLocations = countryLocations.filter(loc => loc && loc.id && loc.locationId);
          const validContinentLocations = continentLocations.filter(loc => loc && loc.id && loc.locationId);

          const allLocationIds = [
            ...validCountryLocations.map(tl => tl.locationId),
            ...validContinentLocations.map(tl => tl.locationId)
          ];
          const uniqueLocationIds = [...new Set(allLocationIds)];

          if (uniqueLocationIds.length === 0) {
            return of({ 
              countryLocations: validCountryLocations, 
              continentLocations: validContinentLocations, 
              locations: [] 
            });
          }

          return this.locationNetService.getLocationsByIds(uniqueLocationIds).pipe(
            map(locations => ({
              countryLocations: validCountryLocations,
              continentLocations: validContinentLocations,
              locations
            })),
            catchError(error => {
              return of({ 
                countryLocations: validCountryLocations, 
                continentLocations: validContinentLocations, 
                locations: [] 
              });
            })
          );
        })
      ).subscribe(({ countryLocations, continentLocations, locations }) => {
        const locationsMap = new Map<number, Location>();
        locations.forEach(location => {
          locationsMap.set(location.id, location);
        });

        const countries = countryLocations
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(tl => locationsMap.get(tl.locationId)?.name)
          .filter(name => name) as string[];

        const continents = continentLocations
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(tl => locationsMap.get(tl.locationId)?.name)
          .filter(name => name) as string[];

        this.country = countries.join(', ');
        this.continent = continents.join(', ');
      })
    );
  }

  private setHeaderHeight() {
    const headerElement = this.el.nativeElement.querySelector('.tour-header');
    if (headerElement) {
      this.headerHeight = headerElement.offsetHeight;
      document.documentElement.style.setProperty(
        '--header-height',
        `${this.headerHeight}px`
      );
    }
  }

  private handleScrollEffect() {
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    const headerElement = this.el.nativeElement.querySelector('.tour-header');

    if (!headerElement) return;

    const scrollThreshold = 100;

    if (scrollPosition > scrollThreshold && !this.isScrolled) {
      this.renderer.addClass(headerElement, 'scrolled');
      this.renderer.addClass(this.el.nativeElement, 'header-fixed');
      this.isScrolled = true;
    } else if (scrollPosition <= scrollThreshold && this.isScrolled) {
      this.renderer.removeClass(headerElement, 'scrolled');
      this.renderer.removeClass(this.el.nativeElement, 'header-fixed');
      this.isScrolled = false;
    }
  }

  onCountryClick(event: MouseEvent, fullCountryText: string): void {
    event.preventDefault();
    
    const clickedCountry = this.getClickedCountry(event, fullCountryText);
    if (clickedCountry) {
      this.router.navigate(['/tours'], {
        queryParams: {
          destination: clickedCountry
        }
      });
    }
  }

  private getClickedCountry(event: MouseEvent, fullText: string): string | null {
    const target = event.target as HTMLElement;
    const countries = fullText.split(',').map(c => c.trim()).filter(c => c);
    
    if (countries.length === 1) {
      return countries[0];
    }
  
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    
    const tempElement = document.createElement('span');
    tempElement.style.visibility = 'hidden';
    tempElement.style.position = 'absolute';
    tempElement.style.fontSize = window.getComputedStyle(target).fontSize;
    tempElement.style.fontFamily = window.getComputedStyle(target).fontFamily;
    document.body.appendChild(tempElement);
    
    let currentX = 0;
    let clickedCountry: string | null = null;
    
    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      const separator = i < countries.length - 1 ? ', ' : '';
      const textToMeasure = country + separator;
      
      tempElement.textContent = textToMeasure;
      const textWidth = tempElement.offsetWidth;
      
      if (clickX >= currentX && clickX <= currentX + textWidth) {
        tempElement.textContent = country;
        const countryWidth = tempElement.offsetWidth;
        
        if (clickX <= currentX + countryWidth) {
          clickedCountry = country;
          break;
        }
      }
      
      currentX += textWidth;
    }
    
    document.body.removeChild(tempElement);
    return clickedCountry;
  }

  @Output() bookingClick = new EventEmitter<void>();

  onBookingClick(): void {
    if (!this.selectedDeparture || !this.selectedDeparture.id) {
      alert('Por favor, selecciona una fecha de salida antes de continuar.');
      return;
    }

    if (!this.tourId) {
      alert('Error: No se pudo identificar el tour.');
      return;
    }

    this.isCreatingReservation = true;

    const reservationData: ReservationCreate = {
      id: 0,
      tkId: '',
      reservationStatusId: 1,
      retailerId: 7,
      tourId: this.tourId,
      departureId: this.selectedDeparture.id,
      userId: 1,
      totalPassengers: this.totalPassengers || 1,
      totalAmount: this.totalPrice || 0,
      budgetAt: '',
      cartAt: new Date().toISOString(),
      abandonedAt: '',
      reservedAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.subscriptions.add(
      this.reservationService.create(reservationData).pipe(
        switchMap((createdReservation: IReservationResponse) => {
          const travelerObservables = [];
          
          for (let i = 0; i < this.totalPassengers; i++) {
            const travelerNumber = i + 1;
            const isLeadTraveler = i === 0;
            
            const travelerData = {
              id: 0,
              reservationId: createdReservation.id,
              travelerNumber: travelerNumber,
              isLeadTraveler: isLeadTraveler,
              tkId: ''
            };
            
            const travelerObservable = this.reservationTravelerService.create(travelerData);
            travelerObservables.push(travelerObservable);
          }
          
          return forkJoin(travelerObservables).pipe(
            map(createdTravelers => {
              return createdReservation;
            })
          );
        })
      ).subscribe({
        next: (createdReservation: IReservationResponse) => {
          this.router.navigate(['/checkout-v2', createdReservation.id]);
        },
        error: (error) => {
          console.error('Error en el proceso:', error);
          alert('Error al crear la reservación o los travelers. Por favor, inténtalo de nuevo.');
        },
        complete: () => {
          this.isCreatingReservation = false;
        }
      })
    );
  }
}