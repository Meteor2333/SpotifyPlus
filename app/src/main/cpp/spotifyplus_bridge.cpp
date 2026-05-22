#include <android/log.h>
#include <dlfcn.h>
#include <node_api.h>

#include <string>

#include "spotifyengine.h"

typedef void (*SendToJavaFn)(const char*);
typedef char* (*PollFromJavaFn)();
typedef void (*FreeStringFn)(char*);

typedef bool (*SetEventHandlerFn)(napi_env, napi_value);
typedef void (*LoadDexFn)(const char* scriptId, const char* dexPath, const char* pluginClass);
typedef void (*GetPlatformDataFn)(PlatformData* data);
typedef void (*GetSessionFn)(SessionData* data);
typedef void (*LogFn)(const char*);

typedef void (*GetCurrentTrackFn)(SpotifyTrack* data);
typedef void (*GetTrackFn)(const char* uri, SpotifyTrack* data);
typedef double (*GetPlaybackPositionFn)();
typedef void (*SeekFn)(long);
typedef void (*PlayFn)();
typedef void (*PauseFn)();
typedef void (*TogglePlayFn)();
typedef void (*SkipNextFn)();
typedef void (*SkipPreviousFn)();

typedef void (*ToastFn)(const char* text, bool longLength);
typedef void (*OpenUriFn)(const char* uri);
typedef void (*StorageSetFn)(const char* scriptId, const char* key, const char* value);
typedef void (*StorageGetFn)(const char* scriptId, const char* key, StorageValueResult* data);
typedef void (*StorageRemoveFn)(const char* scriptId, const char* key);
typedef void (*StorageWriteTextFn)(const char* scriptId, const char* path, const char* value);
typedef void (*StorageWriteJsonFn)(const char* scriptId, const char* path, const char* value);
typedef void (*StorageWriteBinaryFn)(const char* scriptId, const char* path, const char* value);
typedef void (*StorageReadFn)(const char* scriptId, const char* path, StorageReadResult* data);

typedef void (*RegisterContextMenuFn)(const char* id, const char* scriptId, const char* title);
typedef void (*RegisterSideDrawerFn)(const char* id, const char* scriptId, const char* title);

typedef void (*RegisterSurfaceFn)(const char* surfaceId);
typedef void (*UnregisterSurfaceFn)(const char* surfaceId);
typedef void (*CommitSurfaceFn)(const char* surfaceId, const char* opsJson);

static SetEventHandlerFn g_setEventHandler = nullptr;
static GetPlatformDataFn g_getPlatformData = nullptr;
static GetSessionFn g_getSession = nullptr;
static LogFn g_log = nullptr;

static GetCurrentTrackFn g_getCurrentTrack = nullptr;
static GetTrackFn g_getTrack = nullptr;
static LoadDexFn g_loadDex = nullptr;
static GetPlaybackPositionFn g_getPlaybackPosition = nullptr;
static SeekFn g_seek = nullptr;
static PlayFn g_play = nullptr;
static PauseFn g_pause = nullptr;
static TogglePlayFn g_togglePlay = nullptr;
static SkipNextFn g_skipNext = nullptr;
static SkipPreviousFn g_skipPrevious = nullptr;

static ToastFn g_toast = nullptr;
static OpenUriFn g_openUri = nullptr;
static StorageSetFn g_storageSet = nullptr;
static StorageGetFn g_storageGet = nullptr;
static StorageRemoveFn g_storageRemove = nullptr;
static StorageWriteTextFn g_storageWriteText = nullptr;
static StorageWriteJsonFn g_storageWriteJson = nullptr;
static StorageWriteBinaryFn g_storageWriteBinary = nullptr;
static StorageReadFn g_storageRead = nullptr;

static RegisterContextMenuFn g_registerContextMenu = nullptr;
static RegisterSideDrawerFn g_registerSideDrawer = nullptr;

static RegisterSurfaceFn g_registerSurface = nullptr;
static UnregisterSurfaceFn g_unregisterSurface = nullptr;
static CommitSurfaceFn g_commitSurface = nullptr;

