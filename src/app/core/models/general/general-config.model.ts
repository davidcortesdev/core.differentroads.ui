import { CheckoutSection } from './confirmation-texts.model';
import { FaqConfig } from './faq.model';
import { FiltersSection } from './filters.model';
import { FooterSection } from './footer.model';
import { MenuConfig } from './menu.model';
import { PointsSection } from './points-sections.model';

export interface GeneralConfigSchema {
  id: string;
  'menu-config': MenuConfig;
  'faq-section': FaqConfig;
  'footer-section': FooterSection;
  'checkout-section': CheckoutSection;
  'points-section': PointsSection;
  'filters-section': FiltersSection;
}
