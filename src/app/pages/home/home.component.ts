import { Component } from '@angular/core';
import { HomeService } from '../../core/services/home.service';
import { Block, BlockType } from '../../core/models/blocks/block.model';
import { FeaturedToursSection } from '../../core/models/home/featured-tours/featured-tour.model';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  blocks$: Observable<Block[]>;
  featuredTours?: FeaturedToursSection;

  constructor(
    private homeService: HomeService,
    private authService: AuthenticateService
  ) {
    this.blocks$ = this.homeService.getDynamicSections();
  }

  ngOnInit() {
    this.homeService.getHomeData().subscribe({
      next: (data) => {
        // console.log('Home data:', data);
        this.featuredTours = data['featured-tours'];
      },
      error: (error) => {
        console.error('Error fetching home data:', error);
      },
    });
  }
}
