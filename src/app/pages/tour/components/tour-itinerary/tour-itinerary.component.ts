import { Component, OnInit } from '@angular/core';
import { ToursService } from '../../../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface EventItem {
  status?: string;
  date?: string;
  icon?: string;
  color?: string;
  image?: string;
  description?: SafeHtml;
}

@Component({
  selector: 'app-tour-itinerary',
  standalone: false,
  templateUrl: './tour-itinerary.component.html',
  styleUrl: './tour-itinerary.component.scss',
})
export class TourItineraryComponent implements OnInit {
  events: EventItem[];
  title: string = 'Itinerario';
  highlights: any[] = [];

  itinerary: {
    title: string;
    description: SafeHtml;
    image: string;
    hotel: any;
    collapsed: boolean;
  }[] = [];

  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 2,
      numScroll: 2,
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 2,
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  constructor(
    private toursService: ToursService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {
    this.events = [
      {
        status: 'Ordered',
        date: '15/10/2020 10:30',
        icon: 'pi pi-shopping-cart',
        color: '#9C27B0',
        image: 'game-controller.jpg',
      },
      {
        status: 'Processing',
        date: '15/10/2020 14:00',
        icon: 'pi pi-cog',
        color: '#673AB7',
      },
      {
        status: 'Shipped',
        date: '15/10/2020 16:15',
        icon: 'pi pi-shopping-cart',
        color: '#FF9800',
      },
      {
        status: 'Delivered',
        date: '16/10/2020 10:00',
        icon: 'pi pi-check',
        color: '#607D8B',
      },
    ];

    this.highlights = [
      /*  {
        title: 'Highlight 1',
        description: 'Description for highlight 1',
        image: 'https://picsum.photos/200',
        optional: false,
      },
      {
        title: 'Highlight 2',
        description: 'Description for highlight 2',
        image: 'https://picsum.photos/200',

        optional: true,
      }, */
    ];
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.toursService
          .getTourDetailBySlug(slug, ['itinerary-section'])
          .subscribe({
            next: (tourData) => {
              this.title = tourData['itinerary-section'].title;
              this.itinerary = tourData['itinerary-section']['day-card'].map(
                (section, index) => {
                  return {
                    title: section.name,
                    description: this.sanitizer.bypassSecurityTrustHtml(
                      section.description
                    ),
                    image: section.itimage?.[0]?.url || '',
                    hotel: section.hotel,
                    collapsed: index !== 0, // Solo el primer panel estará expandido
                  };
                }
              );
            },
            error: (error) =>
              console.error('Error fetching itinerary section:', error),
          });
      }
    });
  }
}
