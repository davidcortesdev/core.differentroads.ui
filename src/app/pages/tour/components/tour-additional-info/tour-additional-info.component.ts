import { Component } from '@angular/core';

@Component({
  selector: 'app-tour-additional-info',
  standalone: false,
  templateUrl: './tour-additional-info.component.html',
  styleUrl: './tour-additional-info.component.scss'
})
export class TourAdditionalInfoComponent {
  handleSaveTrip(): void {
    // Implement save trip logic
  }

  handleDownloadTrip(): void {
    // Implement download trip logic
  }

  handleInviteFriend(): void {
    // Implement invite friend logic
  }
}
