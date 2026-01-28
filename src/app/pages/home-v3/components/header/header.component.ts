import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-home-v3-header',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HomeV3HeaderComponent {}

