import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-tour-overview',
  standalone: false,
  templateUrl: './tour-overview.component.html',
  styleUrls: ['./tour-overview.component.scss'],
})
export class TourOverviewComponent {
  constructor(private sanitizer: DomSanitizer) {}

  tour = {
    name: 'Ruta esencial por sus fiordos icónicos',
    description:
      'Navega entre fiordos, duerme junto a sus orillas y disfruta de guías expertos',
    continent: 'Europa',
    country: 'Noruega',
    destinations: [
      'Preikestolen',
      'Bergen',
      'Oslo',
      'Nærøyfjord',
      'Nigardsbreen',
      'Geiranger',
      'Flåm',
    ],
    features: [
      '<i class="pi pi-check"></i>Explora los <strong>fiordos noruegos</strong> y el emblemático Púlpito en crucero o haciendo senderismo.',
      '<i class="pi pi-check"></i>Alójate a orillas de los fiordos en <strong>hoteles de categoría superior</strong>, con desayunos y cenas incluidas.',
      '<i class="pi pi-check"></i>Descubre la historia y cultura de Noruega con <em>visitas guiadas</em> por expertos locales en español.',
      '<i class="pi pi-check"></i>Viaja con total comodidad, ya que incluimos vuelos, traslados y seguro básico de viaje.',
    ],
    addons: [
      '<i class="pi pi-check"></i>Vuelo panorámico en helicóptero sobre los fiordos, un paseo en el <strong>tren de Flåm</strong> o un ascenso al glaciar Nigardsbreen.',
      '<i class="pi pi-check"></i>Hoteles de categoría 5* y mayor cantidad de dietas incluidas.',
    ],
    mainImage: {
      src: 'https://picsum.photos/1000',
      alt: 'Fiordos noruegos',
    },
    expert: {
      name: 'Francesca Serlenga',
      role: 'Travel Expert en Different Roads',
      avatar: 'assets/images/experts/francesca.jpg',
      opinion:
        'Este tour lo diseñé para que vivas lo mejor de Noruega: navegar por sus fiordos, dormir a sus orillas, subir al Púlpito y explorar un glaciar. Es uno de mis favoritos por esas experiencias que simplemente no se pueden olvidar.',
    },
  };

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  get destinationItems(): MenuItem[] {
    return this.tour.destinations.map((destination) => ({
      label: destination,
    }));
  }

  get breadcrumbItems(): MenuItem[] {
    return [
      { label: this.tour.continent },
      { label: this.tour.country },
      { label: this.tour.name },
    ];
  }
}
