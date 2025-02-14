import { Component } from '@angular/core';
import { ToursService } from '../../../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-tour-gallery',
  standalone: false,
  templateUrl: './tour-gallery.component.html',
  styleUrl: './tour-gallery.component.scss',
})
export class TourGalleryComponent {
  title: string = '';
  images: any[] = [];
  showAll = false;
  itemsPerRow = 4;

  constructor(
    private toursService: ToursService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.pipe(take(1)).subscribe((params) => {
      const slug = params['slug'];

      // Asegúrate de incluir 'travelers-section' en los campos seleccionados
      this.toursService
        .getTourDetailBySlug(slug, ['travelers-section'])
        .subscribe({
          next: (tourData) => {
            console.log('Datos completos recibidos:', tourData); // Depuración

            if (tourData && tourData['travelers-section']) {
              // Obtener el título
              this.title = tourData['travelers-section'].title;
              console.log('Título obtenido:', this.title); // Depuración

              // Verificar si travelersCards existe y es un array
              if (Array.isArray(tourData['travelers-section'].travelersCards)) {
                console.log(
                  'travelers-cards:',
                  tourData['travelers-section'].travelersCards
                ); // Depuración

                this.images = tourData['travelers-section'].travelersCards
                  .map((card: any) => {
                    // Verificar si timage es un array y tiene al menos un elemento con URL
                    if (
                      Array.isArray(card.timage) &&
                      card.timage.length > 0 &&
                      card.timage[0].url
                    ) {
                      console.log('URL de la imagen:', card.timage[0].url); // Depuración
                      return {
                        id: Math.random(),
                        url: card.timage[0].url,
                        width: 400,
                        height: 300,
                      };
                    } else {
                      console.warn('Tarjeta sin URL de imagen válida:', card); // Depuración
                      return null;
                    }
                  })
                  .filter((image: any) => image !== null); // Filtrar solo imágenes válidas

                console.log('Imágenes procesadas:', this.images); // Depuración
              } else {
                console.error(
                  'travelers-cards no es un array o no existe:',
                  tourData['travelers-section'].travelersCards
                ); // Depuración
              }
            } else {
              console.error(
                'La sección travelers-section no existe en los datos:',
                tourData
              ); // Depuración
            }
          },
          error: (error) => {
            console.error('Error al obtener datos:', error);
          },
        });
    });
  }

  get visibleImages() {
    return this.showAll
      ? this.images
      : this.images.slice(0, this.itemsPerRow * 2);
  }

  toggleShowMore() {
    this.showAll = !this.showAll;
  }
}
