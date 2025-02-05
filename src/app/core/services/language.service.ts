import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLang = new BehaviorSubject<string>('es');

  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang('es');
    this.translate.use('es');
  }

  setLanguage(lang: string) {
    this.translate.use(lang);
    this.currentLang.next(lang);
  }

  getCurrentLang() {
    return this.currentLang.asObservable();
  }
}