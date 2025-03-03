import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Insurance } from '../../models/tours/insurance.model';

@Injectable({
  providedIn: 'root',
})
export class InsurancesService {
  private insurancesSource = new BehaviorSubject<Insurance[]>([]);
  insurances$ = this.insurancesSource.asObservable();

  private selectedInsuranceSource = new BehaviorSubject<Insurance | null>(null);
  selectedInsurance$ = this.selectedInsuranceSource.asObservable();

  private selectedInsurancesSource = new BehaviorSubject<Insurance[]>([]);
  selectedInsurances$ = this.selectedInsurancesSource.asObservable();

  updateInsurances(insurances: Insurance[]) {
    this.insurancesSource.next(insurances);
  }

  updateSelectedInsurance(insurance: Insurance) {
    this.selectedInsuranceSource.next(insurance);
  }

  updateSelectedInsurances(insurances: Insurance[]) {
    console.log(insurances);

    this.selectedInsurancesSource.next(insurances);
  }

  getInsurances(): Insurance[] {
    return this.insurancesSource.getValue();
  }
}
