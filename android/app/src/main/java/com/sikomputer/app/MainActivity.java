package com.sikomputer.app;

import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new AndroidDownloader(), "AndroidDownloader");
            this.bridge.getWebView().addJavascriptInterface(new AndroidUpdater(), "AndroidUpdater");
        }
    }

    private void emitUpdateEvent(final String status, final String message, final int progress) {
        runOnUiThread(() -> {
            if (bridge == null || bridge.getWebView() == null) return;
            try {
                JSONObject payload = new JSONObject();
                payload.put("status", status);
                payload.put("message", message);
                payload.put("progress", progress);
                String js = "window.dispatchEvent(new CustomEvent('sikomputer:apk-update-status', { detail: "
                        + payload.toString() + " }));";
                bridge.getWebView().evaluateJavascript(js, null);
            } catch (Exception ignored) {
            }
        });
    }

    private static boolean isAllowedGitHubUrl(String rawUrl) {
        if (rawUrl == null || !rawUrl.startsWith("https://")) return false;
        try {
            URL url = new URL(rawUrl);
            String host = url.getHost().toLowerCase();
            return host.equals("github.com")
                    || host.equals("objects.githubusercontent.com")
                    || host.equals("release-assets.githubusercontent.com")
                    || host.endsWith(".githubusercontent.com");
        } catch (Exception e) {
            return false;
        }
    }

    public class AndroidUpdater {
        @JavascriptInterface
        public String getAppInfo() {
            try {
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                long vCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                        ? pInfo.getLongVersionCode()
                        : pInfo.versionCode;
                boolean canInstall = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                        || getPackageManager().canRequestPackageInstalls();

                JSONObject obj = new JSONObject();
                obj.put("platform", "android-apk");
                obj.put("packageName", getPackageName());
                obj.put("versionName", pInfo.versionName != null ? pInfo.versionName : "1.0.0");
                obj.put("versionCode", vCode);
                obj.put("canRequestPackageInstalls", canInstall);
                return obj.toString();
            } catch (Exception e) {
                return "{\"platform\":\"android-apk\",\"versionName\":\"1.0.0\",\"versionCode\":1}";
            }
        }

        @JavascriptInterface
        public void openDownloadUrl(final String rawUrl) {
            if (!isAllowedGitHubUrl(rawUrl)) return;
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(rawUrl));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Tidak dapat membuka tautan: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void downloadAndInstallApk(final String apkUrl) {
            if (!isAllowedGitHubUrl(apkUrl)) {
                emitUpdateEvent("error", "URL unduhan tidak valid atau bukan dari GitHub.", 0);
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                emitUpdateEvent("permission-required", "Izinkan pemasangan aplikasi dari sumber ini di Pengaturan Android.", 0);
                runOnUiThread(() -> {
                    Toast.makeText(
                            MainActivity.this,
                            "Izinkan 'Install unknown apps' untuk SiKomputer lalu klik Update lagi.",
                            Toast.LENGTH_LONG
                    ).show();
                    Intent settingsIntent = new Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + getPackageName())
                    );
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(settingsIntent);
                });
                return;
            }

            new Thread(() -> {
                HttpURLConnection conn = null;
                try {
                    emitUpdateEvent("downloading", "Mengunduh pembaruan SiKomputer.apk...", 5);
                    String currentUrl = apkUrl;
                    int redirects = 0;

                    while (redirects < 6) {
                        URL url = new URL(currentUrl);
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setInstanceFollowRedirects(false);
                        conn.setConnectTimeout(15000);
                        conn.setReadTimeout(30000);
                        conn.setRequestProperty("User-Agent", "SiKomputer-Android-Updater");
                        int code = conn.getResponseCode();
                        if (code == HttpURLConnection.HTTP_MOVED_PERM
                                || code == HttpURLConnection.HTTP_MOVED_TEMP
                                || code == HttpURLConnection.HTTP_SEE_OTHER
                                || code == 307
                                || code == 308) {
                            String location = conn.getHeaderField("Location");
                            conn.disconnect();
                            if (!isAllowedGitHubUrl(location)) {
                                throw new SecurityException("Redirect menuju host di luar GitHub diblokir.");
                            }
                            currentUrl = location;
                            redirects++;
                        } else {
                            break;
                        }
                    }

                    if (conn == null || conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
                        int errCode = conn != null ? conn.getResponseCode() : 0;
                        throw new RuntimeException("Gagal mengunduh APK (HTTP " + errCode + ")");
                    }

                    long totalLength = conn.getContentLengthLong();
                    File updateDir = new File(getCacheDir(), "updates");
                    if (!updateDir.exists()) updateDir.mkdirs();
                    File apkFile = new File(updateDir, "SiKomputer-update.apk");

                    try (InputStream in = conn.getInputStream();
                         FileOutputStream out = new FileOutputStream(apkFile)) {
                        byte[] buf = new byte[16384];
                        long downloaded = 0;
                        int lastPct = 5;
                        int len;
                        while ((len = in.read(buf)) != -1) {
                            out.write(buf, 0, len);
                            downloaded += len;
                            if (totalLength > 0) {
                                int pct = (int) Math.min(99, Math.max(5, (downloaded * 100L) / totalLength));
                                if (pct >= lastPct + 5) {
                                    lastPct = pct;
                                    emitUpdateEvent("downloading", "Mengunduh APK (" + pct + "%)...", pct);
                                }
                            }
                        }
                    }

                    if (apkFile.length() < 100000) {
                        throw new RuntimeException("Berkas APK hasil unduhan tidak lengkap.");
                    }

                    emitUpdateEvent("installing", "Membuka pemasang pembaruan Android...", 100);
                    final Uri contentUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider",
                            apkFile
                    );

                    runOnUiThread(() -> {
                        Intent installIntent = new Intent(Intent.ACTION_VIEW);
                        installIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
                        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(installIntent);
                    });
                } catch (Exception e) {
                    emitUpdateEvent("error", "Gagal update APK: " + e.getMessage(), 0);
                    runOnUiThread(() -> Toast.makeText(
                            MainActivity.this,
                            "Gagal update APK: " + e.getMessage(),
                            Toast.LENGTH_LONG
                    ).show());
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }).start();
        }
    }

    public class AndroidDownloader {
        @JavascriptInterface
        public void saveFile(final String base64Data, final String fileName, final String mimeType) {
            try {
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                String safeName = (fileName == null || fileName.isEmpty())
                        ? "sikomputer-" + System.currentTimeMillis()
                        : fileName;
                String safeMime = (mimeType == null || mimeType.isEmpty())
                        ? "application/octet-stream"
                        : mimeType;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
                    values.put(MediaStore.Downloads.MIME_TYPE, safeMime);
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SiKomputer");

                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                            if (out != null) {
                                out.write(bytes);
                            }
                        }
                    }
                } else {
                    File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    if (!dir.exists()) dir.mkdirs();
                    File file = new File(dir, safeName);
                    try (FileOutputStream fos = new FileOutputStream(file)) {
                        fos.write(bytes);
                    }
                }

                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Tersimpan ke Downloads: " + safeName,
                        Toast.LENGTH_LONG
                ).show());
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "Gagal menyimpan berkas: " + e.getMessage(),
                        Toast.LENGTH_LONG
                ).show());
            }
        }
    }
}
