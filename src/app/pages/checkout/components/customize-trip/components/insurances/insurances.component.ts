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
  selectedInsurance: Insurance | null = null;
  basicInsuranceSelected: boolean = true;

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
        insurances.map((insurance) => insurance.activityId)
      );

      // Update selected insurance based on the selectedInsurances service data
      if (insurances.length > 0) {
        // Find the insurance in our insurances array that matches the selected one
        const foundInsurance = this.insurances.find(
          (ins) => ins.activityId === insurances[0].activityId
        );

        if (foundInsurance) {
          this.selectedInsurance = foundInsurance;
          this.basicInsuranceSelected = false;
        }
      } else {
        this.selectedInsurance = null;
        this.basicInsuranceSelected = true;
      }
    });
  }

  ngOnInit(): void {
    this.loadInsurances();
    this.initializeInsurances();
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
            insurances
              .map((insurance) => ({
                ...insurance,
                price: this.getPriceById(insurance.activityId),
                priceData: this.pricesService.getPriceDataById(
                  insurance.activityId
                ),
              }))
              .filter((insurance) => insurance.price > 0)
          );
          this.updateAddedInsurances();

          this.loadPrices();
        });
    }
  }

  loadPrices(): void {
    this.periodsService.getPeriodPrices(this.periodID).subscribe((prices) => {
      this.pricesService.updatePrices(prices);
    });
  }

  toggleInsurance(insurance: Insurance | null): void {
    this.selectedInsurance = insurance;
    this.basicInsuranceSelected = !insurance;
    this.addedInsurances.clear();

    if (insurance) {
      this.addedInsurances.add(insurance.activityId);
    }
    this.updateAddedInsurances();
  }

  updateAddedInsurances(): void {
    const insurances = this.insurances.filter((insurance) =>
      this.addedInsurances.has(insurance.activityId)
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
    return this.addedInsurances.has(insurance.activityId);
  }

  initializeInsurances(): void {
    // Updated to properly handle initialization
    this.insurancesService.insurances$.subscribe((insurances) => {
      if (insurances.length > 0) {
        // Check if we already have a selected insurance from selectedInsurances$
        const selectedInsurances =
          this.insurancesService.getSelectedInsurances();

        if (selectedInsurances.length > 0) {
          const foundInsurance = insurances.find(
            (ins) => ins.activityId === selectedInsurances[0].activityId
          );

          if (foundInsurance) {
            this.selectedInsurance = foundInsurance;
            this.basicInsuranceSelected = false;
          }
        }
      }
    });
  }
}
