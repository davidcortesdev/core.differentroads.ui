export interface BlogListContent {
  title: string;
  textButton: string;
  link: string;
  visible: boolean;
  'blog-list': Blog[];
}

interface Blog {
  id: string;
  name: string;
  type: string;
}
