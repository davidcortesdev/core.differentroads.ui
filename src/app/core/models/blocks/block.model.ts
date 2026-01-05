import { BlogListContent } from './blog-list-content.model';
import { PressListContent } from './press-list-content.model';

export interface Block {
  type: BlockType;
  name: string;
  content: BlockContent;
}

export enum BlockType {
  PressList = 'press-list',
  BlogList = 'blog-list',
}

export type BlockContent =
  | PressListContent
  | BlogListContent
  | null;
