import {
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { TourDataV2 } from './tour-card-v2.model';
import { AnalyticsService } from '../../../core/services/analytics/analytics.service';

@Component({
  selector: 'app-tour-card-v2',
  standalone: false,
  templateUrl: './tour-card-v2.component.html',
  styleUrls: ['./tour-card-v2.component.scss'],
})
export class TourCardV2Component implements OnInit {
  @Input() tourData!: TourDataV2;
  @Input() isLargeCard = false;
  @Input() itemListId?: string; // ID de la lista para analytics
  @Input() itemListName?: string; // Nombre de la lista para analytics
  @Input() index?: number; // Índice del item en la lista
  
  constructor(
    private router: Router,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    // Validación más robusta
    if (!this.tourData) {
      console.error(
        'TourData no proporcionado al componente TourCardComponent'
      );
      return;
    }

    // Validate that externalID exists and is not undefined or empty
    if (!this.tourData.externalID?.trim()) {
      console.warn('Missing or invalid externalID:', this.tourData);
    }
  }

  handleTourClick(): void {
    // Disparar evento select_item si tenemos información de la lista
    if (this.itemListId && this.itemListName) {
      this.analyticsService.getCurrentUserData().subscribe(userData => {
        // Usar el método helper para construir el item de forma consistente
        const item = this.analyticsService.convertTourToEcommerceItem(
          this.tourData,
          this.itemListId!,
          this.itemListName!,
          this.index || 0
        );
        
        this.analyticsService.selectItem(
          this.itemListId!,
          this.itemListName!,
          item,
          userData
        );
      });
    }
    
    // Navegar pasando los datos a través del state (sin modificar la URL visible)
    if (this.itemListId && this.itemListName) {
      this.router.navigate(['/tour', this.tourData.webSlug], {
        state: {
          listId: this.itemListId, // Pasar el ID real de la lista directamente
          listName: this.itemListName
        }
      });
    } else {
      this.router.navigate(['/tour', this.tourData.webSlug]);
    }
  }
}
