package cc.meteormc.spotifyplus.util

import android.os.Parcel
import androidx.core.os.use
import cc.meteormc.spotifyplus.XposedEntry
import cc.meteormc.xposedkit.XLog
import org.luckypray.dexkit.DexKitCacheBridge
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

object DexKitCache : DexKitCacheBridge.Cache {
    private const val TAG = "DexKitCache"
    private const val MAGIC = 0x44584348
    private const val VERSION = 1

    private lateinit var file: File
    private val single = ConcurrentHashMap<String, String>()
    private val list = ConcurrentHashMap<String, List<String>>()

    var dirty = AtomicBoolean(false)

    private fun ensureFile(): Boolean {
        if (!this::file.isInitialized) {
            file = XposedEntry.workingDir.resolve("dexkit_cache.dat")
        }

        if (!file.exists()) {
            try {
                file.createNewFile()
            } catch (e: IOException) {
                XLog.e(TAG, "Failed to create DexKit cache file!", e)
                return false
            }
        }

        return true
    }

    fun load() {
        if (!ensureFile()) return
        try {
            val bytes = FileInputStream(file).use {
                it.readBytes()
            }.takeIf {
                it.isNotEmpty()
            } ?: return

            Parcel.obtain().use {
                it.unmarshall(bytes, 0, bytes.size)
                it.setDataPosition(0)

                if (it.readInt() != MAGIC) {
                    XLog.w(TAG, "DexKit cache file has invalid magic number, invalidating it")
                    return
                }

                if (it.readInt() != VERSION) {
                    XLog.w(TAG, "DexKit cache file version mismatch, invalidating it")
                    return
                }

                single.clear()
                repeat(it.readInt()) { i ->
                    val key = it.readString() ?: return@repeat
                    val value = it.readString() ?: return@repeat
                    single[key] = value
                }

                list.clear()
                repeat(it.readInt()) { i ->
                    val key = it.readString() ?: return@repeat
                    val value = it.createStringArrayList() ?: return@repeat
                    list[key] = value
                }
            }
        } catch (e: Exception) {
            XLog.e(TAG, "Failed to load DexKit cache file!", e)
        }
    }

    fun save() {
        if (!dirty.compareAndSet(true, false)) return
        if (!ensureFile()) return
        try {
            val bytes = Parcel.obtain().use {
                it.writeInt(MAGIC)
                it.writeInt(VERSION)

                it.writeInt(single.size)
                for (entry in single.entries) {
                    it.writeString(entry.key)
                    it.writeString(entry.value)
                }

                it.writeInt(list.size)
                for (entry in list.entries) {
                    it.writeString(entry.key)
                    it.writeStringList(entry.value)
                }

                it.marshall()
            }

            FileOutputStream(file).use {
                it.write(bytes)
            }
        } catch (e: Exception) {
            XLog.e(TAG, "Failed to save DexKit cache file!", e)
        }
    }

    override fun getAllKeys(): Collection<String> {
        return single.keys + list.keys
    }

    override fun getString(key: String, default: String?): String? {
        return single[key] ?: default
    }

    override fun getStringList(key: String, default: List<String>?): List<String>? {
        return list[key] ?: default
    }

    override fun putString(key: String, value: String) {
        dirty.set(true)
        single[key] = value
    }

    override fun putStringList(key: String, value: List<String>) {
        dirty.set(true)
        list[key] = value
    }

    override fun remove(key: String) {
        dirty.set(true)
        single.remove(key)
        list.remove(key)
    }

    override fun clearAll() {
        dirty.set(true)
        single.clear()
        list.clear()
    }
}