import {
  Component,
  Inject,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { BlogListContent } from '../../../../core/models/blocks/blog-list-content.model';
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
  selector: 'app-content-list-section-v2',
  standalone: false,
  templateUrl: './content-list-v2.component.html',
  styleUrls: ['./content-list-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentListV2Component implements OnInit {
  @Input() content!: BlogListContent | PressListContent;
  @Input() type!: BlockType;

  contentData: ContentData[] = [];
  loading = true;
  error = false;

  constructor(
    private pressService: PressService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject('BASE_URL') private baseUrl: string
  ) {}

  ngOnInit() {
    console.log(
      'ContentListV2Component ngOnInit - content:',
      this.content,
      'type:',
      this.type
    );
    this.loadContent();
  }

  loadContent() {
    console.log(
      'loadContent called - type:',
      this.type,
      'BlockType.BlogList:',
      BlockType.BlogList,
      'BlockType.PressList:',
      BlockType.PressList
    );
    this.loading = true;
    this.error = false;

    if (this.type === BlockType.BlogList) {
      console.log('Loading blogs...');
      this.loadBlogs();
    } else if (this.type === BlockType.PressList) {
      console.log('Loading press...');
      this.loadPress();
    } else {
      console.log('Unknown block type:', this.type);
    }
  }

  private loadBlogs() {
        //TODO: Pendiente de desarrollar proximamente

  }

  private loadPress() {
    this.pressService
      .getAllPress()
      .pipe(
        map((press: any[]) => press.slice(0, 6)), // Limitar a 6 elementos
        catchError((error) => {
          console.error('Error loading press:', error);
          this.error = true;
          return [];
        })
      )
      .subscribe((press) => {
        console.log('Press loaded:', press);
        this.contentData = press.map((pressItem: any) => ({
          id: pressItem.id,
          title: pressItem.title,
          subtitle: pressItem.subtitle || '',
          slug: pressItem.slug,
          image: pressItem.image || [],
          travels: pressItem.travels,
          type: 'press' as const,
        }));
        this.loading = false;
        this.cdr.detectChanges();
        console.log('ContentData updated:', this.contentData);
      });
  }

  onContentClick(content: ContentData) {
    if (content.type === 'blog') {
      this.router.navigate(['/blog', content.slug]);
    } else {
      this.router.navigate(['/press', content.slug]);
    }
  }

  onTravelClick(event: Event, content: ContentData) {
    event.stopPropagation();
    if (content.travels?.linkTravels) {
      this.router.navigate([content.travels.linkTravels]);
    }
  }

  getImageUrl(content: ContentData): string {
    if (content.image && content.image.length > 0) {
      return content.image[0].url;
    }
    return `${this.baseUrl}/assets/images/placeholder.jpg`;
  }

  getImageAlt(content: ContentData): string {
    if (content.image && content.image.length > 0) {
      return content.image[0].alt || content.title;
    }
    return content.title;
  }

  trackByContentId(index: number, content: ContentData): string {
    return content.id;
  }
}
