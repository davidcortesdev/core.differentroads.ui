import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  selectedDestination: string | null = null;
  departureDate: Date | null = null;
  returnDate: Date | null = null;
  selectedTripType: string | null = null;

  filteredDestinations: string[] = [];
  filteredTripTypes: string[] = [];

  destinations: string[] = ['Europa', 'Asia', 'África', 'América'];
  tripTypes: string[] = ['Cultural', 'Aventura', 'Relax'];

  tours = [
    {
      imageUrl: 'assets/images/tours/iceland.jpg',
      title: 'Recorriendo la tierra del hielo y el fuego',
      description: 'Islandia: en 8 días',
      rating: 4.5,
      tag: 'Ahora más barato',
      price: 2545
    },
    {
      imageUrl: 'assets/images/tours/tuscany.jpg',
      title: 'Travesía por los paisajes más bellos de la toscana',
      description: 'Italia: en 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295
    },
    {
      imageUrl: 'assets/images/tours/switzerland.jpg',
      title: 'De los viñedos de Alsacia a los alpes suizos',
      description: 'Suiza y Selva Negra en: 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295
    }
  ];

  filterDestinations(event: { query: string }) {
    this.filteredDestinations = this.destinations.filter(destination => 
      destination.toLowerCase().includes(event.query.toLowerCase())
    );
  }

  filterTripTypes(event: { query: string }) {
    this.filteredTripTypes = this.tripTypes.filter(type => 
      type.toLowerCase().includes(event.query.toLowerCase())
    );
  }

  ngOnInit() {
  }
}
