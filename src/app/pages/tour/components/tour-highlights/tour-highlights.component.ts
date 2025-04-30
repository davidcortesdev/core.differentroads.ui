import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToursService } from '../../../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
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
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTourHighlights(): void {
    this.isLoading = true;
    this.route.params.pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (params) => {
        const slug = params['slug'];
        this.fetchTourDetails(slug);
      },
      error: (error) => {
        console.error('Error al obtener parámetros de ruta:', error);
        this.isLoading = false;
      }
    });
  }

  private fetchTourDetails(slug: string): void {
    this.toursService
      .getTourDetailBySlug(slug, ['card-list', 'highlights-title'])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tourData) => {
          this.processHighlightsData(tourData);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al obtener detalles del tour:', error);
          this.isLoading = false;
        },
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
