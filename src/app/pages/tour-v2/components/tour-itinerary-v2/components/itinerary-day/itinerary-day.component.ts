import { Component, Input, OnInit, ViewChildren, QueryList, OnChanges, SimpleChanges } from '@angular/core';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Panel } from 'primeng/panel';

// Importar servicios para itinerary, itinerary days y CMS
import { ItineraryService, IItineraryResponse, ItineraryFilters } from '../../../../../../core/services/itinerary/itinerary.service';
import { ItineraryDayService, IItineraryDayResponse } from '../../../../../../core/services/itinerary/itinerary-day/itinerary-day.service';
import { ItineraryDayCMSService, IItineraryDayCMSResponse } from '../../../../../../core/services/itinerary/itinerary-day/itinerary-day-cms.service';

// Interface para los elementos del itinerario en el timeline
interface ItineraryItem {
  dayId: number;
  dayNumber: number;
  title: string;
  description: SafeHtml;
  image: string;
  imageAlt: string;
  collapsed: boolean;
  color?: string;
  additionalInfoTitle?: string;
  additionalInfoContent?: SafeHtml;
  hasAdditionalInfo: boolean;
  icon: string;
}

// Interface para datos procesados de días
interface ProcessedItineraryDay {
  day: IItineraryDayResponse;
  cms?: IItineraryDayCMSResponse;
  hasValidData: boolean;
}

@Component({
  selector: 'app-itinerary-day',
  standalone: false,
  templateUrl: './itinerary-day.component.html',
  styleUrl: './itinerary-day.component.scss'
})
export class ItineraryDayComponent implements OnInit, OnChanges {
  @Input() tourId: number | undefined;
  @Input() itineraryId: number | undefined;
  @Input() departureId: number | undefined; // NUEVO: Recibir el departure ID seleccionado
  
  @ViewChildren('itineraryPanel') itineraryPanels!: QueryList<Panel>;
  
  // Estados del componente
  loading = true;
  showDebug = false;
  
  // Propiedades para los días del itinerario
  itineraryDays: IItineraryDayResponse[] = [];
  itineraryDaysCMS: IItineraryDayCMSResponse[] = [];
  processedDays: ProcessedItineraryDay[] = [];
  
  // Propiedades para el timeline
  itineraryItems: ItineraryItem[] = [];
  
  // Map para optimización de búsquedas O(1)
  private daysCMSMap = new Map<number, IItineraryDayCMSResponse>();
  
