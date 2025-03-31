import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface BookingActivity {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  price: string;
  priceValue: number;
  isOptional: boolean;
  perPerson: boolean;
  isIncluded: boolean;
}

@Component({
  selector: 'app-booking-activities',
  templateUrl: './booking-activities.component.html',
  styleUrls: ['./booking-activities.component.scss'],
  standalone: false,
})
export class BookingActivitiesComponent implements OnInit {
  @Input() activities: BookingActivity[] = [];
  @Output() eliminateActivity = new EventEmitter<number>();
  @Output() addActivity = new EventEmitter<number>();

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
  }

  onEliminateActivity(activityId: number): void {
    this.eliminateActivity.emit(activityId);
  }

  onAddActivity(activityId: number): void {
    this.addActivity.emit(activityId);
  }

  // Método para sanitizar y limpiar la descripción si contiene etiquetas HTML
  getSafeDescription(description: string): SafeHtml {
    if (!description) return '';
    
    // Si hay etiquetas HTML visibles como texto, reemplazarlas
    if (description.includes('<p') || description.includes('&lt;p')) {
      // Remover etiquetas visibles como texto
      const cleaned = description
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      return this.sanitizer.bypassSecurityTrustHtml(cleaned);
    }
    
    // Si ya es HTML, sanitizarlo
    return this.sanitizer.bypassSecurityTrustHtml(description);
  }
}