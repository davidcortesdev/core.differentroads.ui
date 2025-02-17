import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../core/services/tours.service';
import { Tour } from '../../core/models/tours/tour.model';
import { catchError } from 'rxjs';

@Component({
  selector: 'app-tour',
  standalone: false,
  templateUrl: './tour.component.html',
  styleUrls: ['./tour.component.scss'],
})
export class TourComponent implements OnInit {
  tourSlug: string = '';
  tour?: Tour;
  loading: boolean = true;
  error: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.tourSlug = params['slug'];
      this.loadTourDetails();
    });
  }

  private loadTourDetails(): void {
    this.loading = true;
    this.error = false;

    this.toursService
      .getTourDetail(this.tourSlug)
      .pipe(
        catchError((error) => {
          console.error('Error loading tour:', error);
          this.error = false;
          this.loading = false;
          return [];
        })
      )
      .subscribe((tourData: Tour) => {
        this.tour = tourData;
        console.log(tourData);
        this.loading = false;
      });
  }

  getDuration(days: number | undefined): string {
    if (!days) return '';
    return `${days} días, ${days - 1} noches`;
  }
}
