import { Component, OnInit } from '@angular/core';
import {
  ImageList,
  PartnersSection,
} from '../../../../core/models/general/partners-section.model';
import { GeneralConfigService } from '../../../../core/services/general-config.service';

@Component({
  selector: 'app-partners-section',
  standalone: false,
  templateUrl: './partners-section.component.html',
  styleUrl: './partners-section.component.scss',
})
export class PartnersSectionComponent implements OnInit {
  partners!: ImageList[];
  numVisible = 6; // Adjust this value as needed

  constructor(private generalConfigService: GeneralConfigService) {}

  ngOnInit(): void {
    this.generalConfigService
      .getPartnersSection()
      .subscribe((data: PartnersSection) => {
        this.partners = data.imageList;
      });
  }
}
