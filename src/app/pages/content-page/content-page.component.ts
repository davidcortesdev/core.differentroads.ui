import { Component, OnDestroy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { filter, Observable, Subject, takeUntil } from 'rxjs';
import { Press } from '../../core/models/press/press.model';
import { Landing } from '../../core/models/landings/landing.model';
import { Title, Meta } from '@angular/platform-browser';

export interface ITour {
  imageUrl: string;
  title: string;
  description: string;
  rating: number;
  tag: string;
  price: number;
  availableMonths: string[];
  isByDr: boolean;
  webSlug: string;
}

type ContentType = 'landing' | 'collection' | 'press' | 'blog' | 'none';

@Component({
  selector: 'app-content-page',
  standalone: false,
  templateUrl: './content-page.component.html',
  styleUrls: ['./content-page.component.scss'],
})
export class ContentPageComponent implements OnInit, OnChanges, OnDestroy {
  contentType: ContentType = 'none';
  contentTitle: string = '';
  contentDescription: string = '';

  get isLanding(): boolean {
    return this.contentType === 'landing';
  }
  get isCollection(): boolean {
    return this.contentType === 'collection';
  }
  get isPress(): boolean {
    return this.contentType === 'press';
  }
  get isBlog(): boolean {
    return this.contentType === 'blog';
  }

  slug: string = '';
  blocks: any[] = [];

  bannerImage: string = '';
  bannerImageAlt: string = '';
  bannerTitle: string = '';
  bannerSubtitle?: string;
  bannerDescription: string = '';

  // Properties for tours management
  showTours: boolean = false;
  isTagBasedCollection: boolean = false;
  collectionTags: string[] = [];

  // Tours data
  displayedTours: ITour[] = [];

  // Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private titleService: Title,
    private meta: Meta
  ) {}

  ngOnInit(): void {
    // Inicialización inicial
    this.determineContentType();
    this.fetchBlocks();
    
    // Detectar cambios en los parámetros de la ruta
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const newSlug = params.get('slug') || '';
      if (newSlug !== this.slug) {
        this.slug = newSlug;
        this.determineContentType();
        this.fetchBlocks();
      }
    });
    
    // Detectar cambios de ruta, incluso a la misma URL
    this.router.events.pipe(
      takeUntil(this.destroy$),
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.determineContentType();
      this.fetchBlocks();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Este método se ejecutará cuando cambien las propiedades de entrada
    // Aunque no tenemos @Input directos, podemos usarlo para forzar actualizaciones
    this.determineContentType();
    this.fetchBlocks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private determineContentType(): void {
    const routePath = this.route.snapshot.routeConfig?.path || '';

    if (routePath === 'landing/:slug') {
      this.contentType = 'landing';
    } else if (routePath === 'collection/:slug') {
      this.contentType = 'collection';
    } else if (routePath === 'press/:slug') {
      this.contentType = 'press';
    } else if (routePath === 'blog/:slug') {
      this.contentType = 'blog';
    }

    this.slug = this.route.snapshot.paramMap.get('slug') || '';
  }

  fetchBlocks(): void {
    switch (this.contentType) {
      case 'landing':
        this.fetchLandingData();
        break;
      case 'collection':
        this.fetchCollectionData();
        break;
      case 'press':
        this.fetchPressData();
        break;
      case 'blog':
        this.fetchBlogData();
        break;
    }
  }

  private updatePageTitle(title: string): void {
    if (title) {
      this.titleService.setTitle(`${title} - Different Roads`);
      
      // Meta descripción optimizada para SEO (70-155 caracteres)
      const contentType = this.getContentTypeDescription();
      let description = '';
      
      // Crear descripción específica según el tipo de contenido
      switch (this.contentType) {
        case 'landing':
          description = `${title} - Ofertas especiales y promociones exclusivas de viajes. Aprovecha descuentos únicos en Different Roads.`;
          break;
        case 'collection':
          description = `${title} - Colección curada de experiencias de viaje únicas. Descubre destinos increíbles con Different Roads.`;
          break;
        case 'press':
          description = `${title} - Noticias y artículos sobre nuestros viajes y experiencias. Mantente informado con Different Roads.`;
          break;
        case 'blog':
          description = `${title} - Consejos, guías y experiencias de viaje. Aprende de nuestros expertos en Different Roads.`;
          break;
        default:
          description = `${title} - Información importante sobre nuestros servicios de viaje. Conoce más en Different Roads.`;
      }
      
      // Asegurar que esté entre 70 y 155 caracteres
      let finalDescription = description;
      if (description.length < 70) {
        finalDescription = description + ' Explora nuestras opciones de viaje.';
      } else if (description.length > 155) {
        finalDescription = description.substring(0, 152) + '...';
      }
      
      this.meta.updateTag({ name: 'description', content: finalDescription });
    }
  }

  private getContentTypeDescription(): string {
    switch (this.contentType) {
      case 'landing':
        return 'Ofertas especiales y promociones exclusivas. ';
      case 'collection':
        return 'Colección de experiencias de viaje únicas. ';
      case 'press':
        return 'Noticias y artículos sobre nuestros viajes. ';
      case 'blog':
        return 'Consejos, guías y experiencias de viaje. ';
      default:
        return 'Información importante sobre nuestros servicios. ';
    }
  }

  private fetchLandingData(): void {
    //TODO: Pendiente de desarrollar proximamente
  }

  private fetchCollectionData(): void {
    //TODO: Pendiente de desarrollar proximamente
  }

  private fetchPressData(): void {
    //TODO: Pendiente de desarrollar proximamente
  }

  private fetchBlogData(): void {
    //TODO: Pendiente de desarrollar proximamente

  }

  private extractCollectionTags(data: any): void {
    if (data.tags && Array.isArray(data.tags)) {
      this.collectionTags = data.tags;
    } else if (data.tag && typeof data.tag === 'string') {
      this.collectionTags = [data.tag];
    } else if (data.tags && typeof data.tags === 'string') {
      this.collectionTags = data.tags
        .split(',')
        .map((tag: string) => tag.trim());
    }
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onToursLoaded(tours: ITour[]): void {
    this.displayedTours = tours;
  }
}
