import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { ScalapayOrderRequest } from '../../../models/scalapay/ScalapayOrderRequest';
import { ScalapayOrderResponse } from '../../../models/scalapay/ScalapayOrderResponse';
import { ScalapayGetOrdersDetailsResponse } from '../../../models/scalapay/ScalapayGetOrdersDetailsResponse';
import { ScalapayCaptureOrderRequest } from '../../../models/scalapay/ScalapayCaptureOrderRequest';
import { ScalapayCaptureOrderRespone } from '../../../models/scalapay/ScalapayCaptureOrderRespone';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ScalapayService {
  private readonly API_URL = environment.scalapayApiUrl;
  private readonly API_KEY = environment.scalapayApiKey;

  constructor(private http: HttpClient) {}

  /**
   * Configura las cabeceras HTTP para las peticiones a la API de Scalapay
   * @returns Opciones HTTP con cabeceras configuradas
   */
  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${this.API_KEY}`,
      }),
    };
  }

  /**
   * Verifica que las variables de entorno necesarias estén definidas
   * @returns Promise rechazado si las variables no están definidas
   */
  private validateEnvironment(): Promise<void> {
    if (!this.API_URL || !this.API_KEY) {
      console.error(
        'Variables de entorno scalapayApiUrl o scalapayApiKey no definidas'
      );
      return Promise.reject('Variables de entorno no definidas');
    }
    return Promise.resolve();
  }

  /**
   * Crea una nueva orden en Scalapay
   * @param orderData Datos de la orden a crear
   * @returns Promise con la respuesta de la creación de la orden
   */
  createOrder(orderData: ScalapayOrderRequest): Promise<ScalapayOrderResponse> {
    this.validateEnvironment();

    const url = `${this.API_URL}/v2/orders`;
    console.log('Solicitando URL de Scalapay:', url);
    console.log('Payload de la solicitud:', JSON.stringify(orderData, null, 2));

    return this.http
      .post<ScalapayOrderResponse>(url, orderData, this.getHttpOptions())
      .toPromise()
      .then((response) => {
        console.log('Respuesta exitosa:', response);
        if (!response) {
          throw new Error('No se recibió respuesta');
        }
        return response;
      })
      .catch((error) => {
        console.error('Detalles del error:', error);
        console.error('Estado del error:', error.status);
        console.error('Mensaje de error:', error.message);
        if (error.error) {
          console.error('Respuesta del servidor:', error.error);
        }
        throw error;
      });
  }

  /**
   * Captura un pago en Scalapay
   * @param captureData Datos para capturar la orden
   * @returns Observable con la respuesta de la captura del pago
   */
  captureOrder(captureData: ScalapayCaptureOrderRequest): Observable<ScalapayCaptureOrderRespone> {
    this.validateEnvironment();

    const url = `${this.API_URL}/v2/payments/capture`;
    return from(
      this.http
        .post<ScalapayCaptureOrderRespone>(url, captureData, this.getHttpOptions())
        .toPromise()
        .then((response) => {
          if (!response) {
            throw new Error('No se recibió respuesta');
          }
          return response;
        })
        .catch((error) => {
          console.error('Error al procesar la orden:', error);
          throw error;
        })
    );
  }

  /**
   * Obtiene los detalles de una orden específica
   * @param orderToken Token de la orden a consultar
   * @returns Observable con los detalles de la orden
   */
  getOrderDetails(orderToken: string): Observable<ScalapayGetOrdersDetailsResponse> {
    this.validateEnvironment();

    const url = `${this.API_URL}/v2/orders/${orderToken}`;
    return from(
      this.http
        .get<ScalapayGetOrdersDetailsResponse>(url, this.getHttpOptions())
        .toPromise()
        .then((response) => {
          if (!response) {
            throw new Error('No se recibió respuesta');
          }
          return response;
        })
        .catch((error) => {
          console.error('Error al obtener detalles de la orden:', error);
          throw error;
        })
    );
  }

  /**
   * Obtiene los detalles de un pago específico
   * @param paymentId ID del pago a consultar
   * @returns Promise con los detalles del pago
   */
  getPaymentDetails(paymentId: string): Promise<any> {
    this.validateEnvironment();

    const url = `${this.API_URL}/v2/payments/${paymentId}`;
    return this.http
      .get<any>(url, this.getHttpOptions())
      .toPromise()
      .then((response) => {
        if (!response) {
          throw new Error('No se recibió respuesta');
        }
        return response;
      })
      .catch((error) => {
        console.error('Error al procesar la orden:', error);
        throw error;
      });
  }
}
