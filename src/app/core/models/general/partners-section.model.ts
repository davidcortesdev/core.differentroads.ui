import { CldImage } from '../commons/cld-image.model';

export interface ImageList {
  partnerImage: CldImage[];
  url: string;
}

export interface PartnersSection {
  title: string;
  imageList: ImageList[];
}
