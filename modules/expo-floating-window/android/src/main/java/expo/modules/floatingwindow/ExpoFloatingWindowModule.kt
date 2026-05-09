package expo.modules.floatingwindow

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoFloatingWindowModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoFloatingWindow")

    Function("canDrawOverlays") {
      val context = appContext.reactContext ?: return@Function false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        return@Function Settings.canDrawOverlays(context)
      }
      return@Function true
    }

    Function("openOverlaySettings") {
      val context = appContext.reactContext ?: return@Function
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${context.packageName}")
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }

    Function("showFloatingWindow") { speed: String, distance: String, requiredSpeed: String, timeRemaining: String ->
      val context = appContext.reactContext ?: return@Function
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
        return@Function
      }

      val intent = Intent(context, FloatingWindowService::class.java)
      intent.putExtra("speed", speed)
      intent.putExtra("distance", distance)
      intent.putExtra("requiredSpeed", requiredSpeed)
      intent.putExtra("timeRemaining", timeRemaining)
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    Function("hideFloatingWindow") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(context, FloatingWindowService::class.java)
      context.stopService(intent)
    }
  }
}
