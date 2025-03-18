import { Component, OnInit, AfterViewInit } from '@angular/core';
import { GeneralConfigService } from '../../core/services/general-config.service';
import { FooterSection, Link } from '../../core/models/general/footer.model';

interface FooterData {
  newsletterTitle: string;
  contactInfo: {
    phone: string;
    email: string;
  };
  aboutUsLinks: {
    label: string;
    url: string;
  }[];
  ourTripsLinks: {
    label: string;
    url: string;
  }[];
  travelTypesLinks: {
    label: string;
    url: string;
  }[];
  tourOperatorLinks: {
    label: string;
    url: string;
  }[];
  copyrightText: string;
}

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: false,
})
export class FooterComponent implements OnInit, AfterViewInit {
  footerData: FooterData = {
    newsletterTitle: '',
    contactInfo: {
      phone: '',
      email: '',
    },
    aboutUsLinks: [],
    ourTripsLinks: [],
    travelTypesLinks: [],
    tourOperatorLinks: [],
    copyrightText: '',
  };

  isSubscribed = false;
  formLoaded = false;

  constructor(private generalConfigService: GeneralConfigService) {}

  ngOnInit() {
    this.fetchFooterConfig();
  }

  ngAfterViewInit() {
    this.loadMailerLiteScript();
  }

  fetchFooterConfig() {
    this.generalConfigService
      .getFooterSection()
      .subscribe({
        next: (footerSection: FooterSection) => {
          this.footerData = this.mapFooterSectionToFooterData(footerSection);
        },
        error: (error) => console.error('Error fetching footer config:', error)
      });
  }

  private mapFooterSectionToFooterData(
    footerSection: FooterSection
  ): FooterData {
    return {
      newsletterTitle: footerSection.info.text,
      contactInfo: {
        phone: footerSection['contact-info'].phone,
        email: footerSection['contact-info'].email,
      },
      aboutUsLinks: this.mapLinks(footerSection['section-1'].links),
      ourTripsLinks: this.mapLinks(footerSection['section-2'].links),
      travelTypesLinks: this.mapLinks(footerSection['section-3'].links),
      tourOperatorLinks: this.mapLinks(footerSection['section-4'].links),
      copyrightText: `${footerSection.copyright.text} ${footerSection.copyright.year}`,
    };
  }

  private mapLinks(links: Link[]): { label: string; url: string }[] {
    return links.map((link: Link) => ({
      label: link.text,
      url: link.url,
    }));
  }

  loadMailerLiteScript(): void {
    if (document.getElementById('mailer-lite-script')) {
      this.setupFormListener();
      return;
    }

    const script = document.createElement('script');
    script.id = 'mailer-lite-script';
    script.src = 'https://static.mailerlite.com/js/w/webforms.min.js?vd4de52e171e8eb9c47c0c20caf367ddf';
    script.type = 'text/javascript';
    script.onload = () => this.setupFormListener();
    document.body.appendChild(script);
  }

  private setupFormListener(): void {
    const form = document.querySelector('.ml-block-form');
    if (form) {
      form.addEventListener('submit', this.handleFormSubmit.bind(this));
      this.formLoaded = true;
    }
  }

  handleFormSubmit(event: Event): void {
    // Show loading button, hide submit button
    const submitBtn = document.querySelector('.ml-subscribe-form-6075553 button[type="submit"]');
    const loadingBtn = document.querySelector('.ml-subscribe-form-6075553 button.loading');
    
    if (submitBtn && loadingBtn) {
      submitBtn.setAttribute('style', 'display: none');
      loadingBtn.setAttribute('style', 'display: inline-block');
    }
    
    // Set a timeout to simulate form submission and show success message
    setTimeout(() => {
      const formElement = document.querySelector('.ml-subscribe-form-6075553 .row-form');
      const successElement = document.querySelector('.ml-subscribe-form-6075553 .row-success');
      const titleElement = document.querySelector('.newsletter .title.inicial');
      
      if (formElement) formElement.setAttribute('style', 'display: none');
      if (successElement) successElement.setAttribute('style', 'display: block');
      if (titleElement) titleElement.setAttribute('style', 'display: none');
      
      this.isSubscribed = true;
    }, 2000);
  }
}
