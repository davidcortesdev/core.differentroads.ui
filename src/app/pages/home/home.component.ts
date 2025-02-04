import { Component } from "@angular/core";
import { HomeService } from "../../core/services/home.service";


@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  
  constructor(private homeService: HomeService) {}
  
  ngOnInit() {
    this.homeService.getHomeData().subscribe({
      next: (data) => {
        console.log('Home data:', data);
        // Handle the data
      },
      error: (error) => {
        console.error('Error fetching home data:', error);
        // Handle the error
      }
    });
  }
}
