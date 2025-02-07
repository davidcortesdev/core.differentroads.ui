export interface ContactInfo {
  'section-title': string;
  phone: string;
  email: string;
}

export interface Link {
  text: string;
  url: string;
  order: number;
}

export interface Section {
  'section-title': string;
  links: Link[];
}

export interface FooterSection {
  'section-1': Section;
  'section-2': Section;
  'section-3': Section;
  'section-4': Section;
  'contact-info': ContactInfo;
  copyright: {
    text: string;
    year: string;
  };
  info: {
    text: string;
  };
}
