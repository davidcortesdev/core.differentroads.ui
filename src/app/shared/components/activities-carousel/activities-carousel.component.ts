import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  ActivityHighlight,
} from '../activity-card/activity-card.component';
import { CAROUSEL_CONFIG } from '../../../shared/constants/carousel.constants';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-activities-carousel',
  standalone: false,
  templateUrl: './activities-carousel.component.html',
  styleUrls: ['./activities-carousel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivitiesCarouselComponent {
  @Input() highlights: ActivityHighlight[] = [];
  @Output() addActivity = new EventEmitter<ActivityHighlight>();

  protected carouselConfig = CAROUSEL_CONFIG;

  // Variables para el modal
  showFullActivityModal = false;
  selectedActivity: ActivityHighlight | null = null;
  sanitizedActivityDescription: SafeHtml = '';

  // Estilos para el diálogo
  dialogStyle = {
    width: '90%',
    maxWidth: '800px'
  };

  // Configuración responsiva corregida
  responsiveOptions = [
    {
      breakpoint: '1920px',
      numVisible: 3, // Cambiado de 6 a 3
      numScroll: 1,
    },
    {
      breakpoint: '1800px',
      numVisible: 3, // Cambiado de 5 a 3
      numScroll: 1,
    },
    {
      breakpoint: '1680px',
      numVisible: 3, // Cambiado de 4 a 3
      numScroll: 1,
    },
    {
      breakpoint: '1559px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '800px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  constructor(private sanitizer: DomSanitizer) {}

  // Método para calcular numVisible dinámicamente
  get numVisible(): number {
    return Math.min(3, this.highlights.length);
  }

  onAddActivity(highlight: ActivityHighlight): void {
    this.addActivity.emit(highlight);
  }

  trackByFn(index: number, item: ActivityHighlight): string | number {
    return index;
  }

  ngOnInit(): void {
  }

  // Método para abrir el modal con la actividad seleccionada
  openFullActivity(activity: ActivityHighlight): void {
    this.selectedActivity = activity;
    this.showFullActivityModal = true;
        
    // Sanitizar la descripción de la actividad seleccionada
    if (activity.description) {
      this.sanitizedActivityDescription = this.sanitizer.bypassSecurityTrustHtml(activity.description);
    } else {
      this.sanitizedActivityDescription = '';
    }
  }
}