export interface PriceData {
  id: string;
  value: number;
  value_with_campaign: number;
  campaign: string | null;
  age_group_name: string;
  category_name: string;
  period_product?: string;
  _id?: string;
}
