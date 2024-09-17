import { Application } from "@nativescript/core";
export function getAppDelegate() {
    if (Application.ios.delegate === undefined) {
        var UIApplicationDelegateImpl = /** @class */ (function (_super) {
    __extends(UIApplicationDelegateImpl, _super);
    function UIApplicationDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UIApplicationDelegateImpl.new = function () {
        return _super.new.call(this);
    };
    UIApplicationDelegateImpl.ObjCProtocols = [UIApplicationDelegate];
    return UIApplicationDelegateImpl;
}(UIResponder));
        Application.ios.delegate = UIApplicationDelegateImpl;
    }
    return Application.ios.delegate;
}
export function enableMultipleOverridesFor(classRef, methodName, nextImplementation) {
    const currentImplementation = classRef.prototype[methodName];
    classRef.prototype[methodName] = function () {
        const result = currentImplementation && currentImplementation.apply(currentImplementation, Array.from(arguments));
        return nextImplementation.apply(nextImplementation, Array.from(arguments).concat([result]));
    };
}
export function setupAppDeligate(urlScheme) {
    let appDelegate = getAppDelegate();
    enableMultipleOverridesFor(appDelegate, 'applicationDidFinishLaunchingWithOptions', function (application, launchOptions) {
        try {
            BTAppSwitch.setReturnURLScheme(urlScheme);
            return true;
        }
        catch (error) {
            console.log(error);
        }
        return false;
    });
    enableMultipleOverridesFor(appDelegate, 'applicationOpenURLSourceApplicationAnnotation', function (application, url, sourceApplication, annotation) {
        try {
            if (url.scheme === urlScheme) {
                BTAppSwitch.handleOpenURLSourceApplication(url, sourceApplication);
                return true;
            }
        }
        catch (error) {
            console.log(error);
        }
        return false;
    });
}
//# sourceMappingURL=getappdelegate.js.map