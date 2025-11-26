import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface IPhonePrefixResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  prefix: string;
  isoCode2: string;
  isoCode3: string;
}

export interface PhonePrefixFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  prefix?: string;
  isoCode2?: string;
  isoCode3?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PhonePrefixService {
  private readonly API_URL = `${environment.masterdataApiUrl}/PhonePrefix`;
  private readonly USER_FIELD_VALUE_API_URL = `${environment.usersApiUrl}/UserFieldValue`;
  
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  getAll(filters?: PhonePrefixFilters): Observable<IPhonePrefixResponse[]> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<IPhonePrefixResponse[]>(this.API_URL, { params });
  }

  getById(id: number): Observable<IPhonePrefixResponse> {
    return this.http.get<IPhonePrefixResponse>(`${this.API_URL}/${id}`);
  }

  getAllOrdered(): Observable<IPhonePrefixResponse[]> {
    return this.getAll().pipe(
      map((prefixes) => prefixes.sort((a, b) => a.name.localeCompare(b.name)))
    );
  }

  /**
   * Convierte un código ISO de dos letras a un emoji de bandera
   * @param isoCode Código ISO de dos letras (ej: "ES", "AF")
   * @returns Emoji de bandera (ej: "🇪🇸", "🇦🇫")
   */
  getCountryFlag(isoCode: string): string {
    if (!isoCode || isoCode.length !== 2) return '';
    const codePoints = isoCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  /**
   * Obtiene el texto de visualización para un prefijo telefónico
   * Formato: 🇪🇸 +34 (bandera + prefijo)
   * @param prefix Objeto IPhonePrefixResponse o string (prefijo)
   * @param prefixes Array de prefijos para buscar el objeto completo si prefix es string
   * @returns String con la bandera y el prefijo
   */
  getPrefixDisplayText(prefix: IPhonePrefixResponse | string | null, prefixes?: IPhonePrefixResponse[]): string {
    if (!prefix) return '';
    
    // Si es un string (solo el prefijo), buscar el objeto completo
    if (typeof prefix === 'string' && prefixes) {
      const prefixObj = prefixes.find(p => p.prefix === prefix);
      if (prefixObj) {
        const flag = this.getCountryFlag(prefixObj.isoCode2);
        return `${flag} ${prefixObj.prefix}`;
      }
      return prefix; // Si no se encuentra, devolver solo el prefijo
    }
    
    // Si es un objeto completo
    if (typeof prefix === 'object' && prefix.isoCode2) {
      const flag = this.getCountryFlag(prefix.isoCode2);
      return `${flag} ${prefix.prefix}`;
    }
    
    return String(prefix);
  }

  /**
   * Guarda el prefijo telefónico de un usuario como UserFieldValue
   * @param userId - ID del usuario
   * @param phonePrefix - Prefijo telefónico a guardar (ej: "+34")
   * @returns Observable con el resultado de la operación
   */
  saveUserPhonePrefix(userId: string, phonePrefix: string): Observable<any> {
    if (!phonePrefix) {
      return of(null);
    }

    // userFieldId: 15 corresponde al campo 'phonePrefix' según el mapeo en UpdateProfileV2Service
    const fieldValue = {
      userId: parseInt(userId),
      userFieldId: 15,
      value: phonePrefix.toString().trim()
    };

    // POST directo a UserFieldValue para crear el campo
    return this.http.post(this.USER_FIELD_VALUE_API_URL, fieldValue, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error al guardar prefijo telefónico:', error);
        return of(null);
      })
    );
  }
}

