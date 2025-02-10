import { CldImage } from '../commons/cld-image.model';

export interface SingleFeaturedContent {
  title: string;
  link: string;
  image: CldImage[];
  visible: boolean;
  content: string;
}