static SendToJavaFn g_sendToJava = nullptr;
static PollFromJavaFn g_pollFromJava = nullptr;
static FreeStringFn g_freeString = nullptr;
static bool g_symbolsResolved = false;
static void* g_nativeLibHandle = nullptr;
static const char* TAG = "SpotifyPlusBridge";

static napi_value CreateJsString(napi_env env, const std::string& value)
{
    napi_value result;
    napi_create_string_utf8(env, value.c_str(), NAPI_AUTO_LENGTH, &result);
    return result;
}

static std::string GetStringArg(napi_env env, napi_value value)
{
    size_t strSize = 0;
    napi_get_value_string_utf8(env, value, nullptr, 0, &strSize);

    std::string result;
    result.resize(strSize + 1);
    napi_get_value_string_utf8(env, value, result.data(), strSize + 1, &strSize);
    result.resize(strSize);
    return result;
}

static napi_value BuildTrackResult(napi_env env, const SpotifyTrack& track)
{
    napi_value result;
    napi_create_object(env, &result);

    napi_set_named_property(env, result, "title", CreateJsString(env, track.title));
    napi_set_named_property(env, result, "artist", CreateJsString(env, track.artist));
    napi_set_named_property(env, result, "uri", CreateJsString(env, track.uri));
    napi_set_named_property(env, result, "id", CreateJsString(env, track.id));

    napi_value explicitValue;
    napi_get_boolean(env, track.explicitTrack, &explicitValue);
    napi_set_named_property(env, result, "explicit", explicitValue);

    napi_value trackNumber;
    napi_create_int32(env, track.trackNumber, &trackNumber);
    napi_set_named_property(env, result, "trackNumber", trackNumber);

    napi_value duration;
    napi_create_int64(env, track.durationMs, &duration);
    napi_set_named_property(env, result, "durationMs", duration);

    napi_value artistsArray;
    napi_create_array_with_length(env, track.artists.size(), &artistsArray);
    for (size_t i = 0; i < track.artists.size(); i++)
    {
        napi_set_element(env, artistsArray, i, CreateJsString(env, track.artists[i]));
    }
    napi_set_named_property(env, result, "artists", artistsArray);

    napi_value albumObject;
    napi_create_object(env, &albumObject);
    napi_set_named_property(env, albumObject, "title", CreateJsString(env, track.album.title));
    napi_set_named_property(env, albumObject, "artist", CreateJsString(env, track.album.artist));
    napi_set_named_property(env, albumObject, "release", CreateJsString(env, track.album.date));
    napi_set_named_property(env, albumObject, "image", CreateJsString(env, track.album.image));
    napi_set_named_property(env, result, "album", albumObject);

    return result;
}

