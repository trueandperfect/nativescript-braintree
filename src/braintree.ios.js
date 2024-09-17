import { Observable } from "@nativescript/core";
const setupAppDeligate = require('./getappdelegate').setupAppDeligate;
export function setupBraintreeAppDeligate(urlScheme) {
    setupAppDeligate(urlScheme);
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
        let request = BTDropInRequest.alloc().init();
        if (options.vaultManager) {
            request.vaultManager = options.vaultManager;
        }
        if (options.amount) {
            request.amount = options.amount;
        }
        if (options.collectDeviceData) {
            request.collectDeviceData = true;
        }
        if (options.requestThreeDSecureVerification && options.amount) {
            let threeDSecureRequest = BTThreeDSecureRequest.alloc().init();
            threeDSecureRequest.amount = NSDecimalNumber.decimalNumberWithString(options.amount);
            threeDSecureRequest.versionRequested = BTThreeDSecureVersion.Version2;
            request.threeDSecureVerification = true;
            request.threeDSecureRequest = threeDSecureRequest;
        }
        let dropIn = BTDropInController.alloc().initWithAuthorizationRequestHandler(token, request, (controller, result, error) => {
            if (error !== null) {
                setTimeout(() => {
                    this.notify({
                        eventName: 'error',
                        object: this
                    });
                });
            }
            else if (result.cancelled) {
                this.output.status = 'cancelled';
                this.output.msg = 'User has cancelled payment';
                setTimeout(() => {
                    this.notify({
                        eventName: 'cancel',
                        object: this
                    });
                });
            }
            else {
                if (typeof result.paymentMethod == null) {
                    this.output.status = 'error';
                    this.output.msg = 'Nonce Value empty';
                    setTimeout(() => {
                        this.notify({
                            eventName: 'error',
                            object: this
                        });
                    });
                    return;
                }
                if (result.paymentDescription === "Apple Pay") {
                    let request = PKPaymentRequest.alloc().init();
                    request.paymentSummaryItems = options.applePayPaymentRequest.paymentSummaryItems;
                    request.countryCode = options.applePayPaymentRequest.countryCode;
                    request.currencyCode = options.applePayPaymentRequest.currencyCode;
                    request.merchantIdentifier = options.applePayPaymentRequest.merchantIdentifier;
                    request.merchantCapabilities = options.applePayPaymentRequest.merchantCapabilities;
                    request.supportedNetworks = options.applePayPaymentRequest.supportedNetworks;
                    console.log(`canMakePayments(): ${PKPaymentAuthorizationViewController.canMakePayments()}`);
                    console.log(`canMakePaymentsUsingNetworks(): ${PKPaymentAuthorizationViewController.canMakePaymentsUsingNetworks(request.supportedNetworks)}`);
                    console.log(`canMakePaymentsUsingNetworksCapabilities(): ${PKPaymentAuthorizationViewController.canMakePaymentsUsingNetworksCapabilities(request.supportedNetworks, request.merchantCapabilities)}`);
                    let applePayController = PKPaymentAuthorizationViewController.alloc().initWithPaymentRequest(request);
                    let pkPaymentDelegateImpl = new PKPaymentAuthorizationViewControllerDelegateImpl();
                    let applePayClient = new BTApplePayClient(dropIn.apiClient);
                    pkPaymentDelegateImpl.applePayClient = applePayClient;
                    pkPaymentDelegateImpl.braintree = this;
                    try {
                        applePayController.delegate = pkPaymentDelegateImpl;
                    }
                    catch (error) {
                        console.log(`Initialization of PKPaymentAuthorizationViewController failed`);
                        let alertController = UIAlertController.alertControllerWithTitleMessagePreferredStyle("Error", "An error has occurred, please try again or use a different payment method.", 1);
                        alertController.addAction(UIAlertAction.actionWithTitleStyleHandler("Ok", 0, null));
                        controller.presentViewControllerAnimatedCompletion(alertController, true, null);
                        return;
                    }
                    console.log(`applePayController: ${applePayController}`);
                    console.log(`delegateImpl: ${pkPaymentDelegateImpl}`);
                    this.dropInController = controller;
                    controller.presentViewControllerAnimatedCompletion(applePayController, true, () => {
                    });
                    return;
                }
                else {
                    this.output.nonce = result.paymentMethod.nonce;
                    this.output.paymentMethodType = result.paymentMethod.type;
                    this.output.status = 'success';
                    this.output.msg = 'Got Payment Nonce Value';
                    this.output.deviceInfo = PPDataCollector.collectPayPalDeviceData();
                    setTimeout(() => {
                        this.notify({
                            eventName: 'success',
                            object: this
                        });
                    });
                }
            }
            controller.dismissViewControllerAnimatedCompletion(true, null);
        });
        let app = UIApplication.sharedApplication;
        app.keyWindow.rootViewController.presentViewControllerAnimatedCompletion(dropIn, true, null);
    }
    submitApplePayment(applePayNonce) {
        this.output.nonce = applePayNonce;
        this.output.paymentMethodType = "18";
        this.output.status = 'success';
        this.output.msg = 'Got Payment Nonce Value';
        this.output.deviceInfo = PPDataCollector.collectPayPalDeviceData();
        this.dropInController.dismissViewControllerAnimatedCompletion(true, null);
        setTimeout(() => {
            this.notify({
                eventName: 'success',
                object: this
            });
        });
    }
}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PKPaymentAuthorizationViewControllerDelegateImpl = void 0;
var PKPaymentAuthorizationViewControllerDelegateImpl = /** @class */ (function (_super) {
    __extends(PKPaymentAuthorizationViewControllerDelegateImpl, _super);
    function PKPaymentAuthorizationViewControllerDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerDidAuthorizePaymentCompletion = function (controller, payment, completion) {
        var _this = this;
        console.log("PaymentAuthorizationViewController Did Authorize Payment Completion executing");
        this.applePayClient.tokenizeApplePayPaymentCompletion(payment, function (nonce, error) {
            if (nonce) {
                _this.nonce = nonce;
                completion(PKPaymentAuthorizationStatus.Success);
            }
            else {
                completion(PKPaymentAuthorizationStatus.Failure);
                console.dir("#####################");
                console.log("error: " + error);
                console.dir("#####################");
            }
        });
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerDidAuthorizePaymentHandler = function (controller, payment, completion) {
        var _this = this;
        console.log("PaymentAuthorizationViewController Did Authorize Payment Handler executing");
        var result = PKPaymentAuthorizationResult.alloc().init();
        this.applePayClient.tokenizeApplePayPaymentCompletion(payment, function (nonce, error) {
            if (nonce) {
                _this.nonce = nonce;
                result.status = PKPaymentAuthorizationStatus.Success;
                completion(result);
            }
            else {
                result.status = PKPaymentAuthorizationStatus.Failure;
                completion(result);
                console.dir("#####################");
                console.log("error: " + error);
                console.dir("#####################");
            }
        });
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerDidFinish = function (controller) {
        console.log("paymentAuthorizationViewControllerDidFinish(" + controller + ")");
        if (!this.nonce) {
            controller.dismissViewControllerAnimatedCompletion(true, null);
        }
        else {
            this.braintree.submitApplePayment(this.nonce.nonce);
            this.braintree.dropInController.dismissViewControllerAnimatedCompletion(true, null);
        }
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerDidSelectPaymentMethodCompletion = function (controller, paymentMethod, completion) {
        console.log("paymentAuthorizationViewControllerDidSelectPaymentMethodCompletion Method not implemented 4.");
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerDidSelectPaymentMethodHandler = function (controller, paymentMethod, completion) {
        var paymentMethodUpdate = PKPaymentRequestPaymentMethodUpdate.alloc().init();
        completion(paymentMethodUpdate);
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerDidSelectShippingAddressCompletion = function (controller, address, completion) {
        console.log("paymentAuthorizationViewControllerDidSelectShippingAddressCompletion Method not implemented 6.");
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerDidSelectShippingContactCompletion = function (controller, contact, completion) {
        console.log("paymentAuthorizationViewControllerDidSelectShippingAddressCompletion Method not implemented 7.");
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerDidSelectShippingContactHandler = function (controller, contact, completion) {
        console.log("paymentAuthorizationViewControllerDidSelectShippingContactHandler Method not implemented 8.");
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerDidSelectShippingMethodCompletion = function (controller, shippingMethod, completion) {
        console.log("paymentAuthorizationViewControllerDidSelectShippingMethodCompletion Method not implemented 9.");
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerDidSelectShippingMethodHandler = function (controller, shippingMethod, completion) {
        console.log("paymentAuthorizationViewControllerDidSelectShippingMethodHandler Method not implemented 10.");
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.prototype.paymentAuthorizationViewControllerWillAuthorizePayment = function (controller) {
        console.log("paymentAuthorizationViewControllerWillAuthorizePayment Method not implemented 11.");
    };
    PKPaymentAuthorizationViewControllerDelegateImpl.ObjCProtocols = [PKPaymentAuthorizationViewControllerDelegate];
    return PKPaymentAuthorizationViewControllerDelegateImpl;
}(NSObject));
exports.PKPaymentAuthorizationViewControllerDelegateImpl = PKPaymentAuthorizationViewControllerDelegateImpl;
//# sourceMappingURL=braintree.ios.js.map