import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'nl2br',
})
export class Nl2brPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): any {
    if (!value) {
      return '';
    }

    // First replace literal '\n' string with actual <br> tags
    let replacedValue = value.replace(/\\n/g, '<br>');

    // Then handle actual newline characters if they exist
    replacedValue = replacedValue.replace(/(\r\n|\r|\n)/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(replacedValue);
  }
}
