import { Component, OnInit } from '@angular/core';

interface Tour {
  imageUrl: string;
  title: string;
  description: string;
  rating: number;
  tag: string;
  price: number;
  availableMonths: string[];
}

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

  tours: Tour[] = [
    {
      imageUrl: 'assets/images/tours/iceland.jpg',
      title: 'Recorriendo la tierra del hielo y el fuego',
      description: 'Islandia: en 8 días',
      rating: 4.5,
      tag: 'Ahora más barato',
      price: 2545,
      availableMonths: ['JUN', 'JUL', 'AGO', 'SEP']
    },
    {
      imageUrl: 'assets/images/tours/tuscany.jpg',
      title: 'Travesía por los paisajes más bellos de la toscana',
      description: 'Italia: en 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295,
      availableMonths: ['ENE', 'JUL', 'AGO']
    },
    {
      imageUrl: 'assets/images/tours/switzerland.jpg',
      title: 'De los viñedos de Alsacia a los alpes suizos',
      description: 'Suiza y Selva Negra en: 8 días',
      rating: 4.5,
      tag: 'Etiqueta destacada',
      price: 1295,
      availableMonths: ['JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DEC']
    },
    {
      imageUrl: 'assets/images/tours/switzerland.jpg',
      title: 'De los viñedos de Alaska',
      description: 'Alaska asdf ',
      rating: 4.5,
      tag: 'ET',
      price: 1234,
      availableMonths: ['ENE','FEB','MAR','ABR','MAY','JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DEC']
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
