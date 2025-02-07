import { Component } from '@angular/core';
import { HomeService } from '../../core/services/home.service';
import { Block } from '../../core/models/blocks/block.model';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  blocks: Block[] = [];

  constructor(private homeService: HomeService) {}

  ngOnInit() {
    this.homeService.getHomeData().subscribe({
      next: (data) => {
        console.log('Home data:', data);
        this.blocks = data.blocks;
      },
      error: (error) => {
        console.error('Error fetching home data:', error);
      },
    });
  }
}
