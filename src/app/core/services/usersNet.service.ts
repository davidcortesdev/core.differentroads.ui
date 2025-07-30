import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  IUserResponse, 
  UserCreate, 
  UserUpdate, 
  UserFilter 
} from '../models/users/user.model';

@Injectable({
  providedIn: 'root'
})
export class UsersNetService {
  private apiUrl = environment.usersApiUrl;

  constructor(private http: HttpClient) { }

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
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<IUserResponse[]>(`${this.apiUrl}/User`, { params }).pipe(
      catchError(error => {
        console.error('❌ Error fetching users:', error);
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
      catchError(error => {
        console.error(`❌ Error getting user by ID ${id}:`, error);
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
    console.log('🚀 UsersNetService.createUser() ejecutándose...');
    console.log('📝 URL de la petición:', `${this.apiUrl}/User`);
    console.log('📝 Datos del usuario:', user);
    
    return this.http.post<IUserResponse>(`${this.apiUrl}/User`, user).pipe(
      tap(response => {
        console.log('✅ UsersNetService.createUser() - Respuesta exitosa:', response);
      }),
      catchError(error => {
        console.error('❌ UsersNetService.createUser() - Error:', error);
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
    console.log('🚀 UsersNetService.updateUser() ejecutándose...');
    console.log('📝 URL de la petición:', `${this.apiUrl}/User/${id}`);
    console.log('📝 Datos de actualización:', user);
    
    return this.http.put<boolean>(`${this.apiUrl}/User/${id}`, user).pipe(
      tap(response => {
        console.log('✅ UsersNetService.updateUser() - Respuesta exitosa:', response);
      }),
      catchError(error => {
        console.error(`❌ UsersNetService.updateUser() - Error:`, error);
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
      catchError(error => {
        console.error(`❌ Error deleting user ${id}:`, error);
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
    console.log('🔍 UsersNetService.getUsersByEmail() ejecutándose...');
    console.log('📝 Email a buscar:', email);
    
    return this.getUsers({ Email: email }).pipe(
      tap(users => {
        console.log('✅ UsersNetService.getUsersByEmail() - Usuarios encontrados:', users);
      }),
      catchError(error => {
        console.error('❌ UsersNetService.getUsersByEmail() - Error:', error);
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
    console.log('🔍 UsersNetService.getUsersByCognitoId() ejecutándose...');
    console.log('📝 Cognito ID a buscar:', cognitoId);
    
    return this.getUsers({ CognitoId: cognitoId }).pipe(
      tap(users => {
        console.log('✅ UsersNetService.getUsersByCognitoId() - Usuarios encontrados:', users);
      }),
      catchError(error => {
        console.error('❌ UsersNetService.getUsersByCognitoId() - Error:', error);
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
  getUsersByMiddleAccess(hasMiddleAccess: boolean): Observable<IUserResponse[]> {
    return this.getUsers({ HasMiddleAccess: hasMiddleAccess });
  }

  /**
   * Obtiene todos los usuarios
   * @returns Lista de todos los usuarios
   */
  getAllUsers(): Observable<IUserResponse[]> {
    return this.getUsers();
  }
} 