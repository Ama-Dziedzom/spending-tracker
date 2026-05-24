package com.ama.spendingtracker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.provider.Telephony
import androidx.core.app.NotificationCompat
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread
import org.json.JSONObject

/**
 * Android background BroadcastReceiver that intercepts incoming bank/MoMo SMS messages
 * and automatically logs them to the Express backend in a secure, multi-tenant manner.
 */
class SmsReceiver : BroadcastReceiver() {
    private val PREFS_NAME = "spending_tracker_prefs"
    private val CHANNEL_ID = "transaction_logs_channel"
    private val NOTIFICATION_ID = 1001

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        val rawSms = msgs.map { it.messageBody }.joinToString("")
        val sender = msgs.firstOrNull()?.originatingAddress ?: ""

        // Lightweight check: only parse potential transaction messages
        val lowerSms = rawSms.toLowerCase()
        val keywords = listOf("received", "sent", "debited", "credited", "payment", "momo", "ghs", "transferred", "withdrew", "balance")
        val isTransaction = keywords.any { lowerSms.contains(it) }

        if (!isTransaction) return

        // Keep the BroadcastReceiver alive during background execution
        val pendingResult = goAsync()

        thread {
            try {
                val sharedPref = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val apiUrl = sharedPref.getString("api_url", "https://spending-tracker-api-production-cea1.up.railway.app") ?: ""
                val defaultAccountId = sharedPref.getString("default_account_id", "") ?: ""
                val supabaseUrl = sharedPref.getString("supabase_url", "https://whzfxrxstxcnokiarbbi.supabase.co") ?: ""
                val supabaseAnonKey = sharedPref.getString("supabase_anon_key", "") ?: ""

                var authToken = sharedPref.getString("auth_token", "") ?: ""
                var refreshToken = sharedPref.getString("refresh_token", "") ?: ""

                if (authToken.isEmpty()) {
                    showNotification(context, "⚠️ LogIt Auth Needed", "You are signed out. Open LogIt to enable auto-logging.")
                    pendingResult.finish()
                    return@thread
                }

                // ── Step 1: POST to backend ──────────────────────────────────
                var logResult = postTransaction(apiUrl, authToken, rawSms, defaultAccountId)

                // ── Step 2: Auto-refresh token if 401 Unauthorized ────────────
                if (logResult.statusCode == 401 && refreshToken.isNotEmpty() && supabaseAnonKey.isNotEmpty()) {
                    val refreshSuccess = refreshSupabaseToken(context, supabaseUrl, supabaseAnonKey, refreshToken)
                    if (refreshSuccess) {
                        // Reload refreshed token and retry POST
                        authToken = sharedPref.getString("auth_token", "") ?: ""
                        logResult = postTransaction(apiUrl, authToken, rawSms, defaultAccountId)
                    }
                }

                // ── Step 3: Handle Final Result ──────────────────────────────
                if (logResult.statusCode in 200..299) {
                    showNotification(context, "Logged Successfully", logResult.responseBody)
                } else if (logResult.statusCode == 400) {
                    // Failed parse (e.g. valid format but not matches templates) - log silently or ignore
                    showNotification(context, "⚠️ Transaction Not Logged", "SMS received but no registered pattern matched.")
                } else {
                    showNotification(context, "❌ Logging Failed", "Server returned status ${logResult.statusCode}")
                }
            } catch (e: Exception) {
                showNotification(context, "❌ Error Auto-Logging Transaction", e.localizedMessage ?: "Unknown error")
            } finally {
                pendingResult.finish()
            }
        }
    }

    private data class RequestResult(val statusCode: Int, val responseBody: String)

    private fun postTransaction(apiUrl: String, token: String, rawSms: String, accountId: String): RequestResult {
        val targetUrl = URL("$apiUrl/process-sms")
        val conn = targetUrl.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Authorization", "Bearer $token")
        conn.doOutput = true

        val jsonBody = JSONObject().apply {
            put("rawSms", rawSms)
            if (accountId.isNotEmpty()) {
                put("accountId", accountId)
            }
        }

        OutputStreamWriter(conn.outputStream).use { writer ->
            writer.write(jsonBody.toString())
            writer.flush()
        }

        val statusCode = conn.responseCode
        val stream = if (statusCode in 200..299) conn.inputStream else conn.errorStream
        val responseBody = BufferedReader(InputStreamReader(stream)).use { reader ->
            reader.readText()
        }

        return RequestResult(statusCode, responseBody)
    }

    private fun refreshSupabaseToken(context: Context, supabaseUrl: String, anonKey: String, refreshToken: String): Boolean {
        return try {
            val targetUrl = URL("$supabaseUrl/auth/v1/token?grant_type=refresh_token")
            val conn = targetUrl.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", anonKey)
            conn.doOutput = true

            val jsonBody = JSONObject().apply {
                put("refresh_token", refreshToken)
            }

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(jsonBody.toString())
                writer.flush()
            }

            if (conn.responseCode == 200) {
                val response = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
                val json = JSONObject(response)
                val newAccessToken = json.getString("access_token")
                val newRefreshToken = json.getString("refresh_token")

                val sharedPref = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                sharedPref.edit().apply {
                    putString("auth_token", newAccessToken)
                    putString("refresh_token", newRefreshToken)
                    apply()
                }
                true
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    private fun showNotification(context: Context, title: String, message: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "MoMo Transaction Logs", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Notifies when incoming SMS transactions are automatically parsed and logged."
            }
            notificationManager.createNotificationChannel(channel)
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setContentTitle(title)
            .setContentText(message.split("\n").firstOrNull()) // Show first line in collapsed view
            .setStyle(NotificationCompat.BigTextStyle().bigText(message)) // Show full text in expanded view
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        notificationManager.notify((System.currentTimeMillis() % 100000).toInt(), builder.build())
    }
}
