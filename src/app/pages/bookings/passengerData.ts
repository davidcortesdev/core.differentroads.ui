export interface PassengerData {
    id: number;
    fullName: string;
    documentType: string;
    documentNumber: string;
    birthDate: string;
    email: string;
    phone: string;
    type: string; // 'adult', 'child', etc.
    room?: string;
    gender?: string;
    documentExpeditionDate?: string;
    documentExpirationDate?: string;
    comfortPlan?: string;
    insurance?: string;
    _id?: string;
  }