static bool resolve_symbols()
{
    if (g_symbolsResolved)
    {
        return g_setEventHandler && g_getPlatformData && g_getSession && g_log && g_getCurrentTrack && g_getTrack && g_getPlaybackPosition && g_seek && g_play && g_pause && g_togglePlay && g_skipNext && g_skipPrevious && g_toast && g_openUri && g_storageSet && g_storageGet && g_storageRemove && g_storageWriteText && g_storageWriteJson && g_storageWriteBinary && g_storageRead;
    }

    dlerror();

    g_nativeLibHandle = dlopen("libnative-lib.so", RTLD_NOW | RTLD_GLOBAL);
    if (!g_nativeLibHandle)
    {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "dlopen(libnative-lib.so) failed: %s", dlerror());
        g_symbolsResolved = true;
        return false;
    }

    g_setEventHandler = (SetEventHandlerFn)dlsym(g_nativeLibHandle, "SpotifyPlus_SetEventHandler");
    g_loadDex = (LoadDexFn)dlsym(g_nativeLibHandle, "SpotifyPlus_LoadDex");
    g_getPlatformData = (GetPlatformDataFn)dlsym(g_nativeLibHandle, "SpotifyPlus_GetPlatformData");
    g_getSession = (GetSessionFn)dlsym(g_nativeLibHandle, "SpotifyPlus_GetSession");
    g_log = (LogFn)dlsym(g_nativeLibHandle, "SpotifyPlus_Log");

    g_getCurrentTrack = (GetCurrentTrackFn)dlsym(g_nativeLibHandle, "SpotifyPlus_GetCurrentTrack");
    g_getTrack = (GetTrackFn)dlsym(g_nativeLibHandle, "SpotifyPlus_GetTrack");
    g_getPlaybackPosition = (GetPlaybackPositionFn)dlsym(g_nativeLibHandle, "SpotifyPlus_GetPlaybackPosition");
    g_seek = (SeekFn)dlsym(g_nativeLibHandle, "SpotifyPlus_Seek");
    g_play = (PlayFn)dlsym(g_nativeLibHandle, "SpotifyPlus_Play");
    g_pause = (PauseFn)dlsym(g_nativeLibHandle, "SpotifyPlus_Pause");
    g_togglePlay = (TogglePlayFn)dlsym(g_nativeLibHandle, "SpotifyPlus_TogglePlay");
    g_skipNext = (SkipNextFn)dlsym(g_nativeLibHandle, "SpotifyPlus_SkipNext");
    g_skipPrevious = (SkipPreviousFn)dlsym(g_nativeLibHandle, "SpotifyPlus_SkipPrevious");

    g_toast = (ToastFn)dlsym(g_nativeLibHandle, "SpotifyPlus_Toast");
    g_openUri = (OpenUriFn)dlsym(g_nativeLibHandle, "SpotifyPlus_OpenUri");
    g_storageSet = (StorageSetFn)dlsym(g_nativeLibHandle, "SpotifyPlus_StorageSet");
    g_storageGet = (StorageGetFn)dlsym(g_nativeLibHandle, "SpotifyPlus_StorageGet");
    g_storageRemove = (StorageRemoveFn)dlsym(g_nativeLibHandle, "SpotifyPlus_StorageRemove");
    g_storageWriteText = (StorageWriteTextFn)dlsym(g_nativeLibHandle, "SpotifyPlus_StorageWriteText");
    g_storageWriteJson = (StorageWriteJsonFn)dlsym(g_nativeLibHandle, "SpotifyPlus_StorageWriteJson");
    g_storageWriteBinary = (StorageWriteBinaryFn)dlsym(g_nativeLibHandle, "SpotifyPlus_StorageWriteBinary");
    g_storageRead = (StorageReadFn)dlsym(g_nativeLibHandle, "SpotifyPlus_StorageRead");

    g_registerContextMenu = (RegisterContextMenuFn)dlsym(g_nativeLibHandle, "SpotifyPlus_RegisterContextMenu");
    g_registerSideDrawer = (RegisterSideDrawerFn)dlsym(g_nativeLibHandle, "SpotifyPlus_RegisterSideDrawer");

    g_registerSurface = (RegisterSurfaceFn)dlsym(g_nativeLibHandle, "SpotifyPlus_RegisterSurface");
    g_unregisterSurface = (UnregisterSurfaceFn)dlsym(g_nativeLibHandle, "SpotifyPlus_UnregisterSurface");
    g_commitSurface = (CommitSurfaceFn)dlsym(g_nativeLibHandle, "SpotifyPlus_CommitSurface");

    g_symbolsResolved = true;

    if (!g_setEventHandler || !g_getPlatformData || !g_getSession || !g_log || !g_getCurrentTrack || !g_getTrack || !g_getPlaybackPosition || !g_seek || !g_play || !g_pause || !g_togglePlay || !g_skipNext || !g_skipPrevious || !g_toast || !g_openUri || !g_storageSet || !g_storageGet || !g_storageRemove || !g_storageWriteText || !g_storageWriteJson || !g_storageWriteBinary || !g_storageRead || !g_registerSurface || !g_unregisterSurface || !g_commitSurface)
    {
        const char* err = dlerror();
        __android_log_print(ANDROID_LOG_ERROR, TAG, "dlsym failed: %s", err ? err : "null");
        return false;
    }

    return true;
}

static napi_value setEventHandler(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 1 || !resolve_symbols()) return undefined;

    bool result = g_setEventHandler(env, args[0]);
    if (!result) __android_log_write(ANDROID_LOG_ERROR, TAG, "setEventHandler failed");
    return undefined;
}

