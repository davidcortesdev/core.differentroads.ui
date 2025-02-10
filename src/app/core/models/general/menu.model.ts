export interface LinkMenu {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export interface MenuList {
  text: string;
  order: number;
  'custom-link': string;
  'link-menu': LinkMenu[];
  subtype?: string;
}

export interface Promotion {
  link: string;
  content: string;
}

export interface FeaturedHeader {
  visible: boolean;
  'background-color': string;
  'promotion-1': Promotion;
  'promotion-2': Promotion;
}

export interface MenuConfig {
  'featured-header': FeaturedHeader;
  'menu-list-left': MenuList[];
  'menu-list-right': MenuList[];
}
