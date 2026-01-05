import { SEO } from '../commons/seo.model';

export interface Page {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  availableLangs: string[];
  isLangAvailable: boolean;
  title: string;
  description: string;
  seo: SEO;
}
