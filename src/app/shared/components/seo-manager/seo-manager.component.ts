import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-seo-manager',
  template: '',
  standalone: false
})
export class SeoManagerComponent implements OnInit {

  constructor(
    private meta: Meta,
    private title: Title
  ) { }

  ngOnInit(): void {
    this.setupSeoTags();
  }

  private setupSeoTags(): void {
    if (!environment.production) {
      // En desarrollo: bloquear indexación
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet' });
      this.meta.updateTag({ name: 'googlebot', content: 'noindex, nofollow' });
      this.meta.updateTag({ name: 'bingbot', content: 'noindex, nofollow' });
      
      // Agregar indicador visual en el título
      this.title.setTitle('🔧 DEV - Different Roads - Viajes y Experiencias Únicas');
    } else {
      // En producción: permitir indexación
      this.meta.updateTag({ name: 'robots', content: 'index, follow' });
      this.meta.updateTag({ name: 'googlebot', content: 'index, follow' });
      this.meta.updateTag({ name: 'bingbot', content: 'index, follow' });
      
      this.title.setTitle('Different Roads - Viajes y Experiencias Únicas');
    }
  }
}
