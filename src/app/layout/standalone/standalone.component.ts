import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-standalone',
  standalone: false,
  template: '<router-outlet></router-outlet>',
  styleUrl: './standalone.component.scss'
})
export class StandaloneComponent {
  constructor(private titleService: Title) {}

  ngOnInit(): void {
    this.titleService.setTitle('Checkout - Different Roads');
  } 
}
