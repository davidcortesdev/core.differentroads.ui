import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CollectionsService } from '../../core/services/collections.service';
import { LandingsService } from '../../core/services/landings.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlogsService } from '../../core/services/blogs.service';
import { PressService } from '../../core/services/press.service';
import { Blog } from '../../core/models/blogs/blog.model';
import { Observable, Subject, takeUntil } from 'rxjs';
import { Press } from '../../core/models/press/press.model';
import { Collection } from '../../core/models/collections/collection.model';
import { Landing } from '../../core/models/landings/landing.model';
import { Title } from '@angular/platform-browser';

export interface ITour {
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

type ContentType = 'landing' | 'collection' | 'press' | 'blog' | 'none';

@Component({
  selector: 'app-content-page',
  standalone: false,
  templateUrl: './content-page.component.html',
  styleUrls: ['./content-page.component.scss'],
})
export class ContentPageComponent implements OnInit, OnDestroy {
  contentType: ContentType = 'none';
  contentTitle: string = '';
  contentDescription: string = '';

  get isLanding(): boolean {
    return this.contentType === 'landing';
  }
  get isCollection(): boolean {
    return this.contentType === 'collection';
  }
  get isPress(): boolean {
    return this.contentType === 'press';
  }
  get isBlog(): boolean {
    return this.contentType === 'blog';
  }

  slug: string = '';
  blocks: any[] = [];

  bannerImage: string = '';
  bannerImageAlt: string = '';
  bannerTitle: string = '';
  bannerSubtitle?: string;
  bannerDescription: string = '';

  // Properties for tours management
  showTours: boolean = false;
  isTagBasedCollection: boolean = false;
  collectionTags: string[] = [];

  // Tours data
  displayedTours: ITour[] = [];

  // Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private landingsService: LandingsService,
    private collectionsService: CollectionsService,
    private blogService: BlogsService,
    private pressService: PressService,
    private sanitizer: DomSanitizer,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.determineContentType();
    this.fetchBlocks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private determineContentType(): void {
    const routePath = this.route.snapshot.routeConfig?.path || '';

    if (routePath === 'landing/:slug') {
      this.contentType = 'landing';
    } else if (routePath === 'collection/:slug') {
      this.contentType = 'collection';
    } else if (routePath === 'press/:slug') {
      this.contentType = 'press';
    } else if (routePath === 'blog/:slug') {
      this.contentType = 'blog';
    }

    this.slug = this.route.snapshot.paramMap.get('slug') || '';
  }

  fetchBlocks(): void {
    switch (this.contentType) {
      case 'landing':
        this.fetchLandingData();
        break;
      case 'collection':
        this.fetchCollectionData();
        break;
      case 'press':
        this.fetchPressData();
        break;
      case 'blog':
        this.fetchBlogData();
        break;
    }
  }

  private updatePageTitle(title: string): void {
    if (title) {
      this.titleService.setTitle(`${title} - Different Roads`);
    }
  }

  private fetchLandingData(): void {
    this.landingsService
      .getLandingBySlug(this.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Landing) => {
          this.blocks = data.blocks || [];
          this.bannerImage = data.banner[0]?.url || '';
          this.bannerImageAlt = data.banner[0]?.alt || '';
          this.bannerTitle = data.title || '';
          this.bannerSubtitle = data.titleContent || '';
          this.bannerDescription = data.description || '';
          this.contentTitle = data.titleContent || '';
          this.contentDescription = data.description || '';
          this.updatePageTitle(data.title);
        },
        error: (error: any) => {
          console.error('Error fetching landing data:', error);
        },
      });
  }

  private fetchCollectionData(): void {
    this.collectionsService
      .getCollectionBySlug(this.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Collection) => {
          this.blocks = data.blocks || ['collection'];
          this.bannerImage = data.banner[0]?.url || '';
          this.bannerImageAlt = data.banner[0]?.alt || '';
          this.bannerTitle = data.bannerTitle || '';
          this.bannerSubtitle = '';
          this.bannerDescription = data.content || '';
          this.contentTitle = data.titleContent || '';
          this.contentDescription = data.description || '';
          this.updatePageTitle(data.title);

          this.extractCollectionTags(data);

          if (this.collectionTags.length > 0) {
            this.showTours = true;
            this.isTagBasedCollection = true;
          }
        },
        error: (error: any) => {
          console.error('Error fetching collection data:', error);
        },
      });
  }

  private fetchPressData(): void {
    this.pressService
      .getPressBySlug(this.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Press) => {
          this.bannerTitle = data.title || '';
          this.bannerSubtitle = data.subtitle || '';
          this.bannerDescription = data.content || '';
          this.blocks = data.blocks || [];
          this.contentTitle = data.title || '';
          this.contentDescription = data.content || '';
          this.updatePageTitle(data.title);
        },
        error: (error: any) => {
          console.error('Error fetching press data:', error);
        },
      });
  }

  private fetchBlogData(): void {
    this.blogService
      .getBlogBySlug(this.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Blog) => {
          this.bannerTitle = data.title || '';
          this.bannerSubtitle = data.subtitle || '';
          this.bannerDescription = data.content || '';
          this.blocks = data.blocks || [];
          this.contentTitle = data.title || '';
          this.contentDescription = data.content || '';
          this.updatePageTitle(data.title);
        },
        error: (error: any) => {
          console.error('Error fetching blog data:', error);
        },
      });
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
