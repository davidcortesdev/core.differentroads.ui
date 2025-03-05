import { CldImage } from '../commons/cld-image.model';

export interface SingleFeaturedContent {
  title: string;
  link: string;
  image: CldImage[];
  order: number;
  visible: boolean;
  content: string;
}
