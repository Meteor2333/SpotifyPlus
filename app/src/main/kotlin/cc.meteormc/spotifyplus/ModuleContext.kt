package cc.meteormc.spotifyplus

import android.content.Context
import cc.meteormc.xposedkit.hook.HookerContext
import cc.meteormc.xposedkit.hook.InvokeCallback
import org.luckypray.dexkit.DexKitCacheBridge
import org.luckypray.dexkit.exceptions.NoResultException
import org.luckypray.dexkit.exceptions.NonUniqueResultException
import org.luckypray.dexkit.result.BaseDataList
import org.luckypray.dexkit.result.ClassDataList
import org.luckypray.dexkit.result.FieldDataList
import org.luckypray.dexkit.result.MethodDataList
import org.luckypray.dexkit.result.base.BaseData
import org.luckypray.dexkit.wrap.DexMethod
import java.io.Closeable
import java.lang.reflect.Constructor
import java.lang.reflect.Field
import java.lang.reflect.Method
import java.util.concurrent.ConcurrentHashMap

data class ModuleContext(
    override val classLoader: ClassLoader,
    val context: Context,
    val dexkit: DexKitCacheBridge.RecyclableBridge,
    val metadata: MutableMap<String, Any> = ConcurrentHashMap()
) : HookerContext(classLoader), Closeable {
    override fun close() {
        dexkit.close()
    }

    fun DexMethod.hookBefore(callback: InvokeCallback): DexMethod {
        if (isConstructor) {
            getConstructorInstance(classLoader).hookAfter(callback)
        }

        if (isMethod) {
            getMethodInstance(classLoader).hookAfter(callback)
        }

        return this
    }

    fun DexMethod.hookAfter(callback: InvokeCallback): DexMethod {
        if (isConstructor) {
            getConstructorInstance(classLoader).hookAfter(callback)
        }

        if (isMethod) {
            getMethodInstance(classLoader).hookAfter(callback)
        }

        return this
    }

    fun ClassDataList.resolve(): Class<*> {
        return pick { it.toDexClass() }.getInstance(classLoader)
    }

    fun MethodDataList.resolveConstructor(): Constructor<*> {
        return pick { it.toDexMethod() }.getConstructorInstance(classLoader)
    }

    fun MethodDataList.resolveMethod(): Method {
        return pick { it.toDexMethod() }.getMethodInstance(classLoader)
    }

    fun FieldDataList.resolve(): Field {
        return pick { it.toDexField() }.getFieldInstance(classLoader)
    }

    private fun <T : BaseData> BaseDataList<T>.pick(transform: (T) -> Any): T {
        val distincted = distinct()

        if (distincted.isEmpty()) {
            throw NoResultException("No result found for query")
        }

        if (distincted.size > 1) {
            throw NonUniqueResultException(
                "Non unique result for query: ${distincted.joinToString { transform(it).toString() }}"
            )
        }

        return distincted[0]
    }
}