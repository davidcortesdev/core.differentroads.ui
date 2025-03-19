import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CouponList } from '../models/coupons/coupon-list.model';
import { Coupon } from '../models/coupons/coupon.model';
import { map } from 'rxjs/operators';

type SelectedFields = Partial<Array<keyof Coupon | 'all'>>;

@Injectable({
  providedIn: 'root',
})
export class CouponsService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/coupons`;

  constructor(private http: HttpClient) {}

  getAllCoupons(): Observable<CouponList[]> {
    return this.http.get<CouponList[]>(this.API_URL);
  }

  getCouponById(
    id: string,
    selectedFields: SelectedFields = []
  ): Observable<Coupon> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http.get<Coupon>(`${this.API_URL}/${id}`, { params });
  }

  getActiveCoupons(): Observable<CouponList[]> {
    return this.http.get<CouponList[]>(
      `${this.API_URL}/filter-by/isActive/true`
    );
  }

  getCouponByCode(
    code: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Coupon> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    // Get all coupons and filter on client side for exact match
    return this.http
      .get<Coupon[]>(`${this.API_URL}/filter-by/discountCode/${code}`, {
        params,
      })
      .pipe(
        map((coupons: Coupon[]) => {
          // Perform exact match (case sensitive)
          const matchedCoupon = coupons.find(
            (coupon) => coupon.discountCode === code
          );

          if (matchedCoupon) {
            return matchedCoupon;
          } else {
            throw new Error('No coupon found with the given code');
          }
        })
      );
  }
}
