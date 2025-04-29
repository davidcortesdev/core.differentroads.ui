export interface Document {
  _id: string;
  lang: string;
  baseEntity: string;
  entityID: string;
  fileData: {
    display_name: string;
    secure_url: string;
  };
  type: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
