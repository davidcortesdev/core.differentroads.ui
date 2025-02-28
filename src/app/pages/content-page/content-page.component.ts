import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CollectionsService } from '../../core/services/collections.service';
import { LandingsService } from '../../core/services/landings.service';
import { ToursService } from '../../core/services/tours.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface ITour {
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

@Component({
  selector: 'app-content-page',
  standalone: false,
  templateUrl: './content-page.component.html',
  styleUrls: ['./content-page.component.scss'],
})
export class ContentPageComponent implements OnInit {
  isLanding: boolean = false;
  slug: string = '';
  blocks: any[] = [];

  bannerImage: string = '';
  bannerTitle: string = '';
  bannerSubtitle?: string;
  bannerDescription: string = '';

  // Propiedades para el manejo de tours
  showTours: boolean = false;
  isOffersCollection: boolean = false;
  collectionTag: string = '';

  // Tours y filtros (similares al componente tours)
  displayedTours: ITour[] = [];
  layout: 'grid' | 'list' = 'grid';

  // Opciones de filtrado
  orderOptions = [
    { name: 'Próximas salidas', value: 'next-departures' },
    { name: 'Precio (de menor a mayor)', value: 'min-price' },
    { name: 'Precio (de mayor a menor)', value: 'max-price' },
  ];
  selectedOrderOption: string = 'next-departures';

  priceOptions: { name: string; value: string }[] = [
    { name: 'Menos de $1000', value: '0-1000' },
    { name: '$1000 - $3000', value: '1000-3000' },
    { name: '+ 3000', value: '3000+' },
  ];
  selectedPriceOption: string[] = [];

  seasonOptions: { name: string; value: string }[] = [
    { name: 'Verano', value: 'Verano' },
    { name: 'Invierno', value: 'invierno' },
    { name: 'Primavera', value: 'Primavera' },
    { name: 'Otoño', value: 'otono' },
  ];
  selectedSeasonOption: string[] = [];

  monthOptions: { name: string; value: string }[] = [];
  selectedMonthOption: string[] = [];

  // Nuevas opciones de tags
  tagOptions: { name: string; value: string }[] = [];
  selectedTagOption: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private landingsService: LandingsService,
    private collectionsService: CollectionsService,
    private toursService: ToursService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const routePath = this.route.snapshot.routeConfig?.path;
    this.isLanding = routePath === 'landing/:slug';
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    this.fetchBlocks();
  }

  fetchBlocks() {
    if (this.isLanding) {
      this.landingsService.getLandingBySlug(this.slug).subscribe({
        next: (data: any) => {
          this.blocks = data.blocks || [];
          this.bannerImage =
            data.banner[0]?.url || 'https://picsum.photos/200/300';
          this.bannerTitle = data.title || 'Your Title Here';
          this.bannerSubtitle = data.titleContent || 'Optional Subtitle';
          this.bannerDescription =
            data.content || 'Lorem Ipsum is simply dummy text...';
        },
        error: (error: any) => {
          console.error('Error fetching landing blocks:', error);
        },
      });
    } else {
      this.collectionsService.getCollectionBySlug(this.slug).subscribe({
        next: (data: any) => {
          console.log('fetchedcollection', data);
          this.blocks = data.blocks || ['collection'];
          this.bannerImage =
            data.banner[0]?.url || 'https://picsum.photos/200/300';
          this.bannerTitle = data.title || 'Your Title Here';
          this.bannerSubtitle = data.bannerTitle || 'Optional Subtitle';
          this.bannerDescription =
            data.content || 'Lorem Ipsum is simply dummy text...';

          // Comprobamos si es una colección con tag de ofertas
          this.collectionTag = data.tag || '';
          this.isOffersCollection =
            this.collectionTag.toLowerCase().trim() === 'ofertas';

          // Si es una colección de ofertas, cargamos los tours
          if (this.isOffersCollection) {
            this.showTours = true;
            this.loadTours();
          }
        },
        error: (error: any) => {
          console.error('Error fetching collection blocks:', error);
        },
      });
    }
  }

  // Método para sanitizar HTML, usado directamente en el template
  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  loadTours() {
    const filters = {
      // Solo agregamos filtro de tags si es una colección de ofertas
      ...(this.isOffersCollection && {
        tags: ['ofertas', 'oferta', 'Ofertas', 'Oferta'],
      }),
      price: this.selectedPriceOption,
      tourSeason: this.selectedSeasonOption,
      month: this.selectedMonthOption,
      sort: this.selectedOrderOption,
    };

    this.toursService.getFilteredToursList(filters).subscribe({
      next: (tours: any) => {
        // Procesamos las opciones de meses disponibles para el filtro
        this.monthOptions =
          tours.filtersOptions?.month?.map((month: string) => {
            return {
              name: month.toUpperCase(),
              value: month,
            };
          }) || [];

        // Procesamos las opciones de tags disponibles
        this.tagOptions =
          tours.filtersOptions?.tags?.map((tag: string) => {
            return {
              name: tag.toUpperCase(),
              value: tag,
            };
          }) || [];

        // Mapeamos los tours recibidos al formato que necesitamos
        this.displayedTours = tours.data.map((tour: any) => {
          const days = tour.activePeriods?.[0]?.days || '';

          return {
            imageUrl: tour.image?.[0]?.url || '',
            title: tour.name || '',
            description:
              tour.country && days ? `${tour.country} en: ${days} dias` : '',
            rating: 5,
            tag: tour.marketingSection?.marketingSeasonTag || '',
            price: tour.price || 0,
            availableMonths:
              tour.monthTags?.map((month: string) =>
                month.substring(0, 3).toUpperCase()
              ) || [],
            isByDr: true,
            webSlug: tour.webSlug || '',
          };
        });
      },
      error: (error: any) => {
        console.error('Error loading tours:', error);
      },
    });
  }

  onFilterChange() {
    this.loadTours();
  }
}
