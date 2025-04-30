import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToursService } from '../../../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { take, takeUntil, catchError, finalize } from 'rxjs/operators';
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';
import { TourHighlight } from './tour-highlight.interface';

@Component({
  selector: 'app-tour-highlights',
  standalone: false,
  templateUrl: './tour-highlights.component.html',
  styleUrls: ['./tour-highlights.component.scss'],
})
export class TourHighlightsComponent implements OnInit, OnDestroy {
  highlights: TourHighlight[] = [];
  highlightsTitle: string = 'Highlights';
  protected carouselConfig = CAROUSEL_CONFIG;
  private destroy$ = new Subject<void>();
  isLoading = true;
  
  // Variables para el modal
  showFullHighlightModal = false;
  selectedHighlight: TourHighlight | null = null;
  
  // Estilos extraídos como propiedades para mejorar rendimiento
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
  
  // Valor por defecto para numVisible
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

  constructor(
    private toursService: ToursService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadTourHighlights();
    this.adjustCarouselForScreenSize();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

  private loadTourHighlights(): void {
    this.isLoading = true;
    this.route.params.pipe(
      take(1),
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error al obtener parámetros de ruta:', error);
        this.isLoading = false;
        throw error;
      })
    ).subscribe(params => {
      const slug = params['slug'];
      if (slug) {
        this.fetchTourDetails(slug);
      } else {
        this.isLoading = false;
      }
    });
  }

  private fetchTourDetails(slug: string): void {
    // Obtener el parámetro filterByStatus de los query params
    const filterByStatus = this.route.snapshot.queryParamMap.get('filterByStatus') !== 'false';
    
    this.toursService
      .getTourDetailBySlug(slug, ['card-list', 'highlights-title'], filterByStatus)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (tourData) => this.processHighlightsData(tourData),
        error: (error) => console.error('Error al obtener detalles del tour:', error)
      });
  }

  private processHighlightsData(tourData: any): void {
    if (tourData['card-list']) {
      this.highlights = tourData['card-list'].map((card: any) => ({
        title: card.title,
        description: this.sanitizeHtml(card.subtitle),
        image: card.cimage?.[0]?.url || 'assets/images/placeholder-image.jpg',
        optional: !card.included,
      }));
    }

    if (tourData['highlights-title']) {
      this.highlightsTitle = tourData['highlights-title'];
    }
  }

  private sanitizeHtml(html: string): string {
    return html ? html.replace(/<[^>]*>/g, '') : '';
  }
  
  // Método para abrir el modal con el highlight seleccionado
  openFullHighlight(highlight: TourHighlight): void {
    this.selectedHighlight = highlight;
    this.showFullHighlightModal = true;
  }
}
