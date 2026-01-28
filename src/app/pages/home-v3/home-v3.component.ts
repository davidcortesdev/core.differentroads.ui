import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeV3HeaderComponent } from './components/header/header.component';
import { TopTrustBarComponent } from './components/top-trust-bar/top-trust-bar.component';

@Component({
  selector: 'app-home-v3',
  standalone: true,
  imports: [CommonModule, HomeV3HeaderComponent, TopTrustBarComponent],
  templateUrl: './home-v3.component.html',
  styleUrls: ['./home-v3.component.scss'],
})
export class HomeV3Component {
  constructor() {}
}
