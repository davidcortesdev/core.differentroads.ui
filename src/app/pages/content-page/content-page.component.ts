import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CollectionsService } from '../../core/services/collections.service';
import { LandingsService } from '../../core/services/landings.service';

@Component({
  selector: 'app-content-page',
  standalone: false,
  templateUrl: './content-page.component.html',
  styleUrls: ['./content-page.component.scss']
})
export class ContentPageComponent implements OnInit {
  isLanding: boolean = false;
  slug: string = '';
  blocks: any[] = [];

  bannerImage: string = '';
  bannerTitle: string = '';
  bannerSubtitle?: string;
  bannerDescription: string = '';

  constructor(
    private route: ActivatedRoute,
    private landingsService: LandingsService,
    private collectionsService: CollectionsService
  ) {}

  ngOnInit() {
    const routePath = this.route.snapshot.routeConfig?.path;
    this.isLanding = routePath === 'landing/:slug';
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    this.fetchBlocks();
  }

  fetchBlocks() {
    if (this.isLanding) {
      this.landingsService.getLandingBySlug(this.slug).subscribe({
        next: (data: any) => {
          this.blocks = data.blocks || [];
          this.bannerImage = data.banner[0]?.url || 'https://picsum.photos/200/300';
          this.bannerTitle = data.title || 'Your Title Here';
          this.bannerSubtitle = data.titleContent || 'Optional Subtitle';
          this.bannerDescription = data.content || 'Lorem Ipsum is simply dummy text...';
        },
        error: (error: any) => {
          console.error('Error fetching landing blocks:', error);
        },
      });
    } else {
      this.collectionsService.getCollectionBySlug(this.slug).subscribe({
        next: (data: any) => {
          console.log('fetchedcollection', data);
          this.blocks = data.blocks || ['collection'];
          this.bannerImage = data.banner[0]?.url || 'https://picsum.photos/200/300';
          this.bannerTitle = data.title|| 'Your Title Here';
          this.bannerSubtitle = data.bannerTitle || 'Optional Subtitle';
          this.bannerDescription =data.content || 'Lorem Ipsum is simply dummy text...';
        },
        error: (error: any) => {
          console.error('Error fetching collection blocks:', error);
        },
      });
    }
  }
}
