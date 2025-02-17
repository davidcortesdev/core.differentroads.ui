import { CldImage } from '../commons/cld-image.model';

export interface FullSliderContent {
  title: string;
  visible: boolean;
  'card-list': Array<{
    image: Array<{ url: string }>;
    subtitle: string;
    link?: string;
  }>;
}

interface Card {
  image: CldImage[];
  textButton: string;
  link: string;
  description: string;
  title?: string;
}
