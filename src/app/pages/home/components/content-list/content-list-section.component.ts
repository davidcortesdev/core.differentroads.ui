import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BlogListContent } from '../../../../core/models/blocks/blog-list-content.model';
import { BlogsService } from '../../../../core/services/blogs.service'; // Import BlogsService
import { forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
  type!: 'blog' | 'press';
  title!: string;
  content: BlogListContent;

  contentList: ContentData[] = [];
  showMoreButton: boolean = false;

  constructor(
    private router: Router,
    private blogsService: BlogsService, // Inject BlogsService
    @Inject('content') content: BlogListContent,
    @Inject('type') type: 'blog' | 'press',
    @Inject('title') title: string
  ) {
    this.type = type;
    this.title = title;
    this.content = content;
  }

  ngOnInit() {
    this.loadContent();
  }

  loadContent() {
    if (this.type === 'blog') {
      this.loadBlogs();
    } else if (this.type === 'press') {
      this.loadPress();
    }
  }

  private loadBlogs() {
    const blogIds = this.content['blog-list'].map(
      (blog: { id: string }) => blog.id
    );

    if (blogIds.length === 0) {
      this.contentList = [];
      this.showMoreButton = false;
      return;
    }

    const blogObservables = blogIds.map((id) =>
      this.blogsService.getBlogThumbnailById(id).pipe(
        catchError(() => {
          console.error(`Error cargando blog con ID ${id}`);
          return []; // Devolver un array vacío para que no interrumpa forkJoin
        })
      )
    );

    forkJoin(blogObservables).subscribe((blogs) => {
      this.contentList = blogs
        .flat()
        .filter((blog) => blog)
        .map((blog) => ({
          id: blog.id,
          title: blog.title,
          subtitle: blog.subtitle,
          slug: blog.slug,
          image: blog.image,
          type: 'blog',
        }));
    });
  }

  private loadPress() {
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

  // Navegar a un contenido específico
  navigateToContent(slug: string, type: 'blog' | 'press') {
    this.router.navigate([`/${type}`, slug]);
  }

  // Navegar a la página de viajes
  navigateToTravels(link: string) {
    window.location.href = link;
  }

  // Navegar a la lista completa de contenidos
  navigateToAllContents(type: 'blog' | 'press') {
    this.router.navigate(['#']); // Redirigir a otra página (por ahora '#')
  }
}
