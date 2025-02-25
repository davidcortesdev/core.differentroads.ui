export interface TourListContent {
  title: string;
  textButton: string;
  link: string;
  visible: boolean;
  order?: number;
  'tour-list': Tour[];
  showMonthTags?: boolean;
  showMkTag?: boolean;
  showMkText?: boolean;
}

interface Tour {
  id: string;
  name: string;
  slug?: string;
  type?: string;
}
