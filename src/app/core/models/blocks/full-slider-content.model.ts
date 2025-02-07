import { CldImage } from '../commons/cld-image.model';

export interface FullSliderContent {
  title: string;
  visible: boolean;
  'card-list': Card[];
}

interface Card {
  image: CldImage[];
  textButton: string;
  link: string;
  description: string;
  title?: string;
}