static napi_value loadDex(napi_env env, napi_callback_info info)
{
    size_t argc = 3;
    napi_value args[3];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 3 || !resolve_symbols()) return undefined;

    std::string scriptId = GetStringArg(env, args[0]);
    std::string dexPath = GetStringArg(env, args[1]);
    std::string pluginClass = GetStringArg(env, args[2]);

    g_loadDex(scriptId.c_str(), dexPath.c_str(), pluginClass.c_str());

    return undefined;
}

static napi_value getPlatformData(napi_env env, napi_callback_info info)
{
    napi_value result;
    if (!resolve_symbols())
    {
        napi_get_undefined(env, &result);
        return result;
    }

    PlatformData platformData{};
    g_getPlatformData(&platformData);

    napi_create_object(env, &result);
    napi_set_named_property(env, result, "clientVersion", CreateJsString(env, platformData.clientVersion));
    napi_set_named_property(env, result, "osName", CreateJsString(env, platformData.osName));
    napi_set_named_property(env, result, "osVersion", CreateJsString(env, platformData.osVersion));

    napi_value sdkVersion;
    napi_create_int32(env, platformData.sdkVersion, &sdkVersion);
    napi_set_named_property(env, result, "sdkVersion", sdkVersion);
    return result;
}

static napi_value getAccessToken(napi_env env, napi_callback_info info)
{
    napi_value result;
    if (!resolve_symbols())
    {
        napi_get_undefined(env, &result);
        return result;
    }

    SessionData session{};
    g_getSession(&session);
    napi_create_string_utf8(env, session.accessToken.c_str(), NAPI_AUTO_LENGTH, &result);
    return result;
}

static napi_value log(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 1 || !resolve_symbols()) return undefined;
    g_log(GetStringArg(env, args[0]).c_str());
    return undefined;
}

static napi_value getCurrentTrack(napi_env env, napi_callback_info info)
{
    napi_value result;
    if (!resolve_symbols())
    {
        napi_get_undefined(env, &result);
        return result;
    }

    SpotifyTrack track{};
    g_getCurrentTrack(&track);
    if (track.uri.empty() && track.title.empty())
    {
        napi_get_undefined(env, &result);
        return result;
    }

    return BuildTrackResult(env, track);
}

static napi_value getTrack(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1];
    napi_value result;
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 1 || !resolve_symbols())
    {
        napi_get_undefined(env, &result);
        return result;
    }

    std::string uri = GetStringArg(env, args[0]);
    SpotifyTrack track{};
    g_getTrack(uri.c_str(), &track);

    if (track.uri.empty() && track.title.empty())
    {
        napi_get_undefined(env, &result);
        return result;
    }

    return BuildTrackResult(env, track);
}

static napi_value getPlaybackPosition(napi_env env, napi_callback_info)
{
    napi_value result;
    if (!resolve_symbols())
    {
        napi_get_undefined(env, &result);
        return result;
    }

    double position = g_getPlaybackPosition();
    napi_create_double(env, position, &result);
    return result;
}

static napi_value seek(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 1 || !resolve_symbols()) return undefined;

    int64_t position = 0;
    if (napi_get_value_int64(env, args[0], &position) != napi_ok) return undefined;
    g_seek((long)position);
    return undefined;
}

static napi_value play(napi_env env, napi_callback_info)
{
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    if (resolve_symbols()) g_play();
    return undefined;
}

static napi_value pause(napi_env env, napi_callback_info)
{
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    if (resolve_symbols()) g_pause();
    return undefined;
}

static napi_value togglePlay(napi_env env, napi_callback_info)
{
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    if (resolve_symbols()) g_togglePlay();
    return undefined;
}

static napi_value skipNext(napi_env env, napi_callback_info)
{
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    if (resolve_symbols()) g_skipNext();
    return undefined;
}

static napi_value skipPrevious(napi_env env, napi_callback_info)
{
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    if (resolve_symbols()) g_skipPrevious();
    return undefined;
}

