// tour-highlights-v2.component.ts - Con validación de líneas
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TourHighlightsService, ITourHighlightResponse } from '../../../../core/services/tour/tour-highlights.service';

interface HighlightDisplay {
  id: number;
  title: string;
  description: string;
  sanitizedDescription: SafeHtml;
  image: string;
  optional: boolean;
  hasLongDescription: boolean; // Nueva propiedad para validar si necesita puntos suspensivos
}

@Component({
  selector: 'app-tour-highlights-v2',
  standalone: false,
  templateUrl: './tour-highlights-v2.component.html',
  styleUrls: ['./tour-highlights-v2.component.scss']
})
export class TourHighlightsV2Component implements OnInit, OnChanges {
  @Input() tourId: number | undefined;
  @Input() preview: boolean = false;

  highlights: HighlightDisplay[] = [];
  highlightsTitle = 'Highlights';
  isLoading = true;
  
  showFullHighlightModal = false;
  selectedHighlight: HighlightDisplay | null = null;

  carouselConfig = {
    DEFAULT_AUTOPLAY_INTERVAL: 3000
  };
  
  carouselNumVisible = 5;
  
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

  constructor(
    private tourHighlightsService: TourHighlightsService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.adjustCarouselForScreenSize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tourId'] && changes['tourId'].currentValue) {
      this.loadHighlights();
    }
  }

  sanitizeHtml(html: string = ''): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

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
      isActive: this.preview ? undefined : true
    }).subscribe({
      next: (data) => {
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
   * Cuenta aproximadamente cuántas líneas tendría el texto
   * basándose en caracteres por línea y estructura HTML
   */
  private estimateTextLines(html: string): number {
    // Remover tags HTML para contar solo texto
    const textOnly = html.replace(/<[^>]*>/g, ' ').trim();
    
    // Caracteres aproximados por línea (basado en font-size: 0.875rem)
    const charsPerLine = 45; // Ajusta según tu diseño
    const maxLinesInPreview = 4;
    
    // Contar saltos de línea explícitos
    const explicitBreaks = (textOnly.match(/\n|\r\n|\r/g) || []).length;
    
    // Estimar líneas por longitud de texto
    const estimatedLinesByLength = Math.ceil(textOnly.length / charsPerLine);
    
    // Total de líneas estimadas
    const totalLines = estimatedLinesByLength + explicitBreaks;
    
    return totalLines;
  }

  private transformHighlightsData(apiData: ITourHighlightResponse[]): HighlightDisplay[] {
    return apiData.map(highlight => {
      const description = highlight.description || 'Sin descripción';
      const estimatedLines = this.estimateTextLines(description);
      
      return {
        id: highlight.id,
        title: highlight.name || 'Sin título',
        description: description,
        sanitizedDescription: this.sanitizeHtml(description),
        image: this.getHighlightImage(highlight),
        optional: this.isOptionalHighlight(highlight),
        hasLongDescription: estimatedLines > 4 // Si tiene más de 4 líneas, mostrar puntos suspensivos
      };
    });
  }

  private getHighlightImage(highlight: ITourHighlightResponse): string {
    const defaultImage = 'https://picsum.photos/300/200';
    return (highlight as any).imageUrl || defaultImage;
  }

  private isOptionalHighlight(highlight: ITourHighlightResponse): boolean {
    const isIncluded = (highlight as any).isIncluded;
    return isIncluded === false;
  }

  openFullHighlight(highlight: HighlightDisplay): void {
    this.selectedHighlight = highlight;
    this.showFullHighlightModal = true;
  }
}