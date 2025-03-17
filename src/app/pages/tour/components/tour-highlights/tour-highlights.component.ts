import { Component, OnInit } from '@angular/core';
import { ToursService } from '../../../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';

@Component({
  selector: 'app-tour-highlights',
  standalone: false,
  templateUrl: './tour-highlights.component.html',
  styleUrls: ['./tour-highlights.component.scss'],
})
export class TourHighlightsComponent implements OnInit {
  highlights: any[] = [];
  highlightsTitle: string = 'Highlights';
  protected carouselConfig = CAROUSEL_CONFIG;

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
    this.route.params.pipe(take(1)).subscribe((params) => {
      const slug = params['slug'];

      this.toursService
        .getTourDetailBySlug(slug, ['card-list', 'highlights-title'])
        .subscribe({
          next: (tourData) => {
            if (tourData['card-list']) {
              this.highlights = tourData['card-list'].map((card) => {
                const mappedCard = {
                  title: card.title,
                  description: card.subtitle.replace(/<[^>]*>/g, ''), // Sanitizamos el HTML
                  image:
                    card.cimage?.[0]?.url ||
                    'https://picsum.photos/1000?random=8',
                  optional: !card.included,
                };
                return mappedCard;
              });
            }

            if (tourData['highlights-title']) {
              this.highlightsTitle = tourData['highlights-title'];
            }
          },
          error: (error) => {
            console.error('Error al obtener detalles del tour:', error);
          },
        });
    });
  }
}
