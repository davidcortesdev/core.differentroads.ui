import { CldImage } from '../commons/cld-image.model';

export interface PointsCard {
  name: string;
  'point-image': CldImage[];
  minTravels: string;
  maxTravels: string | number;
  content: string;
}

export interface PointsSection {
  'section-title': string;
  'points-cards': PointsCard[];
}
