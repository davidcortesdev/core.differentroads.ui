import { Component, OnInit } from '@angular/core';
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
export class FooterComponent implements OnInit {
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

  constructor(private generalConfigService: GeneralConfigService) {}

  ngOnInit() {
    this.fetchFooterConfig();
  }

  fetchFooterConfig() {
    this.generalConfigService
      .getFooterSection()
      .subscribe((footerSection: FooterSection) => {
        this.footerData = this.mapFooterSectionToFooterData(footerSection);
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
}
