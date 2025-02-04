import { CldImage } from '../cloudinary/cld-image.model';

export interface BannerSection {
  bType: boolean;
  'banner-image': CldImage[];
  'banner-video': string;
}