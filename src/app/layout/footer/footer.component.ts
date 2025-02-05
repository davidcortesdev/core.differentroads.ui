import { Component, OnInit } from '@angular/core';

interface FooterData {
  newsletterTitle: string;
  contactInfo: {
    phone: string;
    email: string;
  };
  aboutUsLinks: {
    label: string;
    url: string;
  }[];
  ourTripsLinks: {
    label: string;
    url: string;
  }[];
  travelTypesLinks: {
    label: string;
    url: string;
  }[];
  tourOperatorLinks: {
    label: string;
    url: string;
  }[];
  copyrightText: string;
}

@Component({
  selector: 'app-footer',
  standalone: false,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements OnInit {
  footerData: FooterData = {
    newsletterTitle: 'Regístrate para recibir ofertas exclusivas, eventos y más',
    contactInfo: {
      phone: '+34 965 02 71 04',
      email: 'info@differentroads.es'
    },
    aboutUsLinks: [
      { label: 'Somos diferentes', url: '#' },
      { label: 'Programa de puntos', url: '#' },
      { label: 'Preguntas frecuentes', url: '#' },
      { label: 'Políticas de privacidad', url: '#' },
      { label: 'Condiciones generales', url: '#' },
      { label: 'Aviso legal', url: '#' }
    ],
    ourTripsLinks: [
      { label: 'Europa', url: '#' },
      { label: 'Asia', url: '#' },
      { label: 'America', url: '#' },
      { label: 'África', url: '#' },
      { label: 'Grupos', url: '#' },
      { label: 'Temporadas', url: '#' }
    ],
    travelTypesLinks: [
      { label: 'DR Tours', url: '#' },
      { label: 'DMC', url: '#' },
      { label: 'Fly & Drive', url: '#' },
      { label: 'Vuelo + Hotel', url: '#' }
    ],
    tourOperatorLinks: [
      { label: '¿Quienes somos?', url: '#' },
      { label: '¿Por que Different?', url: '#' }
    ],
    copyrightText: '© Different Roads 2024'
  };

  ngOnInit() {
    // Lógica de inicialización si es necesaria
  }
}