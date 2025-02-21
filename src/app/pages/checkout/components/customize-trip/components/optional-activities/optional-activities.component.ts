import { Component } from '@angular/core';
import { PriceData } from '../../../../../../core/models/commons/price-data.model';

@Component({
  selector: 'app-optional-activities',
  standalone: false,
  templateUrl: './optional-activities.component.html',
  styleUrl: './optional-activities.component.scss',
})
export class OptionalActivitiesComponent {
  // Lista de actividades opcionales
  optionalActivities = [
    {
      status: 'PUBLISHED',
      activityId: '12345',
      description:
        'Disfruta de una cena gourmet en uno de los restaurantes más exclusivos de París con vista a la Torre Eiffel. (Reserva previa requerida)',
      externalID: '789012',
      name: 'Opcional: Cena en París',
      optional: true,
      periodId: '67890',
      productType: 'Actividades opcionales',
      availability: 20,
      priceData: [
        {
          id: '1234567',
          value: 100,
          value_with_campaign: 90,
          campaign: 'Early Bird',
          age_group_name: 'Adultos',
          category_name: 'Premium category',
          period_product: '67890.12345',
          _id: '789a1b781ef82dee14b9e86a',
        },
      ],
      _id: '789a1b781ef82dee14b9e869',
    },
    {
      status: 'UNPUBLISHED',
      activityId: '54321',
      description:
        'Explora las ruinas antiguas de Roma con un guía experto que te contará la historia detrás de cada monumento. (Grupo mínimo de 10 personas)',
      externalID: '345678',
      name: 'Opcional: Tour histórico en Roma',
      optional: true,
      periodId: '98765',
      productType: 'Actividades opcionales',
      availability: 15,
      priceData: [
        {
          id: '2345678',
          value: 50,
          value_with_campaign: 50,
          campaign: null,
          age_group_name: 'Adultos',
          category_name: 'Standard category',
          period_product: '98765.54321',
          _id: '890b2c781ef82dee14b9e86b',
        },
        {
          id: '2345679',
          value: 25,
          value_with_campaign: 25,
          campaign: null,
          age_group_name: 'Niños',
          category_name: 'Standard category',
          period_product: '98765.54321',
          _id: '890b2c781ef82dee14b9e86c',
        },
      ],
      _id: '890b2c781ef82dee14b9e86a',
    },
    {
      status: 'PUBLISHED',
      activityId: '11223',
      description:
        'Navega por las aguas cristalinas del Caribe en un catamarán privado. Incluye snorkeling y almuerzo. (Máximo 15 personas)',
      externalID: '456789',
      name: 'Opcional: Excursión en catamarán',
      optional: true,
      periodId: '33445',
      productType: 'Actividades opcionales',
      availability: 10,
      priceData: [
        {
          id: '3456789',
          value: 120,
          value_with_campaign: 110,
          campaign: 'Summer Sale',
          age_group_name: 'Adultos',
          category_name: 'Luxury category',
          period_product: '33445.11223',
          _id: '901c3d781ef82dee14b9e86d',
        },
      ],
      _id: '901c3d781ef82dee14b9e86c',
    },
    {
      status: 'PUBLISHED',
      activityId: '99887',
      description:
        'Visita los famosos viñedos de Toscana y disfruta de una degustación de vinos locales. (Transporte incluido)',
      externalID: '567890',
      name: 'Opcional: Tour de vinos en Toscana',
      optional: true,
      periodId: '77665',
      productType: 'Actividades opcionales',
      availability: 25,
      priceData: [
        {
          id: '4567890',
          value: 75,
          value_with_campaign: 70,
          campaign: 'Wine Lovers',
          age_group_name: 'Adultos',
          category_name: 'Standard category',
          period_product: '77665.99887',
          _id: '012d4e781ef82dee14b9e86e',
        },
      ],
      _id: '012d4e781ef82dee14b9e86d',
    },
    {
      status: 'UNPUBLISHED',
      activityId: '66554',
      description:
        'Experimenta la emoción de un safari fotográfico en Sudáfrica con guías expertos. (Alojamiento incluido)',
      externalID: '678901',
      name: 'Opcional: Safari en Sudáfrica',
      optional: true,
      periodId: '44332',
      productType: 'Actividades opcionales',
      availability: 5,
      priceData: [
        {
          id: '5678901',
          value: 300,
          value_with_campaign: 280,
          campaign: 'Adventure Seekers',
          age_group_name: 'Adultos',
          category_name: 'Adventure category',
          period_product: '44332.66554',
          _id: '123e5f781ef82dee14b9e86f',
        },
      ],
      _id: '123e5f781ef82dee14b9e86e',
    },
  ];

  getAdultPrices(priceData: PriceData[]): PriceData[] {
    return priceData.filter((price) => price.age_group_name === 'Adultos');
  }
}
