import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { UserFilter, IUserResponse, UserCreate, UserUpdate } from '../../models/users/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersNetService {
  private apiUrl = environment.usersApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene usuarios basados en criterios de filtro
   * GET /api/User
   * @param filters Filtros para aplicar en la búsqueda
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de usuarios
   */
  getUsers(filters?: UserFilter, signal?: AbortSignal): Observable<IUserResponse[]> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'Id' && Array.isArray(value)) {
            // Si es un array, agregar cada ID como parámetro 'Id' separado
            const uniqueIds = [...new Set(value)]; // Remover duplicados
            uniqueIds.forEach(id => {
              params = params.append('Id', id.toString());
            });
          } else if (key === 'Id' && typeof value === 'number') {
            // Si es un solo ID
            params = params.set('Id', value.toString());
          } else {
            params = params.set(key, value.toString());
          }
        }
      });
    }

    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = { params };
    if (signal) {
      options.signal = signal;
    }

    return this.http
      .get<IUserResponse[]>(`${this.apiUrl}/User`, options)
      .pipe(
        catchError((error) => {
          return of([]);
        })
      );
  }

  /**
   * Obtiene un usuario específico por su ID
   * GET /api/User/{id}
   * @param id ID del usuario a recuperar
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Datos del usuario
   */
  getUserById(id: number, signal?: AbortSignal): Observable<IUserResponse> {
    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = {};
    if (signal) {
      options.signal = signal;
    }
    return this.http.get<IUserResponse>(`${this.apiUrl}/User/${id}`, options).pipe(
      catchError((error) => {
        throw error;
      })
    );
  }

  /**
   * Crea un nuevo usuario
   * POST /api/User
   * @param user Datos del usuario a crear
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Usuario creado
   */
  createUser(user: UserCreate, signal?: AbortSignal): Observable<IUserResponse> {
    const options: {
      headers?: HttpHeaders | { [header: string]: string | string[] };
      signal?: AbortSignal;
    } = {};
    if (signal) {
      options.signal = signal;
    }
    return this.http.post<IUserResponse>(`${this.apiUrl}/User`, user, options).pipe(
      tap((response) => {
        // Response handling if needed
      }),
      catchError((error) => {
        throw error;
      })
    );
  }

  /**
   * Actualiza un usuario existente
   * PUT /api/User/{id}
   * @param id ID del usuario a actualizar
   * @param user Datos del usuario a actualizar
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns true si se actualizó correctamente
   */
  updateUser(id: number, user: UserUpdate, signal?: AbortSignal): Observable<boolean> {
    const options: {
      headers?: HttpHeaders | { [header: string]: string | string[] };
      signal?: AbortSignal;
    } = {};
    if (signal) {
      options.signal = signal;
    }
    return this.http.put<boolean>(`${this.apiUrl}/User/${id}`, user, options).pipe(
      tap((response) => {
        // Response handling if needed
      }),
      catchError((error) => {
        throw error;
      })
    );
  }

  /**
   * Elimina un usuario
   * DELETE /api/User/{id}
   * @param id ID del usuario a eliminar
   * @returns true si se eliminó correctamente
   */
  deleteUser(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/User/${id}`).pipe(
      catchError((error) => {
        throw error;
      })
    );
  }

  /**
   * Obtiene usuarios por email
   * @param email Email del usuario
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de usuarios con ese email
   */
  getUsersByEmail(email: string, signal?: AbortSignal): Observable<IUserResponse[]> {
    return this.getUsers({ Email: email }, signal).pipe(
      tap((users) => {
        // Response handling if needed
      }),
      catchError((error) => {
        throw error;
      })
    );
  }

  /**
   * Obtiene usuarios por nombre
   * @param name Nombre del usuario
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de usuarios con ese nombre
   */
  getUsersByName(name: string, signal?: AbortSignal): Observable<IUserResponse[]> {
    return this.getUsers({ Name: name }, signal);
  }

  /**
   * Obtiene usuarios por Cognito ID
   * @param cognitoId Cognito ID del usuario
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de usuarios con ese Cognito ID
   */
  getUsersByCognitoId(cognitoId: string, signal?: AbortSignal): Observable<IUserResponse[]> {
    return this.getUsers({ CognitoId: cognitoId }, signal).pipe(
      tap((users) => {
        // Response handling if needed
      }),
      catchError((error) => {
        throw error;
      })
    );
  }

  /**
   * Obtiene usuarios con acceso web
   * @param hasWebAccess true para usuarios con acceso web, false para los que no
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de usuarios con el acceso web especificado
   */
  getUsersByWebAccess(hasWebAccess: boolean, signal?: AbortSignal): Observable<IUserResponse[]> {
    return this.getUsers({ HasWebAccess: hasWebAccess }, signal);
  }

  /**
   * Obtiene usuarios con acceso middle
   * @param hasMiddleAccess true para usuarios con acceso middle, false para los que no
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de usuarios con el acceso middle especificado
   */
  getUsersByMiddleAccess(
    hasMiddleAccess: boolean,
    signal?: AbortSignal
  ): Observable<IUserResponse[]> {
    return this.getUsers({ HasMiddleAccess: hasMiddleAccess }, signal);
  }

  /**
   * Obtiene usuarios con acceso middle ATC
   * @param hasMiddleAtcAccess true para usuarios con acceso middle ATC, false para los que no
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de usuarios con el acceso middle ATC especificado
   */
  getUsersByMiddleAtcAccess(
    hasMiddleAtcAccess: boolean,
    signal?: AbortSignal
  ): Observable<IUserResponse[]> {
    return this.getUsers({ HasMiddleAtcAccess: hasMiddleAtcAccess }, signal);
  }

  /**
   * Obtiene usuarios con acceso tour operation
   * @param hasTourOperationAccess true para usuarios con acceso tour operation, false para los que no
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de usuarios con el acceso tour operation especificado
   */
  getUsersByTourOperationAccess(
    hasTourOperationAccess: boolean,
    signal?: AbortSignal
  ): Observable<IUserResponse[]> {
    return this.getUsers({ HasTourOperationAccess: hasTourOperationAccess }, signal);
  }

  /**
   * Obtiene usuarios por Retailer ID
   * @param retailerId ID del retailer
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de usuarios con ese Retailer ID
   */
  getUsersByRetailerId(retailerId: number, signal?: AbortSignal): Observable<IUserResponse[]> {
    return this.getUsers({ RetailerId: retailerId }, signal);
  }

  /**
   * Obtiene todos los usuarios
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de todos los usuarios
   */
  getAllUsers(signal?: AbortSignal): Observable<IUserResponse[]> {
    return this.getUsers(undefined, signal);
  }

  /**
   * Crea un usuario lead solo con email (para personas que dejan email pero no se registran)
   * Usa el email como cognitoId y establece hasWebAccess: true
   * Si el usuario ya existe, lo retorna. Si no existe, lo crea.
   * IMPORTANTE: Si el usuario ya tiene un cognitoId real (registrado), no lo modifica.
   * @param email Email del usuario
   * @param fullName Nombre completo del usuario (opcional)
   * @returns Usuario creado o existente
   */
  createLeadUser(email: string, fullName?: string): Observable<IUserResponse> {
    // Validar que el email no esté vacío
    if (!email || !email.trim()) {
      return new Observable(observer => {
        observer.error(new Error('El email es requerido'));
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Primero verificar si el usuario ya existe
    return this.getUsersByEmail(normalizedEmail, undefined).pipe(
      switchMap((existingUsers) => {
        if (existingUsers && existingUsers.length > 0) {
          // Si ya existe, verificar si tiene un cognitoId real (no es un email)
          const existingUser = existingUsers[0];
          const hasRealCognitoId = existingUser.cognitoId && 
                                   existingUser.cognitoId !== normalizedEmail &&
                                   !existingUser.cognitoId.includes('@');
          
          // Si el usuario ya tiene un cognitoId real (usuario registrado), solo retornarlo
          // No actualizar nada para no interferir con el login normal
          if (hasRealCognitoId) {
            return of(existingUser);
          }
          
          // Si el usuario existe pero no tiene cognitoId real (es un lead previo),
          // actualizar el nombre si se proporcionó uno nuevo
          if (fullName && fullName.trim()) {
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || existingUser.name || '';
            const lastName = nameParts.slice(1).join(' ') || existingUser.lastName || undefined;
            
            // ✅ IMPORTANTE: Preservar TODOS los campos existentes para no perder datos
            const updateData: UserUpdate = {
              cognitoId: existingUser.cognitoId || normalizedEmail, // Mantener el email como cognitoId si no tiene uno real
              name: firstName,
              email: normalizedEmail,
              lastName: lastName,
              phone: existingUser.phone, // Preservar teléfono
              // ✅ Preservar todos los valores de acceso existentes
              hasWebAccess: existingUser.hasWebAccess ?? true,
              hasMiddleAccess: existingUser.hasMiddleAccess ?? false,
              hasMiddleAtcAccess: existingUser.hasMiddleAtcAccess ?? false,
              hasTourOperationAccess: existingUser.hasTourOperationAccess ?? false,
              retailerId: existingUser.retailerId, // Preservar retailerId
            };
            
            return this.updateUser(existingUser.id, updateData).pipe(
              switchMap(() => this.getUserById(existingUser.id, undefined))
            );
          }
          
          return of(existingUser);
        }

        // Si no existe, crear nuevo usuario lead
        const nameParts = fullName && fullName.trim() 
          ? fullName.trim().split(' ')
          : normalizedEmail.split('@');
        
        const firstName = nameParts[0] || 'Usuario';
        const lastName = nameParts.slice(1).join(' ') || undefined;

        const leadUser: UserCreate = {
          cognitoId: normalizedEmail, // Usar el email como cognitoId
          name: firstName,
          email: normalizedEmail,
          lastName: lastName,
          hasWebAccess: true, // Acceso web habilitado
          hasMiddleAccess: false,
          politicasAceptadas: false,
          detalleDeLaFuenteDeRegistro1: 'WEB_LEAD',
          retailerId: environment.retaileriddefault,
        };

        return this.createUser(leadUser);
      }),
      catchError((error) => {
        throw error;
      })
    );
  }
}
