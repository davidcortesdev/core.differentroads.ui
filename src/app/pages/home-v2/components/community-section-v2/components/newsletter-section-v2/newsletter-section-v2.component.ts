import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-newsletter-section-v2',
  standalone: true,
  templateUrl: './newsletter-section-v2.component.html',
  styleUrls: ['./newsletter-section-v2.component.scss'],
  imports: [],
})
export class NewsLetterSectionV2Component implements OnInit {
  constructor() {}

  ngOnInit(): void {
    this.loadMailerLiteScript();
  }

  ml_webform_success_6075553(): void {
    const r = (window as any)['ml_jQuery'] || (window as any)['jQuery'];
    r('.ml-subscribe-form-6075553 .row-success').show();
    r('.ml-subscribe-form-6075553 .row-form').hide();
  }

  loadMailerLiteScript(): void {
    const script = document.createElement('script');
    script.src =
      'https://static.mailerlite.com/js/w/webforms.min.js?vd4de52e171e8eb9c47c0c20caf367ddf';
    script.type = 'text/javascript';
    document.body.appendChild(script);
  }
}
