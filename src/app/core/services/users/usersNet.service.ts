import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
   * @returns Lista de usuarios
   */
  getUsers(filters?: UserFilter): Observable<IUserResponse[]> {
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

    return this.http
      .get<IUserResponse[]>(`${this.apiUrl}/User`, { params })
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
   * @returns Datos del usuario
   */
  getUserById(id: number): Observable<IUserResponse> {
    return this.http.get<IUserResponse>(`${this.apiUrl}/User/${id}`).pipe(
      catchError((error) => {
        throw error;
      })
    );
  }

  /**
   * Crea un nuevo usuario
   * POST /api/User
   * @param user Datos del usuario a crear
   * @returns Usuario creado
   */
  createUser(user: UserCreate): Observable<IUserResponse> {
    return this.http.post<IUserResponse>(`${this.apiUrl}/User`, user).pipe(
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
   * @returns true si se actualizó correctamente
   */
  updateUser(id: number, user: UserUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.apiUrl}/User/${id}`, user).pipe(
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
   * @returns Lista de usuarios con ese email
   */
  getUsersByEmail(email: string): Observable<IUserResponse[]> {
    return this.getUsers({ Email: email }).pipe(
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
   * @returns Lista de usuarios con ese nombre
   */
  getUsersByName(name: string): Observable<IUserResponse[]> {
    return this.getUsers({ Name: name });
  }

  /**
   * Obtiene usuarios por Cognito ID
   * @param cognitoId Cognito ID del usuario
   * @returns Lista de usuarios con ese Cognito ID
   */
  getUsersByCognitoId(cognitoId: string): Observable<IUserResponse[]> {
    return this.getUsers({ CognitoId: cognitoId }).pipe(
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
   * @returns Lista de usuarios con el acceso web especificado
   */
  getUsersByWebAccess(hasWebAccess: boolean): Observable<IUserResponse[]> {
    return this.getUsers({ HasWebAccess: hasWebAccess });
  }

  /**
   * Obtiene usuarios con acceso middle
   * @param hasMiddleAccess true para usuarios con acceso middle, false para los que no
   * @returns Lista de usuarios con el acceso middle especificado
   */
  getUsersByMiddleAccess(
    hasMiddleAccess: boolean
  ): Observable<IUserResponse[]> {
    return this.getUsers({ HasMiddleAccess: hasMiddleAccess });
  }

  /**
   * Obtiene usuarios con acceso middle ATC
   * @param hasMiddleAtcAccess true para usuarios con acceso middle ATC, false para los que no
   * @returns Lista de usuarios con el acceso middle ATC especificado
   */
  getUsersByMiddleAtcAccess(
    hasMiddleAtcAccess: boolean
  ): Observable<IUserResponse[]> {
    return this.getUsers({ HasMiddleAtcAccess: hasMiddleAtcAccess });
  }

  /**
   * Obtiene usuarios con acceso tour operation
   * @param hasTourOperationAccess true para usuarios con acceso tour operation, false para los que no
   * @returns Lista de usuarios con el acceso tour operation especificado
   */
  getUsersByTourOperationAccess(
    hasTourOperationAccess: boolean
  ): Observable<IUserResponse[]> {
    return this.getUsers({ HasTourOperationAccess: hasTourOperationAccess });
  }

  /**
   * Obtiene usuarios por Retailer ID
   * @param retailerId ID del retailer
   * @returns Lista de usuarios con ese Retailer ID
   */
  getUsersByRetailerId(retailerId: number): Observable<IUserResponse[]> {
    return this.getUsers({ RetailerId: retailerId });
  }

  /**
   * Obtiene todos los usuarios
   * @returns Lista de todos los usuarios
   */
  getAllUsers(): Observable<IUserResponse[]> {
    return this.getUsers();
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
    return this.getUsersByEmail(normalizedEmail).pipe(
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
              switchMap(() => this.getUserById(existingUser.id))
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
        console.error('❌ Error creando usuario lead:', error);
        throw error;
      })
    );
  }
}
