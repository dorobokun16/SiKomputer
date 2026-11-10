using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace SiKomputer
{
    static class Program
    {
        private static readonly object UpdateLock = new object();

        [STAThread]
        static void Main()
        {
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | SecurityProtocolType.Tls12;

                // 1. Ekstrak aset web tersemat ke folder cache pengguna (jangan menimpa versi lebih baru hasil auto-update)
                string appDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SiKomputer-Standalone");
                string webDir = Path.Combine(appDir, "web");
                Directory.CreateDirectory(webDir);

                ExtractEmbeddedBundleIfNewer(webDir);

                // 2. Alokasikan port lokal bebas
                int port = 58280;
                HttpListener listener = null;
                for (int p = 58280; p <= 58350; p++)
                {
                    try
                    {
                        listener = new HttpListener();
                        listener.Prefixes.Add("http://127.0.0.1:" + p + "/");
                        listener.Start();
                        port = p;
                        break;
                    }
                    catch
                    {
                        listener = null;
                    }
                }

                if (listener == null)
                {
                    MessageBox.Show(
                        "Gagal membuka port jaringan lokal untuk server aplikasi.",
                        "SiKomputer",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                    return;
                }

                // 3. Jalankan HTTP server thread di latar belakang
                bool running = true;
                Thread serverThread = new Thread(() =>
                {
                    while (running)
                    {
                        try
                        {
                            HttpListenerContext context = listener.GetContext();
                            ThreadPool.QueueUserWorkItem((state) =>
                            {
                                HandleRequest(context, webDir);
                            });
                        }
                        catch
                        {
                            if (!running) break;
                        }
                    }
                });
                serverThread.IsBackground = true;
                serverThread.Start();

                string appUrl = "http://127.0.0.1:" + port + "/";

                // 4. Jalankan aplikasi dalam jendela native standalone (--app=)
                Process browserProcess = LaunchDesktopWindow(appUrl);

                if (browserProcess != null)
                {
                    browserProcess.WaitForExit();
                }
                else
                {
                    Process.Start(appUrl);
                    Thread.Sleep(3000);
                }

                running = false;
                try { listener.Stop(); } catch { }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Terjadi kendala saat membuka SiKomputer: " + ex.Message,
                    "SiKomputer Desktop",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        static int ReadVersionCodeFromFile(string versionJsonPath)
        {
            try
            {
                if (!File.Exists(versionJsonPath)) return 0;
                string txt = File.ReadAllText(versionJsonPath, Encoding.UTF8);
                return ParseVersionCode(txt);
            }
            catch
            {
                return 0;
            }
        }

        static string ReadVersionStringFromFile(string versionJsonPath)
        {
            try
            {
                if (!File.Exists(versionJsonPath)) return "1.1.0";
                string txt = File.ReadAllText(versionJsonPath, Encoding.UTF8);
                Match m = Regex.Match(txt, "\"version\"\\s*:\\s*\"([^\"]+)\"");
                return m.Success ? m.Groups[1].Value : "1.1.0";
            }
            catch
            {
                return "1.1.0";
            }
        }

        static int ParseVersionCode(string json)
        {
            if (string.IsNullOrEmpty(json)) return 0;
            Match m = Regex.Match(json, "\"versionCode\"\\s*:\\s*(\\d+)");
            int val;
            if (m.Success && int.TryParse(m.Groups[1].Value, out val)) return val;
            return 0;
        }

        static void ExtractEmbeddedBundleIfNewer(string webDir)
        {
            Assembly assembly = Assembly.GetExecutingAssembly();
            using (Stream stream = assembly.GetManifestResourceStream("dist.zip"))
            {
                if (stream == null) return;
                using (ZipArchive archive = new ZipArchive(stream))
                {
                    int embeddedCode = 0;
                    ZipArchiveEntry metaEntry = archive.GetEntry("version.json");
                    if (metaEntry != null)
                    {
                        using (StreamReader sr = new StreamReader(metaEntry.Open(), Encoding.UTF8))
                        {
                            embeddedCode = ParseVersionCode(sr.ReadToEnd());
                        }
                    }

                    int existingCode = ReadVersionCodeFromFile(Path.Combine(webDir, "version.json"));
                    bool hasIndex = File.Exists(Path.Combine(webDir, "index.html"));
                    if (hasIndex && existingCode > embeddedCode)
                    {
                        return;
                    }

                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        string destPath = Path.Combine(webDir, entry.FullName);
                        if (string.IsNullOrEmpty(entry.Name))
                        {
                            Directory.CreateDirectory(destPath);
                        }
                        else
                        {
                            string dir = Path.GetDirectoryName(destPath);
                            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

                            FileInfo fi = new FileInfo(destPath);
                            if (!fi.Exists || fi.Length != entry.Length || Math.Abs((fi.LastWriteTimeUtc - entry.LastWriteTime.UtcDateTime).TotalSeconds) > 2)
                            {
                                entry.ExtractToFile(destPath, true);
                            }
                        }
                    }
                }
            }
        }

        static bool IsAllowedGitHubUrl(string rawUrl)
        {
            Uri uri;
            if (!Uri.TryCreate(rawUrl, UriKind.Absolute, out uri)) return false;
            if (uri.Scheme != Uri.UriSchemeHttps) return false;
            string host = uri.Host.ToLowerInvariant();
            return host == "github.com"
                || host == "dorobokun16.github.io"
                || host == "raw.githubusercontent.com"
                || host == "objects.githubusercontent.com"
                || host == "release-assets.githubusercontent.com"
                || host.EndsWith(".githubusercontent.com");
        }

        static void WriteJsonResponse(HttpListenerResponse response, int statusCode, string json)
        {
            byte[] buf = Encoding.UTF8.GetBytes(json);
            response.StatusCode = statusCode;
            response.ContentType = "application/json; charset=utf-8";
            response.AddHeader("Cache-Control", "no-store");
            response.ContentLength64 = buf.Length;
            response.OutputStream.Write(buf, 0, buf.Length);
            response.OutputStream.Close();
        }

        static void HandleRequest(HttpListenerContext context, string rootDir)
        {
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath;
                if (rawUrl == "/__launcher/info")
                {
                    string vPath = Path.Combine(rootDir, "version.json");
                    int vCode = ReadVersionCodeFromFile(vPath);
                    string vStr = ReadVersionStringFromFile(vPath);
                    string infoJson = string.Format(
                        "{{\"platform\":\"windows-exe\",\"canSelfUpdateWeb\":true,\"webVersion\":\"{0}\",\"webVersionCode\":{1}}}",
                        vStr.Replace("\"", ""),
                        vCode
                    );
                    WriteJsonResponse(context.Response, 200, infoJson);
                    return;
                }

                if (rawUrl == "/__launcher/apply-update" && context.Request.HttpMethod.Equals("POST", StringComparison.OrdinalIgnoreCase))
                {
                    string bodyText = "";
                    using (StreamReader reader = new StreamReader(context.Request.InputStream, Encoding.UTF8))
                    {
                        bodyText = reader.ReadToEnd();
                    }

                    Match urlMatch = Regex.Match(bodyText, "\"webBundleUrl\"\\s*:\\s*\"([^\"]+)\"");
                    if (!urlMatch.Success)
                    {
                        WriteJsonResponse(context.Response, 400, "{\"ok\":false,\"error\":\"URL paket web tidak ditemukan.\"}");
                        return;
                    }

                    string bundleUrl = urlMatch.Groups[1].Value;
                    if (!IsAllowedGitHubUrl(bundleUrl))
                    {
                        WriteJsonResponse(context.Response, 400, "{\"ok\":false,\"error\":\"URL pembaruan harus berasal dari domain GitHub resmi.\"}");
                        return;
                    }

                    string tmpZip = Path.Combine(Path.GetTempPath(), "sikomputer-update-" + Guid.NewGuid().ToString("N") + ".zip");
                    string stagingDir = Path.Combine(Path.GetTempPath(), "sikomputer-stage-" + Guid.NewGuid().ToString("N"));
                    try
                    {
                        using (WebClient wc = new WebClient())
                        {
                            wc.Headers.Add("User-Agent", "SiKomputer-Windows-Updater");
                            wc.DownloadFile(bundleUrl, tmpZip);
                        }

                        using (ZipArchive zf = ZipFile.OpenRead(tmpZip))
                        {
                            if (zf.GetEntry("index.html") == null)
                            {
                                throw new Exception("Paket pembaruan tidak berisi index.html yang valid.");
                            }
                            Directory.CreateDirectory(stagingDir);
                            zf.ExtractToDirectory(stagingDir);
                        }

                        lock (UpdateLock)
                        {
                            CopyDirectoryOverwrite(stagingDir, rootDir);
                        }

                        WriteJsonResponse(context.Response, 200, "{\"ok\":true,\"updated\":true}");
                    }
                    catch (Exception ex)
                    {
                        string safeMsg = (ex.Message ?? "Gagal memperbarui").Replace("\\", "\\\\").Replace("\"", "\\\"");
                        WriteJsonResponse(context.Response, 500, "{\"ok\":false,\"error\":\"" + safeMsg + "\"}");
                    }
                    finally
                    {
                        try { if (File.Exists(tmpZip)) File.Delete(tmpZip); } catch { }
                        try { if (Directory.Exists(stagingDir)) Directory.Delete(stagingDir, true); } catch { }
                    }
                    return;
                }

                if (rawUrl == "/" || string.IsNullOrEmpty(rawUrl)) rawUrl = "/index.html";

                string filePath = Path.Combine(rootDir, rawUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

                // Dukungan SPA client-side routing
                if (!File.Exists(filePath))
                {
                    filePath = Path.Combine(rootDir, "index.html");
                }

                byte[] buffer;
                lock (UpdateLock)
                {
                    buffer = File.ReadAllBytes(filePath);
                }

                string ext = Path.GetExtension(filePath).ToLower();
                string mime = "application/octet-stream";

                if (ext == ".html" || ext == ".htm") mime = "text/html; charset=utf-8";
                else if (ext == ".js" || ext == ".mjs") mime = "application/javascript; charset=utf-8";
                else if (ext == ".css") mime = "text/css; charset=utf-8";
                else if (ext == ".svg") mime = "image/svg+xml";
                else if (ext == ".png") mime = "image/png";
                else if (ext == ".ico") mime = "image/x-icon";
                else if (ext == ".jpg" || ext == ".jpeg") mime = "image/jpeg";
                else if (ext == ".woff2") mime = "font/woff2";
                else if (ext == ".wasm") mime = "application/wasm";
                else if (ext == ".json" || ext == ".webmanifest") mime = "application/json";

                context.Response.ContentType = mime;
                string fName = Path.GetFileName(filePath);
                if (ext == ".html" || fName == "sw.js" || fName == "version.json")
                {
                    context.Response.AddHeader("Cache-Control", "no-cache, must-revalidate");
                }
                context.Response.ContentLength64 = buffer.Length;
                context.Response.OutputStream.Write(buffer, 0, buffer.Length);
                context.Response.OutputStream.Close();
            }
            catch
            {
                try { context.Response.StatusCode = 404; context.Response.Close(); } catch { }
            }
        }

        static void CopyDirectoryOverwrite(string sourceDir, string targetDir)
        {
            Directory.CreateDirectory(targetDir);
            foreach (string file in Directory.GetFiles(sourceDir))
            {
                string destFile = Path.Combine(targetDir, Path.GetFileName(file));
                File.Copy(file, destFile, true);
            }
            foreach (string dir in Directory.GetDirectories(sourceDir))
            {
                string destSub = Path.Combine(targetDir, Path.GetFileName(dir));
                CopyDirectoryOverwrite(dir, destSub);
            }
        }

        static Process LaunchDesktopWindow(string url)
        {
            string profileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SiKomputer-Profile");

            // 1. Coba Microsoft Edge (Bawaan Windows 10 & 11)
            string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
            if (!File.Exists(edgePath))
            {
                edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");
            }

            if (File.Exists(edgePath))
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = edgePath,
                    Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1400,900", url, profileDir),
                    UseShellExecute = false
                };
                return Process.Start(psi);
            }

            // 2. Coba Google Chrome
            string chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe");
            if (!File.Exists(chromePath))
            {
                chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe");
            }

            if (File.Exists(chromePath))
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = chromePath,
                    Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1400,900", url, profileDir),
                    UseShellExecute = false
                };
                return Process.Start(psi);
            }

            return null;
        }
    }
}
