import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Meta, Title } from '@angular/platform-browser';
import {
  CMSPageVersionService,
  ICMSPageVersionResponse,
} from '../../../core/services/cms/cms-page-version.service';

@Component({
  selector: 'app-basic-page-preview',
  standalone: false,

  templateUrl: './basic-page-preview.component.html',
  styleUrls: ['./basic-page-preview.component.scss'],
})
export class BasicPagePreviewComponent implements OnInit {
  pageId: number | null = null;
  versionId: number | null = null;
  pageData: ICMSPageVersionResponse | null = null;
  isLoading: boolean = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private pageVersionService: CMSPageVersionService,
    private titleService: Title,
    private meta: Meta // Importar Meta desde @angular/platform-browser
  ) {
    // Añadir meta tag para evitar indexación
    this.meta.addTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  ngOnInit(): void {
    // Obtener pageId y versionId de los query params
    this.route.queryParams.subscribe((params) => {
      this.pageId = params['pageId'] ? Number(params['pageId']) : null;
      this.versionId = params['versionId'] ? Number(params['versionId']) : null;

      if (this.pageId && this.versionId) {
        this.fetchPageVersionData(this.pageId, this.versionId);
      } else {
        this.error = 'Se requieren los parámetros pageId y versionId';
        this.isLoading = false;
      }
    });
  }

  fetchPageVersionData(pageId: number, versionId: number): void {
    this.pageVersionService
      .getAllPageVersions({ pageId: pageId, versionNumber: versionId })
      .pipe(
        catchError((error) => {
          console.error('Error fetching page version data:', error);
          this.error = 'No se pudo encontrar la versión de página solicitada';
          return of(null);
        })
      )
      .subscribe((data) => {
        if (!data || data.length === 0) {
          this.error = 'No se pudo encontrar la versión de página solicitada';
          this.isLoading = false;
          return;
        }

        // Get first element from the array
        this.pageData = data[0];
        this.isLoading = false;
        
        // Update page title and SEO description
        if (this.pageData) {
          this.updatePageMetadata(this.pageData);
        }
      });
  }

  private updatePageMetadata(pageData: ICMSPageVersionResponse): void {
    // Actualizar el título de la página
    if (pageData.title) {
      this.titleService.setTitle(`${pageData.title} (Preview) - Different Roads`);
    }
    
    // Actualizar la descripción SEO
    if (pageData.seoDescription) {
      // Eliminar cualquier meta descripción existente
      this.meta.removeTag("name='description'");
      
      // Añadir la nueva meta descripción limitada a 160 caracteres
      const fullDescription = pageData.seoDescription + ' (Vista previa)';
      const shortDescription = fullDescription.length > 160 ? fullDescription.substring(0, 157) + '...' : fullDescription;
      this.meta.addTag({
        name: 'description',
        content: shortDescription
      });
    }
  }
}
