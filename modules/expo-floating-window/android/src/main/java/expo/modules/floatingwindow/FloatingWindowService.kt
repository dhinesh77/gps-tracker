package expo.modules.floatingwindow

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

class FloatingWindowService : Service() {
    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var params: WindowManager.LayoutParams? = null

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel("floating_channel", "GPS Tracker Overlay", NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
            val notification: Notification = Notification.Builder(this, "floating_channel")
                .setContentTitle("GPS Tracker")
                .setContentText("Tracking in background")
                .build()
            startForeground(1, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val speed = intent?.getStringExtra("speed") ?: ""
        val distance = intent?.getStringExtra("distance") ?: ""
        val requiredSpeed = intent?.getStringExtra("requiredSpeed") ?: ""
        val timeRemaining = intent?.getStringExtra("timeRemaining") ?: ""

        if (floatingView == null) {
            createFloatingWindow(speed, distance, requiredSpeed, timeRemaining)
        } else {
            updateFloatingWindow(speed, distance, requiredSpeed, timeRemaining)
        }

        return START_NOT_STICKY
    }

    private fun addMetricView(layout: LinearLayout, tag: String, icon: String, label: String, value: String, color: String, bold: Boolean = false) {
        if (value.isEmpty()) return
        val textView = TextView(this).apply {
            text = "$icon $label: $value"
            setTextColor(Color.parseColor(color))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            if (bold) setTypeface(null, Typeface.BOLD)
            setPadding(0, 0, 0, 8)
            this.tag = tag
        }
        layout.addView(textView)
    }

    private fun createFloatingWindow(speed: String, distance: String, requiredSpeed: String, timeRemaining: String) {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        floatingView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#E60f172a"))
            setPadding(36, 28, 36, 28)

            // Title
            val titleText = TextView(this@FloatingWindowService).apply {
                text = "📍 GPS Tracker"
                setTextColor(Color.parseColor("#06b6d4"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                setTypeface(null, Typeface.BOLD)
                setPadding(0, 0, 0, 16)
            }
            addView(titleText)

            // Only add cards the user has enabled (non-empty values)
            addMetricView(this, "speedText", "⚡", "Speed", speed, "#FFFFFF")
            addMetricView(this, "distanceText", "📏", "Distance", distance, "#FFFFFF")
            addMetricView(this, "reqSpeedText", "🎯", "Required", requiredSpeed, "#d946ef", bold = true)
            addMetricView(this, "timeText", "⏱", "Time", timeRemaining, "#06b6d4")
        }

        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            WindowManager.LayoutParams.TYPE_PHONE
        }

        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        params!!.gravity = Gravity.TOP or Gravity.END
        params!!.x = 16
        params!!.y = 100

        // Make the floating window draggable
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f

        floatingView?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params!!.x
                    initialY = params!!.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params!!.x = initialX - (event.rawX - initialTouchX).toInt()
                    params!!.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager?.updateViewLayout(floatingView, params)
                    true
                }
                else -> false
            }
        }

        windowManager?.addView(floatingView, params)
    }

    private fun updateFloatingWindow(speed: String, distance: String, requiredSpeed: String, timeRemaining: String) {
        floatingView?.let { view ->
            updateOrHideText(view, "speedText", "⚡", "Speed", speed, "#FFFFFF")
            updateOrHideText(view, "distanceText", "📏", "Distance", distance, "#FFFFFF")
            updateOrHideText(view, "reqSpeedText", "🎯", "Required", requiredSpeed, "#d946ef")
            updateOrHideText(view, "timeText", "⏱", "Time", timeRemaining, "#06b6d4")
        }
    }

    private fun updateOrHideText(view: View, tag: String, icon: String, label: String, value: String, color: String) {
        val textView = view.findViewWithTag<TextView>(tag)
        if (value.isEmpty()) {
            textView?.visibility = View.GONE
        } else {
            if (textView != null) {
                textView.text = "$icon $label: $value"
                textView.visibility = View.VISIBLE
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (floatingView != null) {
            windowManager?.removeView(floatingView)
            floatingView = null
        }
    }
}
