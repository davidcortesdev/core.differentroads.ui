import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-content-page',
  standalone: false,
  templateUrl: './content-page.component.html',
  styleUrls: ['./content-page.component.scss']
})
export class ContentPageComponent implements OnInit {
  isLanding: boolean = false;
  slug: string = '';

  // Propiedades del banner
  bannerImage: string = '';
  bannerTitle: string = '';
  bannerSubtitle?: string;
  bannerDescription: string = ''; // <-- Agregado aquí

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.isLanding = this.route.snapshot.url[0]?.path === 'landing';
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    console.log('ContentPageComponent-this.slug', this.slug);

    // Datos de prueba para el banner
    this.bannerImage = 'https://picsum.photos/200/300';
    this.bannerTitle = 'Your Title Here';
    this.bannerSubtitle = 'Optional Subtitle';
    this.bannerDescription = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum'; // <-- Agregando contenido
  }
}

