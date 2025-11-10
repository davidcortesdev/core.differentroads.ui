export interface PassengerData {
  id: number;
  name: string;
  surname: string;
  documentType: string;
  passportID: string;
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
  ciudad?: string;
  codigoPostal?: string;
  nationality?: string;
  dni?: string;
  minorIdExpirationDate?: string;
  minorIdIssueDate?: string;
  prefijo?: string;
}
