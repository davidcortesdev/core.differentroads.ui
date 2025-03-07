import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CollectionsService } from '../../core/services/collections.service';
import { LandingsService } from '../../core/services/landings.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlogsService } from '../../core/services/blogs.service';
import { PressService } from '../../core/services/press.service';
import { Blog } from '../../core/models/blogs/blog.model';
import { Observable } from 'rxjs';
import { Press } from '../../core/models/press/press.model';
import { Collection } from '../../core/models/collections/collection.model';
import { Landing } from '../../core/models/landings/landing.model';

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
  isCollection: boolean = false;
  isPress: boolean = false;
  isBlog: boolean = false;

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

  constructor(
    private route: ActivatedRoute,
    private landingsService: LandingsService,
    private collectionsService: CollectionsService,
    private blogService: BlogsService,
    private pressService: PressService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const routePath = this.route.snapshot.routeConfig?.path;
    this.isLanding = routePath === 'landing/:slug';
    this.isCollection = routePath === 'collection/:slug';
    this.isPress = routePath === 'press/:slug';
    this.isBlog = routePath === 'blog/:slug';
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    this.fetchBlocks();
  }

  fetchBlocks() {
    if (this.isLanding) {
      this.landingsService.getLandingBySlug(this.slug).subscribe({
        next: (data: Landing) => {
          this.blocks = data.blocks || [];
          this.bannerImage = data.banner[0]?.url || '';
          this.bannerImageAlt = data.banner[0]?.alt || '';
          this.bannerTitle = data.title || '';
          this.bannerSubtitle = data.titleContent || '';
          this.bannerDescription = data.content || '';
        },
        error: (error: any) => {},
      });
    } else {
      if (this.isCollection) {
        this.collectionsService.getCollectionBySlug(this.slug).subscribe({
          next: (data: Collection) => {
            console.log('collection', data);
            this.blocks = data.blocks || ['collection'];
            this.bannerImage = data.banner[0]?.url || '';
            this.bannerImageAlt = data.banner[0]?.alt || '';
            this.bannerTitle = data.title || '';
            this.bannerSubtitle = data.bannerTitle || '';
            this.bannerDescription = data.content || '';

            this.extractCollectionTags(data);

            if (this.collectionTags.length > 0) {
              this.showTours = true;
              this.isTagBasedCollection = true;
            }
          },
          error: (error: any) => {},
        });
      } else {
        if (this.isPress) {
          this.pressService.getPressBySlug(this.slug).subscribe({
            next: (data: Press) => {
              console.log('press', data);
              this.bannerTitle = data.title || '';
              this.bannerSubtitle = data.subtitle || '';
              this.bannerDescription = data.content || '';
              this.blocks = data.blocks || [];
            },
          });
        } else {
          if (this.isBlog) {
            this.blogService.getBlogBySlug(this.slug).subscribe({
              next: (data: Blog) => {
                console.log('blog', data);
                this.bannerTitle = data.title || '';
                this.bannerSubtitle = data.subtitle || '';
                this.bannerDescription = data.content || '';
                this.blocks = data.blocks || [];
              },
              error: (error: any) => {},
            });
          }
        }
      }
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
