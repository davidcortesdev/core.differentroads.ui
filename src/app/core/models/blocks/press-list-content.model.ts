export interface PressListContent {
  title: string;
  textButton: string;
  link: string;
  order: number;
  visible: boolean;
  'press-list': Press[];
}

interface Press {
  id: string;
  name: string;
  type: string;
}
