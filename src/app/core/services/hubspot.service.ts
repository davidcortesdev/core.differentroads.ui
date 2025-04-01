import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface ContactData {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HubspotService {
  private readonly DATA_API_URL =
    'https://api.differentroads.es/dev/data/hubspot/contact';

  constructor(private http: HttpClient) {}

  createContact(contactData: ContactData): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    const data = {
      email: contactData.email,
      firstname: contactData.firstname || '',
      lastname: contactData.lastname || '',
      phone: contactData.phone || '',
    };

    return this.http.post(this.DATA_API_URL, data, { headers }).pipe(
      catchError((error) => {
        console.error('Error creating contact:', error);
        throw error;
      })
    );
  }
}
