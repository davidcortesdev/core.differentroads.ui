import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Page } from '../../core/models/pages/page.model';
import { PagesService } from '../../core/services/pages.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-basic-page',
  standalone: false,
  templateUrl: './basic-page.component.html',
  styleUrls: ['./basic-page.component.scss'],
})
export class BasicPageComponent implements OnInit {
  slug: string | null = null;
  pageData: Page | null = null; // Usa el tipado Page
  isLoading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private pageService: PagesService, // Inyecta el servicio
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug');
    if (this.slug) {
      this.fetchPageData(this.slug);
    } else {
      console.error('Slug is missing');
      this.isLoading = false;
    }
  }

  fetchPageData(slug: string): void {
    this.pageService
      .getPageBySlug(slug)
      .pipe(
        catchError((error) => {
          console.error('Error fetching page data:', error);
          return of(null);
        })
      )
      .subscribe((data) => {
        this.pageData = data;
        this.isLoading = false;
        if (data && data.title) {
          this.updatePageTitle(data.title);
        }
      });
  }

  private updatePageTitle(title: string): void {
    if (title) {
      this.titleService.setTitle(`${title} - Different Roads`);
    }
  }

  get pageContent(): Page | null {
    return this.pageData;
  }
}
