import { Component, OnInit } from '@angular/core';
import {
  ImageList,
  PartnersSection,
} from '../../../../core/models/general/partners-section.model';
import { GeneralConfigService } from '../../../../core/services/general-config.service';
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';

@Component({
  selector: 'app-partners-section',
  standalone: false,
  templateUrl: './partners-section.component.html',
  styleUrl: './partners-section.component.scss',
})
export class PartnersSectionComponent implements OnInit {
  partners!: ImageList[];
  numVisible = 4;
  title!: string;
  responsiveOptions = [
    {
      breakpoint: '1800px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '1300px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '1000px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '700px',
      numVisible: 1,
      numScroll: 1,
    },
  ];
  protected carouselConfig = CAROUSEL_CONFIG;

  constructor(private generalConfigService: GeneralConfigService) {}

  ngOnInit(): void {
    this.generalConfigService
      .getPartnersSection()
      .subscribe((data: PartnersSection) => {
        this.partners = data.imageList;
        this.title = data.title;
      });
  }
}
