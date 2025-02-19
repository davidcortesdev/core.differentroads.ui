import { Component, Inject, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlogListContent } from '../../../../core/models/blocks/blog-list-content.model';
import { BlogsService } from '../../../../core/services/blogs.service';
import { PressService } from '../../../../core/services/press.service';
import { catchError, map } from 'rxjs/operators';
import { BlockType } from '../../../../core/models/blocks/block.model';
import { PressListContent } from '../../../../core/models/blocks/press-list-content.model';

interface ContentData {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  image: { url: string; alt: string }[];
  travels?: {
    btntext: string;
    linkTravels: string;
  };
  type: 'blog' | 'press';
}

@Component({
  selector: 'app-content-list',
  standalone: false,
  templateUrl: './content-list-section.component.html',
  styleUrls: ['./content-list-section.component.scss'],
})
export class ContentListComponent implements OnInit {
  @Input() content!: BlogListContent | PressListContent;
  @Input() type!: BlockType;
  @Input() title!: string;

  contentList: ContentData[] = [];
  showMoreButton: boolean = false;
  contentTitle: string = '';
  contentButtonText: string = '';

  constructor(
    private readonly router: Router,
    private readonly blogsService: BlogsService,
    private readonly pressService: PressService
  ) {}

  ngOnInit() {
    this.extractContentMetadata();
    this.loadContent();
  }

  private extractContentMetadata(): void {
    if (this.content) {
      this.contentTitle = (this.content as any).title || this.title;
      this.contentButtonText = (this.content as any).textButton || 'Ver más';
    }
  }

  loadContent(): void {
    if (this.type === BlockType.BlogList) {
      this.loadBlogs();
    } else if (this.type === BlockType.PressList) {
      this.loadPress();
    }
  }

  private loadBlogs(): void {
    const blogIds: Array<string> = (this.content as BlogListContent)?.[
      'blog-list'
    ].map((blog: { id: string }): string => blog.id);

    if (blogIds.length === 0) {
      this.contentList = [];
      this.showMoreButton = false;
      return;
    }

    this.contentList = [];
    this.showMoreButton = blogIds.length > 4;

    blogIds.forEach((id: string): void => {
      this.blogsService
        .getBlogThumbnailById(id)
        .pipe(
          catchError((error: Error) => {
            return [];
          })
        )
        .subscribe((blog: any): void => {
          if (blog) {
            const blogContent: ContentData = {
              id: blog.id,
              title: blog.title,
              subtitle: blog.subtitle,
              slug: blog.slug,
              image: blog.image,
              type: 'blog',
            };
            this.contentList = [...this.contentList, blogContent];
          }
        });
    });
  }

  private loadPress(): void {
    const pressIds: Array<string> = (this.content as PressListContent)?.[
      'press-list'
    ].map((press: { id: string }): string => press.id);

    if (pressIds.length === 0) {
      this.contentList = [];
      this.showMoreButton = false;
      return;
    }

    this.contentList = [];
    this.showMoreButton = pressIds.length > 4;

    pressIds.forEach((id: string): void => {
      this.pressService
        .getPressThumbnailById(id)
        .pipe(
          catchError((error: Error) => {
            return [];
          })
        )
        .subscribe((press: any): void => {
          if (press) {
            const pressContent: ContentData = {
              id: press.id,
              title: press.title,
              subtitle: press.subtitle,
              slug: press.slug,
              image: press.image,
              type: 'press',
            };
            this.contentList = [...this.contentList, pressContent];
          }
        });
    });
  }

  navigateToContent(slug: string, type: 'blog' | 'press'): void {
    this.router.navigate([`/${type}`, slug]);
  }

  navigateToTravels(link: string): void {
    window.location.href = link;
  }

  navigateToAllContents(type: BlockType): void {
    const link = (this.content as any)?.link || '#';
    this.router.navigate([link]);
  }

  get contentTitleDisplay(): string {
    return this.contentTitle || this.title;
  }

  get buttonTextDisplay(): string {
    return this.contentButtonText;
  }
}
