// tour-highlights-v2.component.ts - Configuración del carrusel corregida
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { TourHighlightsService, ITourHighlightResponse } from '../../../../core/services/tour/tour-highlights.service';

// Interfaz para el highlight transformado
interface HighlightDisplay {
  id: number;
  title: string;
  description: string;
  image: string;
  optional: boolean;
}

@Component({
  selector: 'app-tour-highlights-v2',
  standalone: false,
  templateUrl: './tour-highlights-v2.component.html',
  styleUrls: ['./tour-highlights-v2.component.scss']
})
export class TourHighlightsV2Component implements OnInit, OnChanges {
  @Input() tourId: number | undefined;

  // Data para el template
  highlights: HighlightDisplay[] = [];
  highlightsTitle = 'Highlights';
  isLoading = true;
  
  // Modal data
  showFullHighlightModal = false;
  selectedHighlight: HighlightDisplay | null = null;

  // Carousel configuration
  carouselConfig = {
    DEFAULT_AUTOPLAY_INTERVAL: 3000
  };
  
  carouselNumVisible = 5; // Cambiar a 5 como el componente original
  
  responsiveOptions = [
    {
      breakpoint: '1750px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '1199px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  // Styles - copiando exactamente del componente original
  cardStyle = {
    'border-radius': '1rem',
    overflow: 'hidden',
    border: 'none',
    boxShadow: 'none'
  };
  
  dialogStyle = {
    width: '90%', 
    maxWidth: '800px'
  };

  constructor(private tourHighlightsService: TourHighlightsService) { }

  ngOnInit(): void {
    this.adjustCarouselForScreenSize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tourId'] && changes['tourId'].currentValue) {
      this.loadHighlights();
    }
  }

  // Método para ajustar el carousel según el tamaño de pantalla inicial
  private adjustCarouselForScreenSize(): void {
    const width = window.innerWidth;
    if (width <= 767) {
      this.carouselNumVisible = 1;
    } else if (width <= 991) {
      this.carouselNumVisible = 2;
    } else if (width <= 1199) {
      this.carouselNumVisible = 3;
    } else if (width <= 1750) {
      this.carouselNumVisible = 4;
    } else {
      this.carouselNumVisible = 5;
    }
  }

  loadHighlights(): void {
    if (!this.tourId) {
      console.warn('⚠️ No hay tourId disponible');
      return;
    }
    
    this.isLoading = true;

    this.tourHighlightsService.getAll({ 
      tourId: this.tourId, 
      isActive: true 
    }).subscribe({
      next: (data) => {
        
        // Transformar la data del API al formato que necesita el template
        this.highlights = this.transformHighlightsData(data);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar los highlights:', error);
        this.highlights = [];
        this.isLoading = false;
      }
    });
  }

  /**
   * Transforma la data del API al formato que necesita el template
   */
  private transformHighlightsData(apiData: ITourHighlightResponse[]): HighlightDisplay[] {
    return apiData.map(highlight => ({
      id: highlight.id,
      title: highlight.name || 'Sin título',
      description: highlight.description || 'Sin descripción',
      image: this.getHighlightImage(highlight),
      optional: this.isOptionalHighlight(highlight)
    }));
  }

  /**
   * Obtiene la imagen del highlight (usa imagen por defecto si no tiene)
   */
  private getHighlightImage(highlight: ITourHighlightResponse): string {
    // Si el API tiene imageUrl, úsala, sino imagen por defecto
    const defaultImage = 'https://via.placeholder.com/300x200/4CAF50/white?text=Highlight';
    return (highlight as any).imageUrl || defaultImage;
  }

  /**
   * Determina si el highlight es opcional basado en isIncluded
   * Si isIncluded es true = "Incluida", si es false = "Opcional"
   */
  private isOptionalHighlight(highlight: ITourHighlightResponse): boolean {
    // Si tiene el campo isIncluded, usarlo; sino asumir que está incluido
    const isIncluded = (highlight as any).isIncluded;
    return isIncluded === false; // Solo es opcional si isIncluded es explícitamente false
  }

  /**
   * Abre el modal con el highlight completo
   */
  openFullHighlight(highlight: HighlightDisplay): void {
    this.selectedHighlight = highlight;
    this.showFullHighlightModal = true;
  }
}