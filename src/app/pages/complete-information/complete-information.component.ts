import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-complete-information',
  templateUrl: './complete-infomation.component.html',
  styleUrls: ['./complete-information.component.scss'],
  standalone: false
})
export class CompleteInformationComponent {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
  }
}
