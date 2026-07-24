package cc.meteormc.spotifyplus

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Resources
import android.os.Bundle
import cc.meteormc.spotifyplus.util.DexKitCache
import cc.meteormc.xposedkit.ModuleRegister
import cc.meteormc.xposedkit.XLog
import cc.meteormc.xposedkit.XposedKit
import cc.meteormc.xposedkit.XposedModule
import cc.meteormc.xposedkit.param.PackageLoadedParam
import cc.meteormc.xposedkit.util.WeakDelegate
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.luckypray.dexkit.DexKitCacheBridge
import java.io.File

@ModuleRegister(
    targetApi = 102,
    staticScope = true
)
object XposedEntry : XposedModule, Application.ActivityLifecycleCallbacks {
    init {
        System.loadLibrary("dexkit")
    }

    const val TAG = "SpotifyPlus"

    lateinit var workingDir: File
    lateinit var moduleResources: Resources
    var currentActivity by WeakDelegate<Activity>()

    override val modulePackage: String
        get() = BuildConfig.APPLICATION_ID

    override fun onPackageLoaded(param: PackageLoadedParam) {
        if (!param.isFirstPackage) return
        XLog.i(TAG, "Loading SpotifyPlus v${BuildConfig.VERSION_NAME}")
        XposedKit.registerAppAttachListener(param.packageName) {
            onApplicationAttached(it, param.classLoader)
        }
    }

    fun onApplicationAttached(application: Application, classLoader: ClassLoader) {
        application.registerActivityLifecycleCallbacks(this)
        workingDir = application.filesDir.resolve("spotifyplus").apply {
            if (!exists()) mkdirs()
        }
        moduleResources = application.resources.let {
            XposedKit.createModuleResources(it.displayMetrics, it.configuration)
        }

        val dixkit = loadDexkit(application)
        val context = ModuleContext(classLoader, application, dixkit)
        // installHook

        dixkit.close()
    }

    private fun loadDexkit(context: Context): DexKitCacheBridge.RecyclableBridge {
        DexKitCache.load()
        DexKitCacheBridge.init(DexKitCache)
        val appPkg = context.packageName
        val appVersion = context.packageManager.getPackageInfo(
            appPkg,
            PackageManager.GET_META_DATA
        ).versionName
        val moduleVersion = BuildConfig.VERSION_CODE
        return DexKitCacheBridge.create(
            "$appPkg|$appVersion|$moduleVersion".hashCode().toString(),
            context.applicationInfo.sourceDir
        )
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {

    }

    override fun onActivityDestroyed(activity: Activity) {

    }

    override fun onActivityPaused(activity: Activity) {
        if (activity == currentActivity) {
            currentActivity = null
        }
    }

    override fun onActivityResumed(activity: Activity) {
        currentActivity = activity
    }

    override fun onActivitySaveInstanceState(activity: Activity, savedInstanceState: Bundle) {

    }

    override fun onActivityStarted(activity: Activity) {

    }

    override fun onActivityStopped(activity: Activity) {
        if (!DexKitCache.dirty.get()) return
        CoroutineScope(Dispatchers.IO).launch {
            DexKitCache.save()
        }
    }
}