import { Component } from '@angular/core';
import { HomeService } from '../../core/services/home.service';
import { Block, BlockType } from '../../core/models/blocks/block.model';
import { FeaturedToursSection } from '../../core/models/home/featured-tours/featured-tour.model';
import { AuthenticateService } from '../../core/services/auth-service.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  blocks: Block[] = [];
  featuredTours?: FeaturedToursSection;

  constructor(
    private homeService: HomeService,
    private authService: AuthenticateService
  ) {}

  ngOnInit() {
    this.homeService.getHomeData().subscribe({
      next: (data) => {
        console.log('Home data:', data);
        this.blocks = data.blocks;
        this.featuredTours = data['featured-tours'];
      },
      error: (error) => {
        console.error('Error fetching home data:', error);
      },
    });
  }

  testLogin() {
    this.authService.login('beraf83373@intady.com', 'Ernesto-0011');
  }

  testSignUp() {
    this.authService.signUp('beraf83373@intady.com', 'Ernesto-0011');
  }

  testConfirmSignUp() {
    this.authService.confirmSignUp('beraf83373@intady.com', '839854');
  }

  testGetCurrentUser() {
    this.authService.getCurrentUser();
  }

  testGetUserAttributes() {
    this.authService.getUserAttributes();
  }
}
