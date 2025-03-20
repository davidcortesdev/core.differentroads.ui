import { CMSCollections } from '../commons/cms-collections.model';

export interface Coupon extends CMSCollections {
  discountCode: string;
  discountAmount: number;
  isActive: boolean;
  description: string;
}
