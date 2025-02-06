import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface PressData {
 id: string;
 title: string;
 subtitle: string;
 slug: string;
 image: { url: string; alt: string }[];
}

@Component({
 selector: 'app-press-section',
 standalone: false,
 templateUrl: './press-section.component.html',
 styleUrls: ['./press-section.component.scss']
})
export class PressSectionComponent implements OnInit {
 title = 'Lo que dicen sobre nosotros';
 pressList: PressData[] = [
   {
     id: '1',
     subtitle: 'La Vanguardia Magazine',
     title: 'Circuito por el Loira para pasar fin de año.',
     slug: 'jordania',
     image: [{ url: 'https://picsum.photos/800/600?random=1', alt: 'Jordania' }],
   },
   {
     id: '2',
     subtitle: 'Cornejos',
     title: 'Los 10 imprescindibles de tu maleta para viajar donde sea',
     slug: 'cornejos', 
     image: [{ url: 'https://picsum.photos/800/600?random=2', alt: 'Cornejos' }],
   },
   {
     id: '3',
     subtitle: 'Vietnam',
     title: 'Street food en Hanoi, la joya de la ciudad vietnamita',
     slug: 'vietnam',
     image: [{ url: 'https://picsum.photos/800/600?random=3', alt: 'Vietnam' }],
   },
   {
     id: '4',
     subtitle: 'Burgo',
     title: 'Tours en ruta: descubre el circuito de Centroeuropa',
     slug: 'burgo',
     image: [{ url: 'https://picsum.photos/800/600?random=4', alt: 'Burgo' }],
   }
 ];

 constructor(private router: Router) {}

 ngOnInit(): void {}

 navigateToPress(slug: string) {
   this.router.navigate(['/press', slug]);
 }

 navigateToTravels(link: string) {
   window.location.href = link;
 }

 navigateToAllPress() {
   this.router.navigate(['/press']);
 }
}