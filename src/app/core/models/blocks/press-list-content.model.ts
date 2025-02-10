export interface PressListContent {
  title: string;
  textButton: string;
  link: string;
  visible: boolean;
  'press-list': Press[];
}

interface Press {
  id: string;
  name: string;
  type: string;
}
