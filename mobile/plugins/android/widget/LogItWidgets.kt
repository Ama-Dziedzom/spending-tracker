package com.ama.spendingtracker

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.SizeF
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * LogIt widgets for Android (Figma 1037:4555, "Android": the same layouts as
 * iOS, resizable, with Material's 28dp corners).
 *
 *  - Spending: 2×2 Today, 4×2 This week, 4×4 Overview. Resizing switches layout.
 *  - To check: 2×2.
 *
 * They read the snapshot the app writes after Spending loads
 * (lib/widget-snapshot.ts → AppGroupBridge.setItem("widget_snapshot")).
 */
object LogItWidgets {
    private const val PREFS = "spending_tracker_prefs"
    private const val KEY = "widget_snapshot"

    class Day(val letter: String, val value: Double, val isToday: Boolean, val future: Boolean)
    class Item(val name: String, val meta: String, val amount: Double, val incoming: Boolean, val tone: String, val time: String)

    class Snap(j: JSONObject) {
        val signedIn = j.optBoolean("signedIn")
        private val updatedAt = j.optString("updatedAt")
        val hidden = j.optBoolean("hideHomeScreen")
        val autopilotOn = j.optBoolean("autopilotOn", true)
        val todaySpent = j.optDouble("todaySpent", 0.0)
        val todayPayments = j.optInt("todayPayments")
        val weekSpent = j.optDouble("weekSpent", 0.0)
        val weekChange: Double? = if (!j.has("weekChange") || j.isNull("weekChange")) null else j.optDouble("weekChange")
        val dateLabel: String = j.optString("dateLabel")
        val toCheck = j.optInt("toCheck")
        val days: List<Day> = j.optJSONArray("days")?.let { a ->
            (0 until a.length()).map { i ->
                val d = a.getJSONObject(i)
                Day(d.optString("letter"), d.optDouble("value", 0.0), d.optBoolean("isToday"), d.optBoolean("future"))
            }
        } ?: emptyList()
        val latest: List<Item> = j.optJSONArray("latest")?.let { a ->
            (0 until a.length()).map { i ->
                val d = a.getJSONObject(i)
                Item(d.optString("name"), d.optString("meta"), d.optDouble("amount", 0.0), d.optBoolean("incoming"), d.optString("tone"), d.optString("time"))
            }
        } ?: emptyList()

        /** Older than an hour: say how old instead of pretending. */
        val staleLabel: String?
            get() {
                val t = parse(updatedAt) ?: return null
                val mins = ((System.currentTimeMillis() - t) / 60_000).toInt()
                return when {
                    mins < 60 -> null
                    mins < 60 * 24 -> "Updated ${mins / 60}h ago"
                    else -> "Updated ${mins / (60 * 24)}d ago"
                }
            }

        private fun parse(s: String): Long? {
            for (p in listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'")) {
                val f = SimpleDateFormat(p, Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
                runCatching { return f.parse(s)?.time }
            }
            return null
        }
    }

    fun load(ctx: Context): Snap? =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
            ?.let { runCatching { Snap(JSONObject(it)) }.getOrNull() }

    /** Called by the app (AppGroupBridge.reloadWidgets) after it writes a new snapshot. */
    fun updateAll(ctx: Context) {
        val mgr = AppWidgetManager.getInstance(ctx)
        for (cls in listOf(SpendingWidget::class.java, ToCheckWidget::class.java)) {
            val ids = mgr.getAppWidgetIds(ComponentName(ctx, cls))
            if (ids.isEmpty()) continue
            ctx.sendBroadcast(
                Intent(ctx, cls).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                    .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            )
        }
    }

    // ─── Formatting ──────────────────────────────────────────────────────────

    private val money = NumberFormat.getNumberInstance(Locale.US).apply { minimumFractionDigits = 2; maximumFractionDigits = 2 }
    private val whole = NumberFormat.getNumberInstance(Locale.US).apply { maximumFractionDigits = 0 }
    fun m(v: Double): String = money.format(abs(v))
    fun w(v: Double): String = whole.format(abs(v).roundToInt())

    fun open(ctx: Context, path: String, code: Int): PendingIntent =
        PendingIntent.getActivity(
            ctx, code,
            Intent(Intent.ACTION_VIEW, Uri.parse("logit://$path")).setPackage(ctx.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    // ─── Drawing: bars and category tiles ─────────────────────────────────────

    private fun font(ctx: Context, bold: Boolean): Typeface =
        if (Build.VERSION.SDK_INT >= 26) runCatching { ctx.resources.getFont(if (bold) R.font.manrope_bold else R.font.manrope_medium) }.getOrDefault(Typeface.DEFAULT)
        else Typeface.DEFAULT

    private fun alpha(color: Int, a: Float) = (color and 0x00FFFFFF) or ((255 * a).roundToInt() shl 24)

    /**
     * The week's seven day bars; today stands out. Drawn in white at different
     * strengths; on the white widgets the layout tints it brand/accent, so it
     * follows light and dark mode with the launcher.
     */
    fun bars(ctx: Context, days: List<Day>, wDp: Int, hDp: Int, onBlue: Boolean, wide: Boolean = false): Bitmap {
        val d = ctx.resources.displayMetrics.density
        val bmp = Bitmap.createBitmap((wDp * d).roundToInt(), (hDp * d).roundToInt(), Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        val barW = (if (wide) 9 else 7) * d
        val gap = (bmp.width - 7 * barW) / 6
        val top = days.maxOfOrNull { it.value }?.coerceAtLeast(1.0) ?: 1.0
        for (i in 0 until 7) {
            val day = days.getOrNull(i) ?: Day("", 0.0, false, true)
            val empty = day.future || day.value <= 0
            p.color = alpha(
                0xFFFFFFFF.toInt(),
                when {
                    day.isToday -> 1f
                    onBlue -> if (empty) 0.25f else 0.45f
                    else -> if (empty) 0.14f else 0.3f
                },
            )
            val h = if (empty) 3 * d else max(4 * d, (day.value / top).toFloat() * bmp.height)
            val x = i * (barW + gap)
            c.drawRoundRect(RectF(x, bmp.height - h, x + barW, bmp.height.toFloat()), 2 * d, 2 * d, p)
        }
        return bmp
    }

    /** M T W T F S S under the bars; today full strength. Tinted text/primary by the layout. */
    fun letters(ctx: Context, days: List<Day>, wDp: Int): Bitmap {
        val d = ctx.resources.displayMetrics.density
        val bmp = Bitmap.createBitmap((wDp * d).roundToInt(), (11 * d).roundToInt(), Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 8 * d; textAlign = Paint.Align.CENTER }
        val barW = 9 * d
        val gap = (bmp.width - 7 * barW) / 6
        for (i in 0 until 7) {
            val day = days.getOrNull(i) ?: continue
            p.color = alpha(0xFFFFFFFF.toInt(), if (day.isToday) 1f else 0.62f)
            p.typeface = font(ctx, day.isToday)
            c.drawText(day.letter, i * (barW + gap) + barW / 2, bmp.height - 2 * d, p)
        }
        return bmp
    }

    private fun toneColors(tone: String): Pair<Int, Int> = when (tone) {
        "food" -> R.color.logit_cat_food_tint to R.color.logit_cat_food
        "transport" -> R.color.logit_cat_transport_tint to R.color.logit_cat_transport
        "shopping" -> R.color.logit_cat_shopping_tint to R.color.logit_cat_shopping
        "bills" -> R.color.logit_cat_bills_tint to R.color.logit_cat_bills
        "airtime" -> R.color.logit_cat_airtime_tint to R.color.logit_cat_airtime
        "subscription" -> R.color.logit_cat_subscription_tint to R.color.logit_cat_subscription
        "cash" -> R.color.logit_cat_cash_tint to R.color.logit_cat_cash
        "loans" -> R.color.logit_cat_loans_tint to R.color.logit_cat_loans
        "fees" -> R.color.logit_cat_fees_tint to R.color.logit_cat_fees
        "people" -> R.color.logit_cat_people_tint to R.color.logit_cat_people
        "success" -> R.color.logit_status_success_tint to R.color.logit_status_success
        "warn" -> R.color.logit_status_warn_tint to R.color.logit_status_warn
        else -> R.color.logit_bg_muted to R.color.logit_text_secondary
    }

    fun toneIcon(tone: String): Int = when (tone) {
        "food" -> R.drawable.logit_ic_food
        "transport" -> R.drawable.logit_ic_transport
        "shopping" -> R.drawable.logit_ic_shopping
        "bills" -> R.drawable.logit_ic_bills
        "airtime" -> R.drawable.logit_ic_airtime
        "subscription" -> R.drawable.logit_ic_subscription
        "cash" -> R.drawable.logit_ic_cash
        "loans" -> R.drawable.logit_ic_loans
        "fees" -> R.drawable.logit_ic_fees
        "people" -> R.drawable.logit_ic_people
        "success" -> R.drawable.logit_ic_receive
        else -> R.drawable.logit_ic_more
    }

    /**
     * Category tile (CategoryTile in the app). Android 12+: a rounded shape and
     * icon tinted from colour resources, so the launcher re-colours them for
     * dark mode. Older Android: one pre-drawn image.
     */
    fun setTile(ctx: Context, v: RemoteViews, id: Int, tone: String, icon: Int, sizeDp: Int) {
        val (bg, fg) = toneColors(tone)
        if (Build.VERSION.SDK_INT >= 31) {
            v.setImageViewResource(id, icon)
            v.setColorStateList(id, "setBackgroundTintList", bg)
            v.setColorStateList(id, "setImageTintList", fg)
        } else {
            v.setInt(id, "setBackgroundResource", 0)
            v.setImageViewBitmap(id, tile(ctx, tone, icon, sizeDp))
        }
    }

    /** A rounded category tile: tint background, coloured icon (like CategoryTile in the app). */
    fun tile(ctx: Context, tone: String, icon: Int, sizeDp: Int): Bitmap {
        val d = ctx.resources.displayMetrics.density
        val px = (sizeDp * d).roundToInt()
        val bmp = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val (bg, fg) = toneColors(tone)
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ctx.getColor(bg) }
        c.drawRoundRect(RectF(0f, 0f, px.toFloat(), px.toFloat()), px * 0.32f, px * 0.32f, p)
        ctx.getDrawable(icon)?.mutate()?.let {
            it.setTint(ctx.getColor(fg))
            val inset = (px * 0.25f).roundToInt()
            it.setBounds(inset, inset, px - inset, px - inset)
            it.draw(c)
        }
        return bmp
    }

    /**
     * Big numbers and titles in Manrope. Launchers only load system fonts in
     * widgets, so these are drawn as images (with the text as the content
     * description, so TalkBack still reads them).
     */
    fun manrope(ctx: Context, v: RemoteViews, id: Int, text: String, sp: Float, weight: Int = R.font.manrope_extrabold) {
        val d = ctx.resources.displayMetrics.density
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFFFFFFFF.toInt()  // tinted by the layout on white widgets
            textSize = sp * d
            typeface = if (Build.VERSION.SDK_INT >= 26) runCatching { ctx.resources.getFont(weight) }.getOrDefault(Typeface.DEFAULT_BOLD) else Typeface.DEFAULT_BOLD
        }
        val fm = p.fontMetrics
        val w = max(1, p.measureText(text).roundToInt())
        val h = max(1, (fm.descent - fm.ascent).roundToInt())
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        Canvas(bmp).drawText(text, 0f, -fm.ascent, p)
        v.setImageViewBitmap(id, bmp)
        v.setContentDescription(id, text)
    }

    // ─── Layouts ─────────────────────────────────────────────────────────────

    fun today(ctx: Context, s: Snap?): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.logit_widget_today)
        if (s == null || !s.signedIn) {
            v.setTextViewText(R.id.label, "LogIt")
            v.setViewVisibility(R.id.ghs, View.GONE)
            manrope(ctx, v, R.id.amount, "Log in", 26f)
            v.setTextViewText(R.id.sub, "to see your money")
            v.setViewVisibility(R.id.bars, View.GONE)
            v.setOnClickPendingIntent(R.id.root, open(ctx, "/login", 1))
            return v
        }
        val stale = s.staleLabel
        v.setTextViewText(R.id.label, if (!s.autopilotOn) "Paused" else if (stale != null) "Today · offline" else "Today")
        if (s.hidden) {
            manrope(ctx, v, R.id.amount, "• • • •", 26f)
            v.setTextViewText(R.id.sub, "Tap to see")
            v.setViewVisibility(R.id.bars, View.GONE)
        } else {
            manrope(ctx, v, R.id.amount, m(s.todaySpent), 26f)
            v.setTextViewText(
                R.id.sub,
                when {
                    !s.autopilotOn -> "Autopilot is off"
                    stale != null -> stale
                    s.todayPayments == 0 -> "Nothing yet today"
                    else -> "${s.todayPayments} payment${if (s.todayPayments == 1) "" else "s"}"
                },
            )
            v.setImageViewBitmap(R.id.bars, bars(ctx, s.days, 82, 14, onBlue = true))
        }
        if (!s.autopilotOn) {
            v.setViewVisibility(R.id.bars, View.GONE)
            v.setViewVisibility(R.id.turn_on, View.VISIBLE)
        }
        v.setOnClickPendingIntent(R.id.root, open(ctx, if (!s.autopilotOn) "/sms-settings" else "/spending", 2))
        return v
    }

    private fun chip(v: RemoteViews, id: Int, change: Double?, onBlue: Boolean) {
        if (change == null || change.roundToInt() == 0) { v.setViewVisibility(id, View.GONE); return }
        val less = change < 0
        v.setViewVisibility(id, View.VISIBLE)
        v.setTextViewText(id, "${w(change)} ${if (less) "less" else "more"} than last week")
        if (!onBlue) {
            v.setInt(id, "setBackgroundResource", if (less) R.drawable.logit_widget_chip_success else R.drawable.logit_widget_chip_muted)
        }
    }

    fun week(ctx: Context, s: Snap?): RemoteViews {
        if (s == null || !s.signedIn) return signedOut(ctx)
        val v = RemoteViews(ctx.packageName, R.layout.logit_widget_week)
        if (s.hidden) {
            v.setTextViewText(R.id.chip, "Hidden")
            v.setInt(R.id.chip, "setBackgroundResource", R.drawable.logit_widget_chip_muted)
            manrope(ctx, v, R.id.amount, "• • • •", 26f)
            v.setViewVisibility(R.id.bars, View.GONE)
            v.setViewVisibility(R.id.letters, View.GONE)
        } else {
            chip(v, R.id.chip, s.weekChange, onBlue = false)
            manrope(ctx, v, R.id.amount, m(s.weekSpent), 26f)
            v.setImageViewBitmap(R.id.bars, bars(ctx, s.days, 112, 22, onBlue = false, wide = true))
            v.setImageViewBitmap(R.id.letters, letters(ctx, s.days, 112))
        }
        val item = s.latest.firstOrNull()
        v.setImageViewResource(R.id.latest_icon, toneIcon(item?.tone ?: "people"))
        if (Build.VERSION.SDK_INT >= 31) v.setColorStateList(R.id.latest_icon, "setImageTintList", toneColors(item?.tone ?: "people").second)
        v.setTextViewText(R.id.latest_name, if (s.hidden) "Latest entry" else item?.name ?: "Nothing yet")
        v.setTextViewText(R.id.latest_amount, if (s.hidden) "• • •" else item?.let { "${m(it.amount)} · ${it.time}" } ?: "")
        v.setOnClickPendingIntent(R.id.root, open(ctx, "/spending", 3))
        return v
    }

    private val ROWS = listOf(
        intArrayOf(R.id.row1, R.id.tile1, R.id.name1, R.id.meta1, R.id.amount1),
        intArrayOf(R.id.row2, R.id.tile2, R.id.name2, R.id.meta2, R.id.amount2),
        intArrayOf(R.id.row3, R.id.tile3, R.id.name3, R.id.meta3, R.id.amount3),
    )

    fun overview(ctx: Context, s: Snap?): RemoteViews {
        if (s == null || !s.signedIn) return signedOut(ctx)
        val v = RemoteViews(ctx.packageName, R.layout.logit_widget_overview)
        v.setTextViewText(R.id.date, s.dateLabel)
        if (s.hidden) {
            manrope(ctx, v, R.id.amount, "• • • •", 28f)
            v.setViewVisibility(R.id.chip, View.GONE)
            v.setViewVisibility(R.id.bars, View.GONE)
        } else {
            manrope(ctx, v, R.id.amount, m(s.weekSpent), 28f)
            chip(v, R.id.chip, s.weekChange, onBlue = true)
            v.setImageViewBitmap(R.id.bars, bars(ctx, s.days, 82, 30, onBlue = true))
        }
        ROWS.forEachIndexed { i, ids ->
            val e = s.latest.getOrNull(i)
            if (e == null) { v.setViewVisibility(ids[0], View.GONE); return@forEachIndexed }
            v.setViewVisibility(ids[0], View.VISIBLE)
            setTile(ctx, v, ids[1], e.tone, toneIcon(e.tone), 26)
            v.setTextViewText(ids[2], if (s.hidden) "Entry" else e.name)
            v.setTextViewText(ids[3], if (s.hidden) "" else e.meta)
            v.setTextViewText(ids[4], if (s.hidden) "•••" else "${if (e.incoming) "+" else ""}${m(e.amount)}")
            val amountColor = if (e.incoming) R.color.logit_status_success else R.color.logit_text_primary
            if (Build.VERSION.SDK_INT >= 31) v.setColorStateList(ids[4], "setTextColor", amountColor)
            else v.setTextColor(ids[4], ctx.getColor(amountColor))
        }
        v.setViewVisibility(R.id.divider1, if (s.latest.size > 1) View.VISIBLE else View.GONE)
        v.setViewVisibility(R.id.divider2, if (s.latest.size > 2) View.VISIBLE else View.GONE)
        v.setViewVisibility(R.id.empty, if (s.latest.isEmpty()) View.VISIBLE else View.GONE)
        v.setOnClickPendingIntent(R.id.top, open(ctx, "/spending", 4))
        v.setOnClickPendingIntent(R.id.rows, open(ctx, "/spending", 5))
        v.setOnClickPendingIntent(R.id.ask, open(ctx, "/ask?voice=1", 6))
        v.setOnClickPendingIntent(R.id.paste, open(ctx, "/paste", 7))
        return v
    }

    fun signedOut(ctx: Context): RemoteViews =
        RemoteViews(ctx.packageName, R.layout.logit_widget_signed_out).apply {
            setOnClickPendingIntent(R.id.root, open(ctx, "/login", 8))
        }

    fun toCheck(ctx: Context, s: Snap?): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.logit_widget_tocheck)
        when {
            s == null || !s.signedIn -> {
                v.setViewVisibility(R.id.tile, View.GONE)
                manrope(ctx, v, R.id.title, "Log in", 17f, weight = R.font.manrope_bold)
                v.setTextViewText(R.id.sub, "to see your money")
                v.setOnClickPendingIntent(R.id.root, open(ctx, "/login", 9))
                return v
            }
            s.toCheck > 0 -> {
                setTile(ctx, v, R.id.tile, "warn", R.drawable.logit_ic_inbox, 28)
                manrope(ctx, v, R.id.title, "${s.toCheck} message${if (s.toCheck == 1) "" else "s"}", 17f, weight = R.font.manrope_bold)
                v.setTextViewText(R.id.sub, "Tap to sort them")
            }
            else -> {
                setTile(ctx, v, R.id.tile, "success", R.drawable.logit_ic_tick, 28)
                manrope(ctx, v, R.id.title, "All caught up", 17f, weight = R.font.manrope_bold)
                v.setTextViewText(R.id.sub, "Nothing to check")
            }
        }
        v.setOnClickPendingIntent(R.id.root, open(ctx, "/review", 10))
        return v
    }
}

