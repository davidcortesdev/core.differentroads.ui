import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-title-and-quill',
  standalone: false,
  templateUrl: './title-and-quill.component.html',
  styleUrl: './title-and-quill.component.scss',
})
export class TitleAndQuillComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() type: 'collection' | 'landing' = 'landing';

  constructor(private sanitizer: DomSanitizer) {}

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
