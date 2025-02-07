export interface FAQ {
  question: string;
  answer: string;
}

export interface FaqConfig {
  'section-title': string;
  'faq-cards': FAQ[];
}
