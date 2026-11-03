#import <React/RCTBridgeModule.h>

// Exposes AppGroupBridge.swift to the JS side via NativeModules.AppGroupBridge
@interface RCT_EXTERN_MODULE(AppGroupBridge, NSObject)

RCT_EXTERN_METHOD(setItem:(NSString *)key value:(NSString *)value)
RCT_EXTERN_METHOD(removeItem:(NSString *)key)

@end

// Read-only companion (NativeModules.AppGroupReader): lets the app pick up a
// session that the Share Extension refreshed while the app was closed.
// Written in Objective-C so it needs no Swift bridging-header changes.
@interface AppGroupReader : NSObject <RCTBridgeModule>
@end

@implementation AppGroupReader

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup { return NO; }

RCT_EXPORT_METHOD(getItem:(NSString *)key
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *defaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.com.ama.spendingtracker"];
  resolve([defaults stringForKey:key]);
}

@end
