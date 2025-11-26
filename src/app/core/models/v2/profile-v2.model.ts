export interface SummaryItem {
  qty: number;
  value: number;
  description: string;
}

export interface BookingItem {
    id: string;
    title: string;
    number: string; // Generic for all types
    reservationNumber?: string; // For active bookings
    budgetNumber?: string; // For budgets
    ID?: string; // For budgets (in uppercase as in original component)
    _id?: string; // For budgets compatibility
    creationDate: Date;
    status: string;
    reservationStatusId?: number; // ID del estado de reserva para lógica de negocio
    departureDate: Date;
    image: string;
    passengers?: number;
    price?: number;
    tourID?: string;
    origin?: string;
    departureName?: string;
    summary?: SummaryItem[]; // For budgets
    imageLoading?: boolean; // Track if image is loading
    imageLoaded?: boolean; // Track if image loaded successfully
    code?: string; // For bookings compatibility
  }


export interface PersonalInfo {
    id?: string;
    cognitoId?:number;
    nombre?: string;
    apellido?: string;
    avatarUrl?: string;
    email?: string;
    telefono?: string;
    phonePrefix?: string;
    dni?: string;
    direccion?: string;
    ciudad?: string;
    codigoPostal?: string;
    pais?: string;
    fechaNacimiento?: string;
    fechaExpiracionDni?: string;
    sexo?: string;
    notas?: string;
  }


// Interfaces para la respuesta de la API
export interface ReservationResponse {
  id: number;
  tkId: string;
  reservationStatusId: number;
  retailerId: number;
  tourId: number;
  departureId: number;
  userId: number;
  totalPassengers: number;
  totalAmount: number;
  budgetAt: string;
  cartAt: string;
  abandonedAt: string;
  reservedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ===== SISTEMA DE PUNTOS =====

export enum TravelerCategory {
  TROTAMUNDOS = 'Trotamundos',
  VIAJERO = 'Viajero',
  NOMADA = 'Nómada'
}

export enum TransactionType {
  ACUMULAR = 'acumular',
  CANJEAR = 'canjear',
  REVERSAR = 'reversar'
}

export enum TransactionCategory {
  VIAJE = 'viaje',
  ACTIVIDAD = 'actividad',
  EXTRA = 'extra',
}

export interface CategoryConfig {
  id: string;
  name: TravelerCategory;
  displayName: string;
  maxDiscountPerPurchase: number; // 50, 75, 100 euros
  pointsPerEuro: number; // 1 punto = 1 euro
  benefits: string[];
  requirements: string;
  color: string;
  icon: string;
}

export interface PointsTransaction {
  id: string;
  travelerId: string;
  bookingId: string;
  type: TransactionType;
  category: TransactionCategory;
  concept: string;
  points: number;
  amount: number; // Importe que generó los puntos
  date: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
  description?: string;
  tourName?: string;
  // Campos de auditoría según especificaciones
  usuario?: string; // Usuario que realizó la acción
  sistema?: string; // Sistema que procesó la acción
  timestamp?: Date; // Timestamp de la acción
  id_reserva?: string; // ID de la reserva
  id_viajero?: string; // ID del viajero
  accion?: string; // Acción realizada
  saldo_previo?: number; // Saldo anterior
  saldo_nuevo?: number; // Saldo posterior
}

export interface TravelerPointsSummary {
  travelerId: string;
  currentCategory: TravelerCategory;
  totalPoints: number;
  availablePoints: number;
  usedPoints: number;
  categoryStartDate: Date;
  nextCategory?: TravelerCategory;
  pointsToNextCategory?: number;
}

export interface PointsRecord {
  booking: string;
  category: string;
  concept: string;
  tour: string;
  points: number;
  type: string; // 'income', 'redemption' o 'reversal
  // Campos adicionales para compatibilidad
  amount?: number;
  date?: Date;
  status?: string;
}

export interface MembershipCard {
  type: string;
  title: string;
  image: string;
  benefits: any;
  unlocked: boolean;
  isCurrent: boolean;
  requirement: string;
  minTrips: number;
  maxTrips?: number;
  remainingTrips?: number;
  statusText: string; // Para el texto "Desbloqueado" o "x de y viajes completados"
  // Campos adicionales para el nuevo sistema
  category?: TravelerCategory;
  maxDiscount?: number;
  color?: string;
  icon?: string;
}

export interface ReviewV2 {
    id: string;
    review: string;
    score: number;
    traveler: string;
    tour: string;
    date: string;
    tourId: string;
  }