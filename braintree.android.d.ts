import { Observable } from "@nativescript/core";
export declare function setupBraintreeAppDeligate(urlScheme: any): void;
export declare class Braintree extends Observable {
    output: {
        status: string;
        msg: string;
        nonce: string;
        paymentMethodType: string;
        deviceInfo: string;
    };
    constructor();
    startPayment(token: any, options: BrainTreeOptions): void;
    private callIntent;
    private handleResults;
    private enableGooglePay;
}
export interface BrainTreeOptions {
    amount: string;
    collectDeviceData?: boolean;
    requestThreeDSecureVerification?: boolean;
    enableGooglePay?: boolean;
    currencyCode?: string;
    vaultManager?: boolean;
}
