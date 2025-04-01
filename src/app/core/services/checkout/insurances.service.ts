import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Insurance } from '../../models/tours/insurance.model';
import { TextsService } from './texts.service';

@Injectable({
  providedIn: 'root',
})
export class InsurancesService {
  private insurancesSource = new BehaviorSubject<Insurance[]>([]);
  insurances$ = this.insurancesSource.asObservable();

  private selectedInsurancesSource = new BehaviorSubject<Insurance[]>([]);
  selectedInsurances$ = this.selectedInsurancesSource.asObservable();

  constructor(private textsService: TextsService) {}

  updateInsurances(insurances: Insurance[]) {
    this.insurancesSource.next(insurances);

    // Store all available insurances in TextsService
    const insuranceTexts: { [key: string]: any } = {};
    insurances.forEach((insurance) => {
      if (insurance.externalID) {
        insuranceTexts[insurance.externalID] = insurance;
      }
    });
    this.textsService.updateTextsForCategory('insurancesAll', insuranceTexts);
  }

  updateSelectedInsurances(insurances: Insurance[]) {
    this.selectedInsurancesSource.next(insurances);

    // Store selected insurances in TextsService
    const insuranceTexts: { [key: string]: any } = {};
    insurances.forEach((insurance) => {
      if (insurance.externalID || insurance.activityId) {
        const key = insurance.externalID || insurance.activityId;
        insuranceTexts[key] = insurance;
      }
    });
    this.textsService.updateTextsForCategory('insurances', insuranceTexts);
  }

  getInsurances(): Insurance[] {
    return this.insurancesSource.getValue();
  }

  getSelectedInsurances(): Insurance[] {
    return this.selectedInsurancesSource.getValue();
  }
}
