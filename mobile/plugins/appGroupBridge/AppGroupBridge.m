#import <React/RCTBridgeModule.h>

// Exposes AppGroupBridge.swift to the JS side via NativeModules.AppGroupBridge
RCT_EXTERN_MODULE(AppGroupBridge, NSObject)
RCT_EXTERN_METHOD(setItem:(NSString *)key value:(NSString *)value)
RCT_EXTERN_METHOD(removeItem:(NSString *)key)
