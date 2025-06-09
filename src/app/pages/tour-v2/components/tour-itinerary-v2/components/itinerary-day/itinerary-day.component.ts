import { Component, Input, OnInit, ViewChildren, QueryList } from '@angular/core';
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
  icon: string; // Agregado para manejar diferentes iconos
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
export class ItineraryDayComponent implements OnInit {
  @Input() tourId: number | undefined;
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
    if (this.tourId) {
      this.loadItineraryData(this.tourId);
    } else {
      console.warn('⚠️ No se proporcionó tourId para el itinerario');
      this.loading = false;
    }
  }

  /**
   * 📅 MÉTODO PRINCIPAL: Cargar datos del itinerario usando solo tourId (OPTIMIZADO)
   */
  private loadItineraryData(tourId: number): void {
    this.loading = true;
    
    // Definir filtros para obtener itinerarios del tour con las condiciones requeridas
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true
    };
    
    // PASO 1: Primero obtenemos los itinerarios válidos del tour
    this.itineraryService.getAll(itineraryFilters).pipe(
      map(itineraries => {
        // Filtrar además por tkId no vacío si es necesario
        const validItineraries = itineraries.filter(itinerary => 
          itinerary.tkId && 
          itinerary.tkId.trim() !== ''
        );
        return validItineraries;
      }),
      catchError(error => {
        console.error('❌ Error loading itineraries:', error);
        return of([]);
      })
    ).subscribe(tourItineraries => {
      
      if (tourItineraries.length === 0) {
        console.warn('⚠️ No se encontraron itinerarios válidos para el tour', tourId);
        this.loading = false;
        return;
      }

      // Obtener los IDs de los itinerarios válidos
      const validItineraryIds = tourItineraries.map(itinerary => itinerary.id);
      
      // PASO 2: Ahora cargamos solo los días que pertenecen a estos itinerarios
      this.loadItineraryDaysData(validItineraryIds);
    });
  }

  /**
   * 📋 MÉTODO AUXILIAR: Cargar días de itinerario filtrados por itineraryIds
   */
  private loadItineraryDaysData(itineraryIds: number[]): void {
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
   * 📄 MÉTODO AUXILIAR: Cargar CMS de días usando itineraryDayId
   */
  private loadItineraryDaysCMS(itineraryDays: IItineraryDayResponse[]): void {
    if (itineraryDays.length === 0) {
      // No hay días, finalizar carga
      this.itineraryDays = [];
      this.itineraryDaysCMS = [];
      this.processedDays = [];
      this.itineraryItems = [];
      this.loading = false;
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
      
      return {
        dayId: day.id,
        dayNumber: day.dayNumber,
        title: dayTitle,
        description: this.sanitizer.bypassSecurityTrustHtml(description),
        image: cms?.imageUrl || '',
        imageAlt: cms?.imageAlt || dayTitle,
        collapsed: index !== 0, // El primer día estará expandido
        color: '#ea685c', // Color rojo para el icono
        additionalInfoTitle: cms?.additionalInfoTitle || undefined,
        additionalInfoContent: additionalInfoContent,
        hasAdditionalInfo: hasAdditionalInfo,
        icon: 'pi-map-marker' // Icono de ubicación para todos los días
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
      if (!this.itineraryItems[itemIndex].collapsed) {
        setTimeout(() => {
          this.scrollToPanel(itemIndex);
        }, 100);
      }
    }
  }

  handlePanelClick(index: number): void {
    this.itineraryItems[index].collapsed = !this.itineraryItems[index].collapsed;
    if (!this.itineraryItems[index].collapsed) {
      setTimeout(() => {
        this.scrollToPanel(index);
      }, 100);
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
    if (this.tourId) {
      this.loadItineraryData(this.tourId);
    }
  }
}