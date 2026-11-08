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
import org.json.JSONArray
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

        // Only look at messages that are very likely money movements
        if (!isLikelyTransaction(sender, rawSms)) return

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

                // ── Step 0: Send anything saved while offline ───────────────
                flushPending(context, apiUrl, authToken, defaultAccountId)

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
                    describeLogged(logResult.responseBody)?.let { showNotification(context, it.first, it.second) }
                } else if (logResult.statusCode == 400) {
                    // Couldn't read it: the API saved it to "Needs review" in the app. Stay quiet.
                } else {
                    showNotification(context, "❌ Logging Failed", "Server returned status ${logResult.statusCode}")
                }
            } catch (e: java.io.IOException) {
                // No connection (or it dropped mid-request): keep the message and
                // send it next time. The API ignores duplicates, so retrying is safe.
                enqueuePending(context, rawSms)
                showNotification(context, "Saved offline", "LogIt will log this when you're back online.")
            } catch (e: Exception) {
                showNotification(context, "❌ Error Auto-Logging Transaction", e.localizedMessage ?: "Unknown error")
            } finally {
                pendingResult.finish()
            }
        }
    }

    private data class RequestResult(val statusCode: Int, val responseBody: String)

    // Sender IDs used by Ghanaian MoMo providers and banks (lower-case, partial match).
    private val knownSenders = listOf(
        "mobilemoney", "momo", "mtn", "t-cash", "tcash", "telecel", "vodafone",
        "airteltigo", "atmoney", "at money", "stanchart", "standard", "scb", "gcb", "uba",
        "absa", "ecobank", "fidelity", "calbank", "cbg", "zenith", "access", "stanbic",
        "republic", "prudential", "gtbank", "fbn", "societe", "adb", "nib", "omnibsic",
        "consolidated", "first atlantic", "bank"
    )

    private val otpRegex = Regex("\\b(otp|one[- ]time|verification code|your code is|pin is)\\b")
    private val amountRegex = Regex("(ghs|gh₵|ghc)\\s?[\\d,]+")
    private val movementRegex = Regex("\\b(debited|credited|received|sent|paid|payment|cash out|withdraw|transfer)")
    private val balanceRegex = Regex("\\b(balance|bal|avail)")

    /**
     * True when the SMS is very likely a money movement:
     * - from a known MoMo/bank sender and mentions an amount, or
     * - from any sender but reads strongly like a transaction alert
     *   (amount + movement word + balance), so unfamiliar banks still work.
     * One-time codes are ignored.
     */
    private fun isLikelyTransaction(sender: String, body: String): Boolean {
        val s = sender.lowercase()
        val b = body.lowercase()
        if (otpRegex.containsMatchIn(b)) return false

        val hasAmount = amountRegex.containsMatchIn(b) || b.contains("ghana cedis")
        if (!hasAmount) return false

        if (knownSenders.any { s.contains(it) }) return true
        return movementRegex.containsMatchIn(b) && balanceRegex.containsMatchIn(b)
    }

    /**
     * Turns the API's JSON reply into a short, human notification.
     * Returns null when nothing needs saying (e.g. a duplicate).
     */
    private fun describeLogged(body: String): Pair<String, String>? {
        return try {
            val json = JSONObject(body)
            if (json.optBoolean("duplicate", false) && !json.optBoolean("linkedNow", false)) return null
            val data = json.optJSONObject("data") ?: return Pair("Logged", "Your transaction was saved in LogIt.")
            val amount = data.optDouble("amount", Double.NaN)
            val type = data.optString("type", "")
            val desc = data.optString("description", "").trim()
            val wallet = json.optString("walletName", "").takeIf { it.isNotBlank() && it != "null" }
            val amountText = if (amount.isNaN()) "" else String.format(java.util.Locale.US, "GHS %,.2f", amount)
            val title = (if (type == "credit") "Received $amountText" else "Spent $amountText").trim()
            val who = if (desc.isNotEmpty() && desc != "null") (if (type == "credit") "from $desc" else "on $desc") else ""
            val where = wallet?.let { "· $it" } ?: ""
            val text = listOf(who, where).filter { it.isNotEmpty() }.joinToString(" ")
            Pair(title, if (text.isEmpty()) "Logged in LogIt" else text)
        } catch (e: Exception) {
            Pair("Logged", "Your transaction was saved in LogIt.")
        }
    }

    private fun postTransaction(apiUrl: String, token: String, rawSms: String, accountId: String): RequestResult {
        val targetUrl = URL("$apiUrl/process-sms")
        val conn = targetUrl.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Authorization", "Bearer $token")
        conn.connectTimeout = 15000
        conn.readTimeout = 25000
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

    // ── Offline queue ────────────────────────────────────────────────────────
    // Messages that couldn't be sent are kept in "pending_sms" (a JSON array of
    // strings, same key and format as the iOS App Group). They are sent before
    // the next message here, and by the app when it opens (lib/pending-sms.ts).

    private val PENDING_KEY = "pending_sms"
    private val PENDING_MAX = 100

    @Synchronized
    private fun readPending(context: Context): MutableList<String> {
        val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(PENDING_KEY, null) ?: return mutableListOf()
        return try {
            val arr = JSONArray(raw)
            MutableList(arr.length()) { arr.getString(it) }
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    @Synchronized
    private fun writePending(context: Context, list: List<String>) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
        if (list.isEmpty()) prefs.remove(PENDING_KEY) else prefs.putString(PENDING_KEY, JSONArray(list).toString())
        prefs.apply()
    }

    private fun enqueuePending(context: Context, sms: String) {
        val list = readPending(context)
        if (!list.contains(sms)) list.add(sms)
        writePending(context, list.takeLast(PENDING_MAX))
    }

    private fun flushPending(context: Context, apiUrl: String, token: String, accountId: String) {
        val list = readPending(context)
        if (list.isEmpty()) return
        val remaining = list.toMutableList()
        for (sms in list) {
            try {
                val result = postTransaction(apiUrl, token, sms, accountId)
                if (result.statusCode == 401) break          // signed out: keep the rest
                if (result.statusCode in 200..299 || result.statusCode == 400) remaining.remove(sms)
            } catch (e: java.io.IOException) {
                break                                         // still offline
            }
        }
        writePending(context, remaining)
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
                    // Supabase rotates refresh tokens: flag it so the app adopts
                    // this session instead of reusing its old (now revoked) token.
                    putString("tokens_updated_by", "receiver")
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
