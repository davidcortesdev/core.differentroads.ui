import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ScalapayOrderRequest } from '../../../models/scalapay/ScalapayOrderRequest';
import { ScalapayOrderResponse } from '../../../models/scalapay/ScalapayOrderResponse';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ScalapayService {
  //private readonly API_URL = environment.scalapayApiUrl;
  //private readonly API_KEY = environment.scalapayApiKey;

  private readonly API_URL = '/scalapay-api';
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
        'Environment variables scalapayApiUrl or scalapayApiKey are not defined'
      );
      return Promise.reject('Environment variables not defined');
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
    console.log('Requesting Scalapay URL:', url);
    console.log('Request payload:', JSON.stringify(orderData, null, 2));
    
    return this.http
      .post<ScalapayOrderResponse>(url, orderData, this.getHttpOptions())
      .toPromise()
      .then((response) => {
        console.log('Successful response:', response);
        if (!response) {
          throw new Error('No response received');
        }
        return response;
      })
      .catch((error) => {
        console.error('Error details:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        if (error.error) {
          console.error('Server response:', error.error);
        }
        throw error;
      });
  }

    /**
   * Captura un pago en Scalapay
   * @param paymentData Datos del pago a capturar
   * @returns Promise con la respuesta de la captura del pago
   */
  capturePayment(paymentData: any): Promise<any> {
    this.validateEnvironment();

    const url = `${this.API_URL}/v2/payments/capture`;
    return this.http
      .post<any>(url, paymentData, this.getHttpOptions())
      .toPromise()
      .then((response) => {
        if (!response) {
          throw new Error('No response received');
        }
        return response;
      })
      .catch((error) => {
        console.error('Error processing order:', error);
        throw error;
      });
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
          throw new Error('No response received');
        }
        return response;
      })
      .catch((error) => {
        console.error('Error processing order:', error);
        throw error;
      });
  }
}
