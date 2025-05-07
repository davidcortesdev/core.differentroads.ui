/* eslint-disable */

import CryptoJS from 'crypto-js';
import base64url from 'base64url';
import { Buffer } from 'buffer';
import { TRANSACTION_ERROR_CODES } from './constants/TRANSACTION_ERROR_CODES';
import { APPROVAL_CODES } from './constants/APPROVAL_CODES';
import { CURRENCIES } from './constants/CURRENCIES';
import { SIS_ERROR_CODES } from './constants/SIS_ERROR_CODES';
import { PaymentParams } from './interfaces/PaymentParams';
import { environment } from '../../../../../../environments/environment';

// Utility functions
function toBuffer(payload: string | Buffer, blockSize = 8): Buffer {
  if (typeof payload === 'string' || !(payload instanceof Buffer)) {
    payload = Buffer.from(payload, 'utf8');
  }
  const paddingLength = (blockSize - (payload.length % blockSize)) % blockSize;
  const align = Buffer.alloc(paddingLength, 0);
  return Buffer.concat([payload, align]);
}

function toString(buffer: Buffer, blockSize = 8): string {
  let idx = buffer.length;
  const minStart = idx - blockSize;
  while (idx >= 0 && idx >= minStart) {
    idx -= 1;
    if (buffer[idx] !== 0) {
      break;
    }
  }
  return buffer.slice(0, idx + 1).toString('utf8');
}

// Main class
class RedSys {
  private merchantSecretKey: string;

  constructor(merchantSecretKey: string) {
    if (!merchantSecretKey) {
      throw new Error('The merchant secret key is mandatory');
    }
    this.merchantSecretKey = merchantSecretKey;
  }

  makePaymentParameters(params: PaymentParams) {
    const {
      amount,
      orderReference = Date.now(),
      merchantName = '',
      merchantCode,
      currency = CURRENCIES['EUR'],
      transactionType,
      terminal = environment.redsysMerchantTerminal,
      merchantURL = '',
      successURL,
      errorURL,
    } = params;

    // Validate mandatory parameters
    if (!amount) throw new Error('The amount to charge is mandatory');
    if (!merchantCode) throw new Error('The merchant code is mandatory');
    if (!transactionType) throw new Error('The transaction type is mandatory');
    if (!successURL) throw new Error('The successURL is mandatory');
    if (!errorURL) throw new Error('The errorURL is mandatory');

    // Construct parameters object
    const paramsObj = {
      DS_MERCHANT_AMOUNT: String(amount),
      DS_MERCHANT_ORDER: orderReference,
      DS_MERCHANT_MERCHANTNAME: merchantName,
      DS_MERCHANT_MERCHANTCODE: merchantCode,
      DS_MERCHANT_CURRENCY: currency,
      DS_MERCHANT_TRANSACTIONTYPE: transactionType,
      DS_MERCHANT_TERMINAL: terminal,
      DS_MERCHANT_MERCHANTURL: merchantURL,
      DS_MERCHANT_URLOK: successURL,
      DS_MERCHANT_URLKO: errorURL,
    };

    // Encode parameters and generate signature
    const Ds_MerchantParameters = Buffer.from(
      JSON.stringify(paramsObj)
    ).toString('base64');
    const derivateKey = this.encrypt(String(orderReference));
    const Ds_Signature = this.sign(Ds_MerchantParameters, derivateKey);

    return {
      Ds_SignatureVersion: 'HMAC_SHA256_V1',
      Ds_MerchantParameters,
      Ds_Signature,
    };
  }

  checkResponseParameters(strPayload: string, givenSignature: string) {
    if (!strPayload) throw new Error('The payload parameter is required');
    if (typeof strPayload !== 'string')
      throw new Error('Payload must be a base-64 encoded string');
    if (!givenSignature) throw new Error('The signature is required');

    const merchantParams = JSON.parse(base64url.decode(strPayload));
    if (!merchantParams || !merchantParams.Ds_Order) return null;

    for (const field in merchantParams) {
      merchantParams[field] = decodeURIComponent(merchantParams[field]);
    }

    const derivateKey = this.encrypt(merchantParams.Ds_Order);
    const localSignature = this.sign(strPayload, derivateKey);

    return base64url.toBase64(givenSignature) === localSignature
      ? merchantParams
      : null;
  }

  static getResponseCodeMessage(code: string): string | null {
    if (!code || typeof code !== 'string') return null;
    code = code.replace(/^0*/, '');

    return (
      APPROVAL_CODES[code] ||
      TRANSACTION_ERROR_CODES[code] ||
      SIS_ERROR_CODES[code] ||
      null
    );
  }

  private encrypt(strPayload: string): string {
    const key = CryptoJS.enc.Base64.parse(this.merchantSecretKey);
    const iv = CryptoJS.enc.Hex.parse('0000000000000000');
    const encrypted = CryptoJS.TripleDES.encrypt(
      toBuffer(strPayload).toString('utf8'),
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.NoPadding,
      }
    );
    return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  }

  private sign(strPayload: string, strKey: string): string {
    if (typeof strPayload !== 'string' || typeof strKey !== 'string')
      throw new Error('Invalid parameters');

    const hmac = CryptoJS.HmacSHA256(
      strPayload,
      CryptoJS.enc.Base64.parse(strKey)
    );
    return CryptoJS.enc.Base64.stringify(hmac);
  }
}

export default RedSys;
