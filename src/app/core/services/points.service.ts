import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Point,
  GetAllPointsParams,
  PointListResponse,
} from '../models/points/point.model';

@Injectable({
  providedIn: 'root',
})
export class PointsService {
  private readonly API_URL = `${environment.dataApiUrl}/points`;

  constructor(private http: HttpClient) {}

  createPoints(point: Point): Observable<Point> {
    return this.http.post<Point>(this.API_URL, point);
  }

  getPoints(id: string): Observable<Point> {
    return this.http.get<Point>(`${this.API_URL}/${id}`);
  }

  getAllPoints(params?: GetAllPointsParams): Observable<PointListResponse> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<PointListResponse>(this.API_URL, {
      params: httpParams,
    });
  }

  getPointsByDni(
    dni: string,
    params?: GetAllPointsParams
  ): Observable<PointListResponse> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<PointListResponse>(`${this.API_URL}/by-user/${dni}`, {
      params: httpParams,
    });
  }

  getTotalPointsByDni(dni: string): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/by-user/${dni}/total-points`);
  }
}
