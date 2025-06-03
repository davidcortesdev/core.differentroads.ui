import {
  Component,
  Input,
  OnInit,
  HostListener,
  ElementRef,
  Renderer2,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { TourNetService, Tour } from '../../../../core/services/tourNet.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tour-header-v2',
  standalone: false,
  templateUrl: './tour-header-v2.component.html',
  styleUrls: ['./tour-header-v2.component.scss']
})
export class TourHeaderV2Component implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() tourId: number | undefined;

  // Tour data
  tour: Partial<Tour> = {};
  
  // Scroll effect
  private isScrolled = false;
  private headerHeight = 0;
  private subscriptions = new Subscription();

  constructor(
    private tourNetService: TourNetService,
    private el: ElementRef,
    private renderer: Renderer2
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

  // ===== PRIVATE METHODS =====

  private loadTourData(tourId: number) {
    
    this.subscriptions.add(
      this.tourNetService.getTourById(tourId).subscribe({
        next: (tourData) => {
          
          // Log detallado de cada propiedad
          Object.entries(tourData).forEach(([key, value]) => {
          });
          
          this.tour = { ...tourData };
          
        },
        error: (error) => {
          console.error('❌ ======= ERROR CARGANDO TOUR =======');
          console.error('💥 Error completo:', error);
          console.error('🆔 Tour ID que falló:', tourId);
        }
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
}