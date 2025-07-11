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
import { ReservationTravelerService } from '../../../../core/services/reservation/reservation-traveler.service'; // ✅ AÑADIDO
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
    private reservationTravelerService: ReservationTravelerService, // ✅ AÑADIDO
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
    
    if (changes['totalPrice']) {
      console.log('💰 Header recibió precio actualizado:', this.totalPrice);
    }
    
    if (changes['selectedCity']) {
      console.log('✈️ Header recibió ciudad actualizada:', this.selectedCity);
    }
    
    if (changes['selectedDeparture']) {
      console.log('🚀 Header recibió departure actualizado:', this.selectedDeparture);
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
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(this.totalPrice);
  }

  get formattedFlights(): string {
    if (!this.selectedCity || this.selectedCity === 'Sin vuelos') {
      return 'Sin vuelos';
    }
    return `Vuelos desde ${this.selectedCity}`;
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
          console.error('❌ Error cargando tour:', error);
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
            console.warn('⚠️ No se encontraron ubicaciones COUNTRY:', error);
            return of([]);
          })
        ),
        this.tourLocationService.getByTourAndType(tourId, "CONTINENT").pipe(
          map(response => Array.isArray(response) ? response : (response ? [response] : [])),
          catchError(error => {
            console.warn('⚠️ No se encontraron ubicaciones CONTINENT:', error);
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
            console.warn('⚠️ No se encontraron locationIds para cargar');
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
              console.error('❌ Error loading specific locations:', error);
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
  
  // ✅ MODIFICADO: Método para crear reservación, travelers y luego navegar
  onBookingClick(): void {
    console.log('🚀 INICIANDO PROCESO DE RESERVACIÓN');
    console.log('📋 Datos disponibles:');
    console.log('  - Tour ID:', this.tourId);
    console.log('  - Selected Departure:', this.selectedDeparture);
    console.log('  - Total Price:', this.totalPrice);
    console.log('  - Total Passengers:', this.totalPassengers);
    
    // Validar que tenemos los datos necesarios
    if (!this.selectedDeparture || !this.selectedDeparture.id) {
      console.error('❌ VALIDACIÓN FALLIDA: No se ha seleccionado una fecha de salida');
      alert('Por favor, selecciona una fecha de salida antes de continuar.');
      return;
    }

    if (!this.tourId) {
      console.error('❌ VALIDACIÓN FALLIDA: No se encontró el ID del tour');
      alert('Error: No se pudo identificar el tour.');
      return;
    }

    console.log('✅ VALIDACIONES PASADAS - Procediendo a crear reservación');

    // Indicar que se está creando la reservación
    this.isCreatingReservation = true;

    // Crear objeto de reservación
    const reservationData: ReservationCreate = {
      id: 0,
      tkId: '',
      reservationStatusId: 1,
      retailerId: 1,
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

    console.log('📝 DATOS DE RESERVACIÓN A ENVIAR:');
    console.log(JSON.stringify(reservationData, null, 2));
    console.log('🔄 ENVIANDO PETICIÓN AL BACKEND...');

    // Crear la reservación
    this.subscriptions.add(
      this.reservationService.create(reservationData).pipe(
        switchMap((createdReservation: IReservationResponse) => {
          console.log('🎉 ¡RESERVACIÓN CREADA EXITOSAMENTE!');
          console.log('📊 RESPUESTA DEL BACKEND:');
          console.log(JSON.stringify(createdReservation, null, 2));
          console.log('🔑 ID DE RESERVACIÓN GENERADO:', createdReservation.id);
          console.log('🎫 TK ID GENERADO:', createdReservation.tkId);
          
          console.log('👥 INICIANDO CREACIÓN DE TRAVELERS...');
          console.log('📊 Número total de pasajeros:', this.totalPassengers);
          
          // Crear travelers de forma secuencial con numeración manual
          const travelerObservables = [];
          
          for (let i = 0; i < this.totalPassengers; i++) {
            const travelerNumber = i + 1; // Numeración manual: 1, 2, 3, etc.
            const isLeadTraveler = i === 0; // Solo el primer traveler es lead
            console.log(`🧳 Creando traveler ${travelerNumber}/${this.totalPassengers} - Lead: ${isLeadTraveler}`);
            
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
          
          // Ejecutar todas las creaciones de travelers en paralelo
          return forkJoin(travelerObservables).pipe(
            map(createdTravelers => {
              console.log('✅ TODOS LOS TRAVELERS CREADOS EXITOSAMENTE:');
              createdTravelers.forEach((traveler, index) => {
                console.log(`  Traveler ${index + 1}:`, {
                  id: traveler.id,
                  travelerNumber: traveler.travelerNumber,
                  isLeadTraveler: traveler.isLeadTraveler
                });
              });
              return createdReservation;
            })
          );
        })
      ).subscribe({
        next: (createdReservation: IReservationResponse) => {
          console.log('🧭 NAVEGANDO AL CHECKOUT...');
          // Navegar al checkout con la reservación creada
          this.router.navigate(['/checkout-v2', this.selectedDeparture.id], {
            state: {
              tourName: this.tour.name,
              departureDate: this.selectedDeparture.departureDate,
              returnDate: this.selectedDeparture.returnDate,
              departureId: this.selectedDeparture.id,
              reservationId: createdReservation.id,
              totalAmount: this.totalPrice
            }
          });
          console.log('✅ PROCESO COMPLETADO - Usuario dirigido al checkout');
        },
        error: (error) => {
          console.error('💥 ERROR EN EL PROCESO:');
          console.error('📋 Detalles del error:', error);
          console.error('🌐 Status:', error.status);
          console.error('📄 Message:', error.message);
          console.error('📦 Full error object:', JSON.stringify(error, null, 2));
          alert('Error al crear la reservación o los travelers. Por favor, inténtalo de nuevo.');
        },
        complete: () => {
          console.log('🏁 OBSERVABLE COMPLETADO');
          this.isCreatingReservation = false;
          console.log('🔄 Estado de carga reseteado');
        }
      })
    );
  }
}