static napi_value toast(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value args[2];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 1 || !resolve_symbols()) return undefined;

    std::string text = GetStringArg(env, args[0]);
    bool longLength = false;
    if (argc > 1) napi_get_value_bool(env, args[1], &longLength);

    g_toast(text.c_str(), longLength);
    return undefined;
}

static napi_value openUri(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 1 || !resolve_symbols()) return undefined;

    std::string uri = GetStringArg(env, args[0]);
    g_openUri(uri.c_str());
    return undefined;
}

static napi_value storageSet(napi_env env, napi_callback_info info)
{
    size_t argc = 3;
    napi_value args[3];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 3 || !resolve_symbols()) return undefined;

    std::string scriptId = GetStringArg(env, args[0]);
    std::string key = GetStringArg(env, args[1]);
    std::string value = GetStringArg(env, args[2]);
    g_storageSet(scriptId.c_str(), key.c_str(), value.c_str());
    return undefined;
}

static napi_value storageGet(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value args[2];
    napi_value result;
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 2 || !resolve_symbols())
    {
        napi_get_undefined(env, &result);
        return result;
    }

    std::string scriptId = GetStringArg(env, args[0]);
    std::string key = GetStringArg(env, args[1]);

    StorageValueResult value{};
    g_storageGet(scriptId.c_str(), key.c_str(), &value);
    if (!value.found)
    {
        napi_get_undefined(env, &result);
        return result;
    }

    napi_create_string_utf8(env, value.value.c_str(), NAPI_AUTO_LENGTH, &result);
    return result;
}

static napi_value storageRemove(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value args[2];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 2 || !resolve_symbols()) return undefined;

    std::string scriptId = GetStringArg(env, args[0]);
    std::string key = GetStringArg(env, args[1]);
    g_storageRemove(scriptId.c_str(), key.c_str());
    return undefined;
}

static napi_value storageWriteText(napi_env env, napi_callback_info info)
{
    size_t argc = 3;
    napi_value args[3];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 3 || !resolve_symbols()) return undefined;

    std::string scriptId = GetStringArg(env, args[0]);
    std::string path = GetStringArg(env, args[1]);
    std::string value = GetStringArg(env, args[2]);
    g_storageWriteText(scriptId.c_str(), path.c_str(), value.c_str());
    return undefined;
}

static napi_value storageWriteJson(napi_env env, napi_callback_info info)
{
    size_t argc = 3;
    napi_value args[3];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 3 || !resolve_symbols()) return undefined;

    std::string scriptId = GetStringArg(env, args[0]);
    std::string path = GetStringArg(env, args[1]);
    std::string value = GetStringArg(env, args[2]);
    g_storageWriteJson(scriptId.c_str(), path.c_str(), value.c_str());
    return undefined;
}

static napi_value storageWriteBinary(napi_env env, napi_callback_info info)
{
    size_t argc = 3;
    napi_value args[3];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 3 || !resolve_symbols()) return undefined;

    std::string scriptId = GetStringArg(env, args[0]);
    std::string path = GetStringArg(env, args[1]);
    std::string data = GetStringArg(env, args[2]);
    g_storageWriteBinary(scriptId.c_str(), path.c_str(), data.c_str());
    return undefined;
}

static napi_value storageRead(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value args[2];
    napi_value result;
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 2 || !resolve_symbols())
    {
        napi_get_undefined(env, &result);
        return result;
    }

    std::string scriptId = GetStringArg(env, args[0]);
    std::string path = GetStringArg(env, args[1]);

    StorageReadResult readResult{};
    g_storageRead(scriptId.c_str(), path.c_str(), &readResult);
    if (!readResult.found)
    {
        napi_get_undefined(env, &result);
        return result;
    }

    napi_create_object(env, &result);
    napi_set_named_property(env, result, "type", CreateJsString(env, readResult.type));
    napi_set_named_property(env, result, "value", CreateJsString(env, readResult.value));
    napi_set_named_property(env, result, "data", CreateJsString(env, readResult.data));
    return result;
}

