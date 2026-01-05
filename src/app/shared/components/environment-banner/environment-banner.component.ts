import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-environment-banner',
  templateUrl: './environment-banner.component.html',
  styleUrls: ['./environment-banner.component.scss'],
  standalone: false
})
export class EnvironmentBannerComponent implements OnInit {
  isProduction = environment.production;

  constructor() { }

  ngOnInit(): void {
  }
}
