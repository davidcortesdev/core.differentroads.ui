export interface BlogListContent {
  title: string;
  textButton: string;
  link: string;
  order: number;
  visible: boolean;
  'blog-list': Blog[];
}

interface Blog {
  id: string;
  name: string;
  type: string;
}

export interface BlogData {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  image: { url: string; alt: string }[];
  travels: {
    btntext: string;
    linkTravels: string;
  };
}
