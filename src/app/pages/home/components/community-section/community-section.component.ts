import { Component, OnInit } from '@angular/core';
import { HomeService } from '../../../../core/services/home.service';
import { TravelersSection } from '../../../../core/models/home/travelers/travelers-section.model';

@Component({
  selector: 'app-community-section',
  standalone: false,
  templateUrl: './community-section.component.html',
  styleUrls: ['./community-section.component.scss'],
})
export class CommunitySectionComponent implements OnInit {
  travelersSection: TravelersSection | null = null;

  constructor(private homeService: HomeService) {}

  ngOnInit() {
    this.homeService.getTravelersSection().subscribe({
      next: (data) => {
        this.travelersSection = data;
      },
      error: (error) => {
        console.error('Error fetching travelers section data:', error);
      },
    });
  }

  get reviews() {
    return this.travelersSection?.reviews;
  }

  get communityImages() {
    return this.travelersSection?.['travelers-cards'] || [];
  }

  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1,
    },
  ];
}
