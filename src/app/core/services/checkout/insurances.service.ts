import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Insurance } from '../../models/tours/insurance.model';

@Injectable({
  providedIn: 'root',
})
export class InsurancesService {
  private insurancesSource = new BehaviorSubject<Insurance[]>([]);
  insurances$ = this.insurancesSource.asObservable();

  private selectedInsurancesSource = new BehaviorSubject<Insurance[]>([]);
  selectedInsurances$ = this.selectedInsurancesSource.asObservable();

  updateInsurances(insurances: Insurance[]) {
    this.insurancesSource.next(insurances);
  }

  updateSelectedInsurances(insurances: Insurance[]) {
    this.selectedInsurancesSource.next(insurances);
  }

  getInsurances(): Insurance[] {
    return this.insurancesSource.getValue();
  }
}
