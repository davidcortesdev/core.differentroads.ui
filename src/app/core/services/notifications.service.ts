import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { filter, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SendBudgetNotificationEmailServiceProps {
  id: string;
  email: string;
  products?: {
    name: string;
    units: number;
    singlePrice: number;
  }[];
}

export interface CancelBookingNotificationProps {
  id: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly API_URL = `${environment.notificationsApiUrl}/trigger`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  sendBudgetNotificationEmail(
    props: SendBudgetNotificationEmailServiceProps
  ): Observable<any> {
    const { id, email, products } = props;
    const body = {
      trigger: 'BUDGET',
      data: {
        id,
        emailOverride: email,
        products: products,
      },
    };
    return this.http.post<any>(this.API_URL, body, this.httpOptions);
  }

  sendBookingNotificationEmail(
    props: SendBudgetNotificationEmailServiceProps
  ): Observable<any> {
    const { id, email, products } = props;
    console.log(id);

    const body = {
      trigger: 'NEW_BOOKING',
      data: {
        id,
        emailOverride: email,
        filters: {
          bookState: 'Booked',
        },
      },
    };
    return this.http.post<any>(this.API_URL, body, this.httpOptions);
  }

  cancelBookingNotification(
    props: CancelBookingNotificationProps
  ): Observable<any> {
    if (!props || !props.id) {
      throw new Error('The "id" property is missing in the props object.');
    }

    const { id } = props;
    const body = {
      trigger: 'BOOKING_CANCEL',
      data: {
        id,
        filters: {
          cancelState: 'user',
        },
      },
    };
    return this.http.post<any>(this.API_URL, body, this.httpOptions);
  }

  getBudgetDocument(id: string): Observable<{
    fileUrl: string;
  }> {
    const url = `${environment.notificationsApiUrl}/documents/budget/${id}`;
    return this.http.get<{
      fileUrl: string;
    }>(url);
  }

  getBookingDocument(
    id: string,
    force = false
  ): Observable<{
    fileUrl: string;
  }> {
    const url = `${environment.notificationsApiUrl}/documents/bookingBone/${id}?force=${force}`;
    return this.http.get<{
      fileUrl: string;
    }>(url);
  }
}