  constructor(
    private itineraryService: ItineraryService,
    private itineraryDayService: ItineraryDayService,
    private itineraryDayCMSService: ItineraryDayCMSService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // NO cargar nada en ngOnInit - esperar a que llegue itineraryId
    if (this.itineraryId) {
      this.loadInitialData();
    } else {
      // Si no hay itineraryId, mostrar estado vacío
      this.loading = false;
      this.clearData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    
    // Si cambió el itineraryId o departureId
    if (changes['itineraryId'] || changes['departureId']) {
      const currentItineraryId = this.itineraryId;
      const currentDepartureId = this.departureId;
            
      if (currentItineraryId) {
        this.loadInitialData();
      } else {
        // Si no hay itineraryId, limpiar datos
        this.clearData();
      }
    }
  }

  private loadInitialData(): void {
    if (this.itineraryId) {
      this.loadItineraryDaysData([this.itineraryId]);
    } else {
      console.warn('⚠️ No se proporcionó itineraryId específico');
      this.loading = false;
      this.clearData();
    }
  }

  private clearData(): void {
    this.itineraryDays = [];
    this.itineraryDaysCMS = [];
    this.processedDays = [];
    this.itineraryItems = [];
    this.daysCMSMap.clear();
    this.loading = false;
  }

  /**
   * 📋 MÉTODO: Cargar días de itinerario filtrados por itineraryIds específicos
   */
  private loadItineraryDaysData(itineraryIds: number[]): void {
    this.loading = true;
        
    // Crear observables para cada itineraryId y combinar los resultados
    const itineraryDaysObservables = itineraryIds.map(itineraryId => 
      this.itineraryDayService.getAll({ itineraryId }).pipe(
        catchError(error => {
          console.error(`❌ Error loading days for itinerary ${itineraryId}:`, error);
          return of([]);
        })
      )
    );

    // Primero cargar todos los días de itinerario
    forkJoin(itineraryDaysObservables).pipe(
      map(daysArrays => daysArrays.flat()), // Aplanar el array de arrays
      catchError(error => {
        console.error('❌ Error loading itinerary days:', error);
        return of([]);
      })
    ).subscribe(filteredItineraryDays => {      
      // Ahora cargar el CMS usando los IDs de los días obtenidos
      this.loadItineraryDaysCMS(filteredItineraryDays);
    });
  }

  /**
   * 📄 MÉTODO: Cargar CMS de días usando itineraryDayId
   */
  private loadItineraryDaysCMS(itineraryDays: IItineraryDayResponse[]): void {
    if (itineraryDays.length === 0) {
      this.clearData();
      return;
    }

    // Obtener los IDs de los días para filtrar el CMS
    const dayIds = itineraryDays.map(day => day.id);
    
    // Crear observables para obtener CMS de cada día
    const itineraryDaysCMSObservables = dayIds.map(dayId => 
      this.itineraryDayCMSService.getAll({ itineraryDayId: dayId }).pipe(
        catchError(error => {
          console.error(`❌ Error loading CMS for day ${dayId}:`, error);
          return of([]);
        })
      )
    );

    // Combinar todas las llamadas de CMS
    forkJoin(itineraryDaysCMSObservables).pipe(
      map(cmsArrays => cmsArrays.flat()), // Aplanar el array de arrays
      finalize(() => {
        this.loading = false;
      })
    ).subscribe(filteredItineraryDaysCMS => {      
      // Almacenar los datos ya filtrados
      this.itineraryDays = itineraryDays;
      this.itineraryDaysCMS = filteredItineraryDaysCMS;

      // Procesar datos del itinerario
      this.createDaysCMSMap(filteredItineraryDaysCMS);
      this.processItineraryDays();
      this.createItineraryItemsFromDays();      
    });
  }

  /**
   * 🔑 MÉTODO: Crear Map para búsquedas optimizadas de CMS O(1)
   */
  private createDaysCMSMap(daysCMS: IItineraryDayCMSResponse[]): void {
    this.daysCMSMap.clear();
    
    daysCMS.forEach(cms => {
      this.daysCMSMap.set(cms.itineraryDayId, cms);
    });
  }

  /**
   * 🔄 MÉTODO: Procesar días del itinerario combinando datos base y CMS
   */
  private processItineraryDays(): void {
    this.processedDays = [];
        
    this.itineraryDays.forEach(day => {
      // Búsqueda O(1) del contenido CMS asociado
      const cmsData = this.daysCMSMap.get(day.id);
      
      const processedDay: ProcessedItineraryDay = {
        day: day,
        cms: cmsData,
        hasValidData: !!(day.name || cmsData?.longTitle)
      };
      
      this.processedDays.push(processedDay);
    });
    
    // Ordenar por número de día
    this.processedDays.sort((a, b) => a.day.dayNumber - b.day.dayNumber);
  }

  /**
   * 🎨 MÉTODO: Crear elementos del timeline basados en los días procesados
   */
  private createItineraryItemsFromDays(): void {
    this.itineraryItems = this.processedDays.map((processedDay, index) => {
      const day = processedDay.day;
      const cms = processedDay.cms;
      
      // Determinar el título del día (sin el número de día)
      const dayTitle = cms?.longTitle || day.name || `Día ${day.dayNumber}`;
      
      // Crear descripción principal
      let description = '';
      if (cms?.webDescription) {
        description = cms.webDescription;
      } else if (day.description) {
        description = day.description;
      } else {
        description = `<p>Día ${day.dayNumber} del itinerario</p>`;
      }
      
      // Información adicional
      const hasAdditionalInfo = !!(cms?.additionalInfoTitle && cms?.additionalInfoContent);
      let additionalInfoContent: SafeHtml | undefined;
      
      if (hasAdditionalInfo && cms?.additionalInfoContent) {
        additionalInfoContent = this.sanitizer.bypassSecurityTrustHtml(cms.additionalInfoContent);
      }
      
      const imageAlt = `Día ${day.dayNumber} ${dayTitle}`;
      
      return {
        dayId: day.id,
        dayNumber: day.dayNumber,
        title: dayTitle,
        description: this.sanitizer.bypassSecurityTrustHtml(description),
        image: cms?.imageUrl || '',
        imageAlt: imageAlt,
        collapsed: index !== 0,
        color: '#ea685c',
        additionalInfoTitle: cms?.additionalInfoTitle || undefined,
        additionalInfoContent: additionalInfoContent,
        hasAdditionalInfo: hasAdditionalInfo,
        icon: 'pi-map-marker'
      } as ItineraryItem;
    });
  }

  // Métodos para manejar los paneles del timeline
  markerClicked(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const index = element.getAttribute('data-index');
    if (index !== null) {
      const itemIndex = parseInt(index, 10);
      this.itineraryItems[itemIndex].collapsed = !this.itineraryItems[itemIndex].collapsed;
    }
  }

  handlePanelClick(index: number): void {
    this.itineraryItems[index].collapsed = !this.itineraryItems[index].collapsed;
  }

  /**
   * Expands all day panels in the itinerary
   */
  expandAllPanels(): void {
    if (this.itineraryItems && this.itineraryItems.length > 0) {
      this.itineraryItems.forEach((item) => {
        item.collapsed = false;
      });
    }
  }

  /**
   * Collapses all day panels in the itinerary
   */
  collapseAllPanels(): void {
    if (this.itineraryItems && this.itineraryItems.length > 0) {
      this.itineraryItems.forEach((item) => {
        item.collapsed = true;
      });
    }
  }

  /**
   * 📊 GETTER: Estadísticas del itinerario
   */
  get itineraryStats() {
    return {
      totalDays: this.processedDays.length,
      daysWithCMS: this.processedDays.filter(day => !!day.cms).length,
      daysWithImages: this.itineraryItems.filter(item => item.image).length,
      daysWithAdditionalInfo: this.itineraryItems.filter(item => item.hasAdditionalInfo).length
    };
  }

  /**
   * ✅ GETTER: Verificar si hay datos válidos para mostrar
   */
  get hasValidData(): boolean {
    return !this.loading && this.processedDays.length > 0;
  }

  /**
   * 🔄 MÉTODO: Refrescar datos del itinerario
   */
  refreshItinerary(): void {
    this.loadInitialData();
  }
}