import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { GeneralConfigSchema } from '../models/general/general-config.model';
import { FaqConfig } from '../models/general/faq.model';
import { MenuConfig } from '../models/general/menu.model';
import { FooterSection } from '../models/general/footer.model';
import { CheckoutSection } from '../models/general/confirmation-texts.model';
import { FiltersSection } from '../models/general/filters.model';
import { PointsSection } from '../models/general/points-sections.model';
import { PartnersSection } from '../models/general/partners-section.model';

@Injectable({
  providedIn: 'root',
})
export class GeneralConfigService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/globals/es/general-config`;

  constructor(private http: HttpClient) {}

  getGeneralConfigData(
    selectedFields: string[]
  ): Observable<GeneralConfigSchema> {
    let params = new HttpParams();
    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }
    return this.http.get<GeneralConfigSchema>(this.API_URL, { params });
  }

  getMenuConfig(): Observable<MenuConfig> {
    return this.getGeneralConfigData(['menu-config']).pipe(
      map((configData: GeneralConfigSchema) => configData['menu-config'])
    );
  }

  getFaqConfig(): Observable<FaqConfig> {
    return this.getGeneralConfigData(['faq-section']).pipe(
      map((configData: GeneralConfigSchema) => configData['faq-section'])
    );
  }

  getFooterSection(): Observable<FooterSection> {
    return this.getGeneralConfigData(['footer-section']).pipe(
      map((configData: GeneralConfigSchema) => configData['footer-section'])
    );
  }

  getCheckoutSection(): Observable<CheckoutSection> {
    return this.getGeneralConfigData(['checkout-section']).pipe(
      map((configData: GeneralConfigSchema) => configData['checkout-section'])
    );
  }

  getPointsSection(): Observable<PointsSection> {
    return this.getGeneralConfigData(['points-section']).pipe(
      map((configData: GeneralConfigSchema) => configData['points-section'])
    );
  }

  getFiltersSection(): Observable<FiltersSection> {
    return this.getGeneralConfigData(['filters-section']).pipe(
      map((configData: GeneralConfigSchema) => configData['filters-section'])
    );
  }

  getPartnersSection(): Observable<PartnersSection> {
    return this.getGeneralConfigData(['partners-section']).pipe(
      map((configData: GeneralConfigSchema) => configData['partners-section'])
    );
  }
}
