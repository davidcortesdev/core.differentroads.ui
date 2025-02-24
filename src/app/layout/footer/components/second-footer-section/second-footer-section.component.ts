import { Component, OnInit } from '@angular/core';
import { GeneralConfigService } from '../../../../core/services/general-config.service';
import { FooterSection } from '../../../../core/models/general/footer.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-second-footer-section',
  templateUrl: './second-footer-section.component.html',
  styleUrls: ['./second-footer-section.component.scss'],
  standalone: false,
})
export class SecondFooterSectionComponent implements OnInit {
  safeInfoText: SafeHtml = '';
  isVisible: boolean = true;
  mostrarDiv: boolean = false;

  constructor(
    private generalConfigService: GeneralConfigService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.fetchFooterConfig();
  }

  fetchFooterConfig() {
    this.generalConfigService
      .getFooterSection()
      .subscribe((footerSection: FooterSection) => {
        this.safeInfoText = this.sanitizer.bypassSecurityTrustHtml(
          footerSection.info.text
        );
        this.verificarTexto(footerSection.info.text);
      });
  }

  verificarTexto(texto: string) {
    this.mostrarDiv = texto !== '<p><br></p>';
  }
}
