import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CollectionsService } from '../../core/services/collections.service';
import { LandingsService } from '../../core/services/landings.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface ITour {
  imageUrl: string;
  title: string;
  description: string;
  rating: number;
  tag: string;
  price: number;
  availableMonths: string[];
  isByDr: boolean;
  webSlug: string;
}

@Component({
  selector: 'app-content-page',
  standalone: false,
  templateUrl: './content-page.component.html',
  styleUrls: ['./content-page.component.scss'],
})
export class ContentPageComponent implements OnInit {
  isLanding: boolean = false;
  slug: string = '';
  blocks: any[] = [];

  bannerImage: string = '';
  bannerTitle: string = '';
  bannerSubtitle?: string;
  bannerDescription: string = '';

  // Properties for tours management
  showTours: boolean = false;
  isTagBasedCollection: boolean = false;
  collectionTags: string[] = [];

  // Tours data
  displayedTours: ITour[] = [];

  constructor(
    private route: ActivatedRoute,
    private landingsService: LandingsService,
    private collectionsService: CollectionsService,
    private sanitizer: DomSanitizer
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
          this.bannerImage =
            data.banner[0]?.url || 'https://picsum.photos/200/300';
          this.bannerTitle = data.title || 'Your Title Here';
          this.bannerSubtitle = data.titleContent || 'Optional Subtitle';
          this.bannerDescription =
            data.content || 'Lorem Ipsum is simply dummy text...';
        },
        error: (error: any) => {},
      });
    } else {
      this.collectionsService.getCollectionBySlug(this.slug).subscribe({
        next: (data: any) => {
          this.blocks = data.blocks || ['collection'];
          this.bannerImage =
            data.banner[0]?.url || 'https://picsum.photos/200/300';
          this.bannerTitle = data.title || 'Your Title Here';
          this.bannerSubtitle = data.bannerTitle || 'Optional Subtitle';
          this.bannerDescription =
            data.content || 'Lorem Ipsum is simply dummy text...';

          this.extractCollectionTags(data);

          if (this.collectionTags.length > 0) {
            this.showTours = true;
            this.isTagBasedCollection = true;
          }
        },
        error: (error: any) => {},
      });
    }
  }

  private extractCollectionTags(data: any): void {
    if (data.tags && Array.isArray(data.tags)) {
      this.collectionTags = data.tags;
    } else if (data.tag && typeof data.tag === 'string') {
      this.collectionTags = [data.tag];
    } else if (data.tags && typeof data.tags === 'string') {
      this.collectionTags = data.tags
        .split(',')
        .map((tag: string) => tag.trim());
    }
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onToursLoaded(tours: ITour[]): void {
    this.displayedTours = tours;
  }
}
