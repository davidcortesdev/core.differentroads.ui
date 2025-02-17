import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GeneralConfigService } from '../../../../core/services/general-config.service';
import { FaqConfig } from '../../../../core/models/general/faq.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-tour-faq',
  standalone: false,
  templateUrl: './tour-faq.component.html',
  styleUrl: './tour-faq.component.scss',
})
export class TourFaqComponent implements OnInit {
  title: string | undefined;
  faqs: FaqItem[] | undefined;

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private generalConfigService: GeneralConfigService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadFaqData(slug);
      }
    });
  }

  private loadFaqData(slug: string) {
    console.log(slug);
    this.generalConfigService
      .getFaqConfig()
      .subscribe((faqSection: FaqConfig) => {
        this.title = faqSection['section-title'];
        this.faqs = faqSection['faq-cards'] || [];
      });
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
