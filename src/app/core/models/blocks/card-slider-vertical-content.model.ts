import { CldImage } from '../commons/cld-image.model';

export interface CardSliderVerticalContent {
  order: number;
  visible: boolean;
  'card-list': Card[];
  content: string;
}

interface Card {
  image: CldImage[];
  textButton: string;
  link: string;
  description: string;
  title?: string;
}
