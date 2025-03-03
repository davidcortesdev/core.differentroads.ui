import {
  Component,
  OnInit,
  HostListener,
  ElementRef,
  Renderer2,
  AfterViewInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Tour } from '../../../../core/models/tours/tour.model';

@Component({
  selector: 'app-tour-header',
  standalone: false,
  templateUrl: './tour-header.component.html',
  styleUrls: ['./tour-header.component.scss'],
})
export class TourHeaderComponent implements OnInit, AfterViewInit {
  tour: Partial<Tour> = {};
  marketingTag: string = '';
  private isScrolled = false;
  private headerHeight = 0;

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService,
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadTourData(slug);
      }
    });
  }

  ngAfterViewInit() {
    // Obtener la altura del encabezado
    const headerElement = this.el.nativeElement.querySelector('.tour-header');
    if (headerElement) {
      this.headerHeight = headerElement.offsetHeight;

      // Establecer la altura como variable CSS personalizada
      document.documentElement.style.setProperty(
        '--header-height',
        `${this.headerHeight}px`
      );
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    const headerElement = this.el.nativeElement.querySelector('.tour-header');

    if (!headerElement) return;

    // Umbral de scroll - puede ajustarse según necesidades
    const scrollThreshold = 100;

    if (scrollPosition > scrollThreshold && !this.isScrolled) {
      // Aplicar clase scrolled al header
      this.renderer.addClass(headerElement, 'scrolled');

      // Añadir clase al componente para activar el espaciado
      this.renderer.addClass(this.el.nativeElement, 'header-fixed');

      this.isScrolled = true;
    } else if (scrollPosition <= scrollThreshold && this.isScrolled) {
      // Quitar clase scrolled al header
      this.renderer.removeClass(headerElement, 'scrolled');

      // Quitar clase al componente para desactivar el espaciado
      this.renderer.removeClass(this.el.nativeElement, 'header-fixed');

      this.isScrolled = false;
    }
  }

  private loadTourData(slug: string) {
    this.toursService.getTourDetailBySlug(slug).subscribe({
      next: (tourData) => {
        console.log('Tour Data:', tourData);
        this.tour = {
          ...this.tour,
          ...tourData,
        };
        // Extraer el marketingTag si existe
        this.marketingTag = tourData.marketingSection?.marketingTag || '';
      },
      error: (error) => {
        console.error('Error loading tour:', error);
      },
    });
  }

  getDuration(): string {
    if (this.tour.activePeriods && this.tour.activePeriods.length > 0) {
      return this.getDuration2(this.tour.activePeriods[0].days);
    }
    return '';
  }

  getDuration2(days: number | undefined): string {
    if (!days) return '';
    return `${days} días, ${days - 1} noches`;
  }
}
