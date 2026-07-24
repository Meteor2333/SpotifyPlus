package cc.meteormc.spotifyplus.util

import cc.meteormc.spotifyplus.BuildConfig
import cc.meteormc.spotifyplus.XposedEntry
import cc.meteormc.xposedkit.XLog
import com.google.gson.GsonBuilder
import java.io.IOException
import java.io.Writer
import java.util.concurrent.Executors

object DataDumper {
    private const val TAG = "DataDumper"

    private val executor = Executors.newSingleThreadExecutor()
    private val gson = GsonBuilder().setPrettyPrinting().create()

    fun dump(name: String, data: Any?) {
        if (!BuildConfig.DEBUG) return
        executor.execute {
            XposedEntry.workingDir.resolve("${name}_dump.json").runCatching {
                LimitedWriter(
                    this.bufferedWriter(),
                    100 * 1024 * 1024
                ).use {
                    gson.toJson(data, it)
                }
            }.onFailure {
                XLog.d(TAG, "Failed to dump data for $name", it)
            }
        }
    }

    class LimitedWriter(
        val out: Writer,
        private val maxSize: Long
    ) : Writer() {
        private var written = 0L

        override fun close() {
            out.close()
        }

        override fun flush() {
            out.flush()
        }

        override fun write(cbuf: CharArray, off: Int, len: Int) {
            out.write(cbuf, off, len)

            written += len
            if (written > maxSize) {
                throw IOException("Exceeded maximum size of $maxSize bytes!")
            }
        }
    }
}