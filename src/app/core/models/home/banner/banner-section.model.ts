import { CldImage } from '../../commons/cld-image.model';

export interface BannerSection {
  bType: boolean;
  'banner-image': CldImage[];
  'banner-video': string;
}
