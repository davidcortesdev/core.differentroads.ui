import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-content-page',
  standalone: false,
  
  templateUrl: './content-page.component.html',
  styleUrls: ['./content-page.component.scss']
})
export class ContentPageComponent implements OnInit {
  isLanding: boolean = false;
  slug: string = '';

    // Banner properties
    bannerImage: string = '';
    bannerTitle: string = '';
    bannerSubtitle?: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.isLanding = this.route.snapshot.url[0].path === 'landing';
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    console.log('ContentPageComponent-this.slug',this.slug);

        // Here you would typically fetch the banner data from your service
    // This is just placeholder data
    this.bannerImage = 'https://picsum.photos/200/300';
    this.bannerTitle = 'Your Title Here';
    this.bannerSubtitle = 'Optional Subtitle';
  }
}
