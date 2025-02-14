import { Component } from '@angular/core';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-tour-faq',
  standalone: false,
  templateUrl: './tour-faq.component.html',
  styleUrl: './tour-faq.component.scss'
})
export class TourFaqComponent {
  faqs: FaqItem[] = [
    {
      question: 'Info',
      answer: 'Información general sobre nuestros servicios y tours.'
    },
    {
      question: 'Como funciona',
      answer: 'Explicación detallada del proceso de reserva y participación en nuestros tours.'
    },
    {
      question: 'Necesito un seguro',
      answer: 'Información sobre los seguros de viaje y coberturas disponibles.'
    },
    {
      question: 'Cuantos viajeros forman un grupo',
      answer: 'Detalles sobre el tamaño de los grupos y las opciones disponibles.'
    },
    {
      question: 'Puedo reservar en agencia',
      answer: 'Información sobre el proceso de reserva a través de agencias asociadas.'
    },
    {
      question: '¿A que grupos me puedo unir?',
      answer: 'Explicación sobre los diferentes tipos de grupos y opciones de unión disponibles.'
    }
  ];
}
