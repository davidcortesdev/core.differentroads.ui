import { TripType } from "../models/interfaces/trip-type.interface";

export const TRIP_TYPES: TripType[] = [
  {
    title: 'En grupo',
    label: 'G',
    description: 'Viajes para todos: solos, con amigos o en pareja',
    class: 'group',
    value: 'Grupo',
  },
  {
    title: 'Singles',
    label: 'S',
    description: 'Viaja solo y conoce a gente nueva',
    class: 'single',
    value: 'Single',
  },
  {
    title: 'Privados',
    label: 'P',
    description: 'Viajes a medida para ti y los tuyos',
    class: 'private',
    value: 'Private',
  },
];