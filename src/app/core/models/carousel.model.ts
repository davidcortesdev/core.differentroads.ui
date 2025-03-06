export interface CarouselCard {
  id: number;
  description: string;
  image: {
    url: string;
    alt: string;
  };
  buttonText: string;
  link: string;
}

export interface ResponsiveOption {
  breakpoint: string;
  numVisible: number;
  numScroll: number;
}