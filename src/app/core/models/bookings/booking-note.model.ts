export type BookingNoteType = 'ERROR' | 'INFO' | 'WARNING' | 'SUCCESS';
export type BookingNoteCategory =
  | 'book-reservation'
  | 'payment'
  | 'cancellation'
  | 'modification'
  | 'other';

export interface BookingNote {
  _id: string;
  title: string;
  message: string;
  author: string;
  bookingID: string;
  type: BookingNoteType;
  category: BookingNoteCategory;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
