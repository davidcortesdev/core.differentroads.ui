import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Page } from '../../core/models/pages/page.model';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-basic-page',
  standalone: false,
  templateUrl: './basic-page.component.html',
  styleUrls: ['./basic-page.component.scss'],
})
export class BasicPageComponent implements OnInit {
  slug: string | null = null;
  pageData: Page | null = null; // Usa el tipado Page
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private titleService: Title,
    private meta: Meta
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug');
    if (this.slug) {
      this.fetchPageData(this.slug);
    } else {
      console.error('Slug is missing');
      this.isLoading = false;
    }
  }

  fetchPageData(slug: string): void {
    //TODO: Pendiente de desarrollar proximamente

  }

  private updatePageTitle(title: string): void {
    if (title) {
      this.titleService.setTitle(`${title} - Different Roads`);
    }
  }

  private updatePageMetadata(title: string, description?: string): void {
    if (title) {
      this.titleService.setTitle(`${title} - Different Roads`);
    }
    
    if (description) {
      // Meta descripción optimizada para SEO (70-155 caracteres)
      let fullDescription = description;
      if (description.length < 70) {
        fullDescription = description + '. Información detallada sobre nuestros servicios de viaje.';
      } else if (description.length > 155) {
        fullDescription = description.substring(0, 152) + '...';
      }
      this.meta.updateTag({ name: 'description', content: fullDescription });
    } else if (title) {
      // Meta descripción por defecto basada en el título (70-155 caracteres)
      const defaultDescription = `${title} - Información importante sobre nuestros servicios de viaje. Conoce más sobre Different Roads.`;
      this.meta.updateTag({ name: 'description', content: defaultDescription });
    }
  }

  get pageContent(): Page | null {
    return this.pageData;
  }
}
