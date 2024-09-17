import { AndroidApplication, Application, Observable } from "@nativescript/core";
const DropInRequest = com.braintreepayments.api.dropin.DropInRequest;
export function setupBraintreeAppDeligate(urlScheme) {
}
export class Braintree extends Observable {
    constructor() {
        super();
        this.output = {
            'status': 'fail',
            'msg': 'unknown',
            'nonce': '',
            'paymentMethodType': '',
            'deviceInfo': ''
        };
    }
    startPayment(token, options) {
        let t = this;
        let activity = Application.android.foregroundActivity || Application.android.startActivity;
        let dropInRequest = new DropInRequest();
        if (options.vaultManager) {
            dropInRequest.vaultManager(options.vaultManager);
        }
        if (options.amount) {
            dropInRequest.amount(options.amount);
        }
        let getIntentMethod = dropInRequest.getClass().getMethod("getIntent", [android.content.Context.class]);
        let clientTokenMethod = dropInRequest.getClass().getMethod("clientToken", [java.lang.String.class]);
        if (options.collectDeviceData) {
            dropInRequest.collectDeviceData(true);
        }
        if (options.requestThreeDSecureVerification && options.amount) {
            const ThreeDSecureRequest = com.braintreepayments.api.models.ThreeDSecureRequest;
            let threeDSecureRequest = new ThreeDSecureRequest();
            threeDSecureRequest.amount = options.amount;
            threeDSecureRequest.versionRequested = ThreeDSecureRequest.VERSION_2;
            dropInRequest
                .requestThreeDSecureVerification(true)
                .threeDSecureRequest(threeDSecureRequest);
        }
        if (options.enableGooglePay) {
            t.enableGooglePay(dropInRequest, options);
        }
        clientTokenMethod.invoke(dropInRequest, [token]);
        let dIRIntent = getIntentMethod.invoke(dropInRequest, [activity]);
        this.callIntent(dIRIntent);
    }
    callIntent(intent) {
        let t = this;
        Application.android.foregroundActivity.startActivityForResult(intent, 4949);
        Application.android.on(AndroidApplication.activityResultEvent, onResult);
        function onResult(args) {
            Application.android.off(AndroidApplication.activityResultEvent, onResult);
            t.handleResults(args.requestCode, args.resultCode, args.intent);
        }
    }
    handleResults(requestCode, resultCode, data) {
        let t = this;
        let androidAcivity = android.app.Activity;
        if (requestCode === 4949) {
            if (resultCode === androidAcivity.RESULT_OK) {
                let result = data.getParcelableExtra(com.braintreepayments.api.dropin.DropInResult.EXTRA_DROP_IN_RESULT);
                let paymentMethodNonce = result.getPaymentMethodNonce().getNonce();
                if (typeof result.paymentMethod == null) {
                    t.output.status = 'error';
                    t.output.msg = 'Nonce Value empty';
                    setTimeout(function () {
                        t.notify({
                            eventName: 'error',
                            object: t
                        });
                    });
                    return;
                }
                t.output.status = 'success';
                t.output.msg = 'Got Payment Nonce Value';
                t.output.nonce = paymentMethodNonce;
                t.output.deviceInfo = result.getDeviceData();
                t.output.paymentMethodType = result.getPaymentMethodType().getCanonicalName();
                setTimeout(function () {
                    t.notify({
                        eventName: 'success',
                        object: t
                    });
                });
            }
            else if (resultCode === androidAcivity.RESULT_CANCELED) {
                t.output.status = 'cancelled';
                t.output.msg = 'User has cancelled payment';
                setTimeout(function () {
                    t.notify({
                        eventName: 'cancel',
                        object: t
                    });
                });
            }
            else {
                let exception = data.getSerializableExtra(com.braintreepayments.api.dropin.DropInActivity.EXTRA_ERROR);
                t.output.msg = exception.getMessage();
                setTimeout(function () {
                    t.notify({
                        eventName: 'error',
                        object: t
                    });
                });
            }
        }
    }
    enableGooglePay(dropInRequest, options) {
        const GooglePaymentRequest = com.braintreepayments.api.models.GooglePaymentRequest;
        const TransactionInfo = com.google.android.gms.wallet.TransactionInfo;
        const WalletConstants = com.google.android.gms.wallet.WalletConstants;
        let googlePaymentRequest = new GooglePaymentRequest()
            .transactionInfo(TransactionInfo.newBuilder()
            .setTotalPrice(options.amount)
            .setTotalPriceStatus(WalletConstants.TOTAL_PRICE_STATUS_FINAL)
            .setCurrencyCode(options.currencyCode)
            .build())
            .billingAddressRequired(true);
        dropInRequest.googlePaymentRequest(googlePaymentRequest);
    }
}
//# sourceMappingURL=braintree.android.js.map