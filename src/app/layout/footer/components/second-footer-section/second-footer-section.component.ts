import { Component, OnInit, OnDestroy } from '@angular/core';
import { GeneralConfigService } from '../../../../core/services/general-config.service';
import { FooterSection } from '../../../../core/models/general/footer.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-second-footer-section',
  templateUrl: './second-footer-section.component.html',
  styleUrls: ['./second-footer-section.component.scss'],
  standalone: false,
})
export class SecondFooterSectionComponent implements OnInit, OnDestroy {
  safeInfoText: SafeHtml = '';
  mostrarDiv: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private generalConfigService: GeneralConfigService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.fetchFooterConfig();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  fetchFooterConfig(): void {
    this.subscription = this.generalConfigService
      .getFooterSection()
      .subscribe((footerSection: FooterSection) => {
        if (footerSection?.info?.text) {
          this.safeInfoText = this.sanitizer.bypassSecurityTrustHtml(
            footerSection.info.text
          );
          this.mostrarDiv = footerSection.info.text !== '<p><br></p>';
        }
      });
  }
}