/** 2×2 Today · 4×2 This week · 4×4 Overview; resizing switches between them. */
class SpendingWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { render(ctx, mgr, it) }
    }

    override fun onAppWidgetOptionsChanged(ctx: Context, mgr: AppWidgetManager, id: Int, options: Bundle) {
        render(ctx, mgr, id)
    }

    private fun render(ctx: Context, mgr: AppWidgetManager, id: Int) {
        val s = LogItWidgets.load(ctx)
        val views = if (Build.VERSION.SDK_INT >= 31) {
            RemoteViews(
                mapOf(
                    SizeF(100f, 100f) to LogItWidgets.today(ctx, s),
                    SizeF(220f, 100f) to LogItWidgets.week(ctx, s),
                    SizeF(220f, 260f) to LogItWidgets.overview(ctx, s),
                ),
            )
        } else {
            val o = mgr.getAppWidgetOptions(id)
            val w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
            val h = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT)
            when {
                w >= 220 && h >= 260 -> LogItWidgets.overview(ctx, s)
                w >= 220 -> LogItWidgets.week(ctx, s)
                else -> LogItWidgets.today(ctx, s)
            }
        }
        mgr.updateAppWidget(id, views)
    }
}

class ToCheckWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        val s = LogItWidgets.load(ctx)
        ids.forEach { mgr.updateAppWidget(it, LogItWidgets.toCheck(ctx, s)) }
    }
}