static napi_value registerContextMenu(napi_env env, napi_callback_info info)
{
    size_t argc = 3;
    napi_value args[3];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 3 || !resolve_symbols()) return undefined;

    std::string id = GetStringArg(env, args[0]);
    std::string scriptId = GetStringArg(env, args[1]);
    std::string title = GetStringArg(env, args[2]);
    g_registerContextMenu(id.c_str(), scriptId.c_str(), title.c_str());
    return undefined;
}

static napi_value registerSideDrawer(napi_env env, napi_callback_info info)
{
    size_t argc = 3;
    napi_value args[3];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 3 || !resolve_symbols()) return undefined;

    std::string id = GetStringArg(env, args[0]);
    std::string scriptId = GetStringArg(env, args[1]);
    std::string title = GetStringArg(env, args[2]);
    g_registerSideDrawer(id.c_str(), scriptId.c_str(), title.c_str());
    return undefined;
}

static napi_value registerSurface(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 1 || !resolve_symbols()) return undefined;
    std::string surfaceId = GetStringArg(env, args[0]);
    g_registerSurface(surfaceId.c_str());
    return undefined;
}

static napi_value unregisterSurface(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 1 || !resolve_symbols()) return undefined;
    std::string surfaceId = GetStringArg(env, args[0]);
    g_unregisterSurface(surfaceId.c_str());
    return undefined;
}

static napi_value commitSurface(napi_env env, napi_callback_info info)
{
    size_t argc = 2;
    napi_value args[2];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 2 || !resolve_symbols()) return undefined;
    std::string surfaceId = GetStringArg(env, args[0]);
    std::string opsJson = GetStringArg(env, args[1]);
    g_commitSurface(surfaceId.c_str(), opsJson.c_str());
    return undefined;
}

static napi_value sendToJava(napi_env env, napi_callback_info info)
{
    size_t argc = 1;
    napi_value args[1];
    napi_value undefined;
    napi_get_undefined(env, &undefined);
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    if (argc < 1 || !resolve_symbols()) return undefined;
    g_sendToJava(GetStringArg(env, args[0]).c_str());
    return undefined;
}

static napi_value pollFromJava(napi_env env, napi_callback_info)
{
    napi_value result;
    if (!resolve_symbols())
    {
        napi_get_undefined(env, &result);
        return result;
    }

    char* msg = g_pollFromJava();
    if (!msg)
    {
        napi_get_undefined(env, &result);
        return result;
    }

    napi_create_string_utf8(env, msg, NAPI_AUTO_LENGTH, &result);
    g_freeString(msg);
    return result;
}

