package com.ama.spendingtracker

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes SharedPreferences to React Native side so that the JavaScript code
 * can sync Supabase sessions securely for the background SMS receiver.
 */
class AppGroupBridge(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val PREFS_NAME = "spending_tracker_prefs"
    private val sharedPref: SharedPreferences = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    override fun getName(): String {
        return "AppGroupBridge"
    }

    @ReactMethod
    fun setItem(key: String, value: String) {
        sharedPref.edit().putString(key, value).apply()
    }

    @ReactMethod
    fun removeItem(key: String) {
        sharedPref.edit().remove(key).apply()
    }
}
