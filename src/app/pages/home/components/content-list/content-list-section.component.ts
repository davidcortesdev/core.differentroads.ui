import { Component, Inject, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlogListContent } from '../../../../core/models/blocks/blog-list-content.model';
import { BlogsService } from '../../../../core/services/blogs.service'; // Import BlogsService
import { catchError, map } from 'rxjs/operators';
import { BlockType } from '../../../../core/models/blocks/block.model';

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
  @Input() content!: BlogListContent;
  @Input() type!: BlockType;
  @Input() title!: string;

  contentList: ContentData[] = [];
  showMoreButton: boolean = false;

  constructor(
    private readonly router: Router,
    private readonly blogsService: BlogsService
  ) {}

  ngOnInit() {
    console.log('Content List', this.content);
    this.loadContent();
  }

  loadContent(): void {
    if (this.type === BlockType.BlogList) {
      this.loadBlogs();
    } else if (this.type === BlockType.PressList) {
      this.loadPress();
    }
  }

  private loadBlogs(): void {
    const blogIds: Array<string> = this.content['blog-list'].map(
      (blog: { id: string }): string => blog.id
    );

    if (blogIds.length === 0) {
      this.contentList = [];
      this.showMoreButton = false;
      return;
    }

    this.contentList = []; // Reset the list
    this.showMoreButton = blogIds.length > 4;

    blogIds.forEach((id: string): void => {
      this.blogsService
        .getBlogThumbnailById(id)
        .pipe(
          catchError((error: Error) => {
            console.error(`Error loading blog with ID ${id}:`, error);
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
    this.contentList = [
      {
        id: '1',
        subtitle: 'La Vanguardia Magazine',
        title: 'Circuito por el Loira para pasar fin de año.',
        slug: 'jordania',
        image: [
          { url: 'https://picsum.photos/800/600?random=3', alt: 'Jordania' },
        ],
        type: 'press',
      },
      {
        id: '2',
        subtitle: 'El País',
        title: 'Los mejores destinos para viajar en 2025 con tu familia',
        slug: 'el-pais',
        image: [
          { url: 'https://picsum.photos/800/600?random=4', alt: 'El País' },
        ],
        type: 'press',
      },
      {
        id: '3',
        subtitle: 'La Vanguardia Magazine',
        title: 'Circuito por el Loira para pasar fin de año.',
        slug: 'jordania',
        image: [
          { url: 'https://picsum.photos/800/600?random=5', alt: 'Jordania' },
        ],
        type: 'press',
      },
      {
        id: '4',
        subtitle: 'La Vanguardia Magazine',
        title: 'Circuito por el Loira para pasar fin de año.',
        slug: 'jordania',
        image: [
          { url: 'https://picsum.photos/800/600?random=6', alt: 'Jordania' },
        ],
        type: 'press',
      },
      {
        id: '5',
        subtitle: 'La Vanguardia Magazine',
        title: 'Circuito por el Loira para pasar fin de año.',
        slug: 'jordania',
        image: [
          { url: 'https://picsum.photos/800/600?random=7', alt: 'Jordania' },
        ],
        type: 'press',
      },
    ];

    this.showMoreButton = this.contentList.length > 4;
  }

  navigateToContent(slug: string, type: 'blog' | 'press'): void {
    this.router.navigate([`/${type}`, slug]);
  }

  navigateToTravels(link: string): void {
    window.location.href = link;
  }

  navigateToAllContents(type: BlockType): void {
    this.router.navigate(['#']);
  }
}