static napi_value init(napi_env env, napi_value exports)
{
    napi_value fn;

    napi_create_function(env, "setEventHandler", NAPI_AUTO_LENGTH, setEventHandler, nullptr, &fn);
    napi_set_named_property(env, exports, "setEventHandler", fn);

    napi_create_function(env, "sendToJava", NAPI_AUTO_LENGTH, sendToJava, nullptr, &fn);
    napi_set_named_property(env, exports, "sendToJava", fn);

    napi_create_function(env, "pollFromJava", NAPI_AUTO_LENGTH, pollFromJava, nullptr, &fn);
    napi_set_named_property(env, exports, "pollFromJava", fn);

    napi_create_function(env, "loadDex", NAPI_AUTO_LENGTH, loadDex, nullptr, &fn);
    napi_set_named_property(env, exports, "loadDex", fn);

    napi_create_function(env, "getPlatformData", NAPI_AUTO_LENGTH, getPlatformData, nullptr, &fn);
    napi_set_named_property(env, exports, "getPlatformData", fn);

    napi_create_function(env, "getAccessToken", NAPI_AUTO_LENGTH, getAccessToken, nullptr, &fn);
    napi_set_named_property(env, exports, "getAccessToken", fn);

    napi_create_function(env, "log", NAPI_AUTO_LENGTH, log, nullptr, &fn);
    napi_set_named_property(env, exports, "log", fn);

    napi_create_function(env, "getCurrentTrack", NAPI_AUTO_LENGTH, getCurrentTrack, nullptr, &fn);
    napi_set_named_property(env, exports, "getCurrentTrack", fn);

    napi_create_function(env, "getTrack", NAPI_AUTO_LENGTH, getTrack, nullptr, &fn);
    napi_set_named_property(env, exports, "getTrack", fn);

    napi_create_function(env, "getPlaybackPosition", NAPI_AUTO_LENGTH, getPlaybackPosition, nullptr, &fn);
    napi_set_named_property(env, exports, "getPlaybackPosition", fn);

    napi_create_function(env, "seek", NAPI_AUTO_LENGTH, seek, nullptr, &fn);
    napi_set_named_property(env, exports, "seek", fn);

    napi_create_function(env, "play", NAPI_AUTO_LENGTH, play, nullptr, &fn);
    napi_set_named_property(env, exports, "play", fn);

    napi_create_function(env, "pause", NAPI_AUTO_LENGTH, pause, nullptr, &fn);
    napi_set_named_property(env, exports, "pause", fn);

    napi_create_function(env, "togglePlay", NAPI_AUTO_LENGTH, togglePlay, nullptr, &fn);
    napi_set_named_property(env, exports, "togglePlay", fn);

    napi_create_function(env, "skipNext", NAPI_AUTO_LENGTH, skipNext, nullptr, &fn);
    napi_set_named_property(env, exports, "skipNext", fn);

    napi_create_function(env, "skipPrevious", NAPI_AUTO_LENGTH, skipPrevious, nullptr, &fn);
    napi_set_named_property(env, exports, "skipPrevious", fn);

    napi_create_function(env, "toast", NAPI_AUTO_LENGTH, toast, nullptr, &fn);
    napi_set_named_property(env, exports, "toast", fn);

    napi_create_function(env, "openUri", NAPI_AUTO_LENGTH, openUri, nullptr, &fn);
    napi_set_named_property(env, exports, "openUri", fn);

    napi_create_function(env, "storageSet", NAPI_AUTO_LENGTH, storageSet, nullptr, &fn);
    napi_set_named_property(env, exports, "storageSet", fn);

    napi_create_function(env, "storageGet", NAPI_AUTO_LENGTH, storageGet, nullptr, &fn);
    napi_set_named_property(env, exports, "storageGet", fn);

    napi_create_function(env, "storageRemove", NAPI_AUTO_LENGTH, storageRemove, nullptr, &fn);
    napi_set_named_property(env, exports, "storageRemove", fn);

    napi_create_function(env, "storageWriteText", NAPI_AUTO_LENGTH, storageWriteText, nullptr, &fn);
    napi_set_named_property(env, exports, "storageWriteText", fn);

    napi_create_function(env, "storageWriteJson", NAPI_AUTO_LENGTH, storageWriteJson, nullptr, &fn);
    napi_set_named_property(env, exports, "storageWriteJson", fn);

    napi_create_function(env, "storageWriteBinary", NAPI_AUTO_LENGTH, storageWriteBinary, nullptr, &fn);
    napi_set_named_property(env, exports, "storageWriteBinary", fn);

    napi_create_function(env, "storageRead", NAPI_AUTO_LENGTH, storageRead, nullptr, &fn);
    napi_set_named_property(env, exports, "storageRead", fn);

    napi_create_function(env, "registerContextMenu", NAPI_AUTO_LENGTH, registerContextMenu, nullptr, &fn);
    napi_set_named_property(env, exports, "registerContextMenu", fn);

    napi_create_function(env, "registerSideDrawer", NAPI_AUTO_LENGTH, registerSideDrawer, nullptr, &fn);
    napi_set_named_property(env, exports, "registerSideDrawer", fn);

    napi_create_function(env, "registerSurface", NAPI_AUTO_LENGTH, registerSurface, nullptr, &fn);
    napi_set_named_property(env, exports, "registerSurface", fn);

    napi_create_function(env, "unregisterSurface", NAPI_AUTO_LENGTH, unregisterSurface, nullptr, &fn);
    napi_set_named_property(env, exports, "unregisterSurface", fn);

    napi_create_function(env, "commitSurface", NAPI_AUTO_LENGTH, commitSurface, nullptr, &fn);
    napi_set_named_property(env, exports, "commitSurface", fn);

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
