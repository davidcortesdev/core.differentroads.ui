import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Insurance } from '../../../../../../core/models/tours/insurance.model';
import { PeriodsService } from '../../../../../../core/services/periods.service';
import { InsurancesService } from '../../../../../../core/services/checkout/insurances.service';
import { PricesService } from '../../../../../../core/services/checkout/prices.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-insurances',
  standalone: false,
  templateUrl: './insurances.component.html',
  styleUrl: './insurances.component.scss',
})
export class InsurancesComponent implements OnInit, OnChanges {
  @Input() periodID!: string;
  insurances: Insurance[] = [];
  addedInsurances: Set<string> = new Set();

  constructor(
    private periodsService: PeriodsService,
    private insurancesService: InsurancesService,
    private pricesService: PricesService,
    private sanitizer: DomSanitizer
  ) {
    this.insurancesService.insurances$.subscribe((insurances) => {
      this.insurances = insurances;
    });
    this.insurancesService.selectedInsurances$.subscribe((insurances) => {
      this.addedInsurances = new Set(
        insurances.map((insurance) => insurance.id)
      );
    });
  }

  ngOnInit(): void {
    this.loadInsurances();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['periodID']) {
      this.loadInsurances();
    }
  }

  loadInsurances(): void {
    if (this.periodID) {
      this.periodsService
        .getInsurances(this.periodID)
        .subscribe((insurances) => {
          this.insurancesService.updateInsurances(
            insurances.map((insurance) => ({
              ...insurance,
              price: this.getPriceById(insurance.activityId),
              priceData: this.pricesService.getPriceDataById(
                insurance.activityId
              ),
            }))
          );
          this.loadPrices();
        });
    }
  }

  loadPrices(): void {
    this.periodsService.getPeriodPrices(this.periodID).subscribe((prices) => {
      this.pricesService.updatePrices(prices);
    });
  }

  toggleInsurance(insurance: Insurance): void {
    if (this.addedInsurances.has(insurance.id)) {
      this.addedInsurances.delete(insurance.id);
    } else {
      this.addedInsurances.add(insurance.id);
    }
    this.updateAddedInsurances();
  }

  updateAddedInsurances(): void {
    const insurances = this.insurances.filter((insurance) =>
      this.addedInsurances.has(insurance.id)
    );
    this.insurancesService.updateSelectedInsurances(insurances);
  }

  getPriceById(id: string): number {
    return this.pricesService.getPriceById(id, 'Adultos');
  }

  getSanitizedDescription(description: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(description);
  }

  isInsuranceAdded(insurance: Insurance): boolean {
    return this.addedInsurances.has(insurance.id);
  }
}
