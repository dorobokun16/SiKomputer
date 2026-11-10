import argparse
import json
import os
import re
import shutil
import stat
import subprocess
import tempfile
import zipfile


def main():
    parser = argparse.ArgumentParser(description="Build portable installers for SiKomputer")
    parser.add_argument(
        "--only",
        default="all",
        help="Comma-separated targets: web,exe,mac,apk (default: all)",
    )
    args = parser.parse_args()
    targets = {"web", "exe", "mac", "apk"} if args.only == "all" else {t.strip().lower() for t in args.only.split(",") if t.strip()}

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dist_dir = os.path.join(root, "dist")
    dist_mobile = os.path.join(root, "dist-mobile")
    scripts_dir = os.path.join(root, "scripts")
    mac_template = os.path.join(scripts_dir, "macos", "SiKomputer.app")
    pub_dl_dir = os.path.join(root, "public", "downloads")
    android_dir = os.path.join(root, "android")

    if not os.path.isdir(dist_dir):
        raise FileNotFoundError("dist/ tidak ditemukan. Jalankan 'npm run build' terlebih dahulu.")

    with open(os.path.join(root, "package.json"), "r", encoding="utf-8") as fp:
        pkg = json.load(fp)
    version = str(pkg.get("version", "1.1.0"))
    version_code = int(pkg.get("sikomputer", {}).get("versionCode", 2))

    os.makedirs(pub_dl_dir, exist_ok=True)
    dist_dl_dir = os.path.join(dist_dir, "downloads")
    os.makedirs(dist_dl_dir, exist_ok=True)

    need_clean_web = bool(targets & {"web", "exe", "mac"})
    if need_clean_web:
        web_dist_zip = os.path.join(pub_dl_dir, "SiKomputer-web-dist.zip")
        dist_embed_zip = os.path.join(scripts_dir, "dist.zip")
        with tempfile.TemporaryDirectory() as tmp:
            clean_web = os.path.join(tmp, "web")
            os.makedirs(clean_web, exist_ok=True)
            for item in os.listdir(dist_dir):
                if item == "downloads":
                    continue
                src = os.path.join(dist_dir, item)
                dst = os.path.join(clean_web, item)
                if os.path.isdir(src):
                    shutil.copytree(src, dst)
                else:
                    shutil.copy2(src, dst)

            zip_targets = []
            if "web" in targets:
                zip_targets.append(web_dist_zip)
            if "exe" in targets:
                zip_targets.append(dist_embed_zip)

            for target_zip in zip_targets:
                if os.path.exists(target_zip):
                    os.remove(target_zip)
                with zipfile.ZipFile(target_zip, "w", zipfile.ZIP_DEFLATED) as zf:
                    for folder, _, files in os.walk(clean_web):
                        for fname in files:
                            full_path = os.path.join(folder, fname)
                            rel_path = os.path.relpath(full_path, clean_web).replace("\\", "/")
                            zf.write(full_path, rel_path)
            if "web" in targets:
                print(f"1. SiKomputer-web-dist.zip siap ({os.path.getsize(web_dist_zip)} bytes)")

            if "exe" in targets:
                csc = r"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
                exe_out = os.path.join(pub_dl_dir, "SiKomputer.exe")
                if os.name == "nt" and os.path.exists(csc):
                    cmd = [
                        csc,
                        "/target:winexe",
                        f"/out:{exe_out}",
                        f"/win32icon:{os.path.join(scripts_dir, 'app.ico')}",
                        f"/resource:{dist_embed_zip},dist.zip",
                        "/reference:System.dll,System.Core.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll,System.Windows.Forms.dll",
                        os.path.join(scripts_dir, "SiKomputerLauncher.cs"),
                    ]
                    res_exe = subprocess.run(cmd, capture_output=True, text=True)
                    if res_exe.returncode != 0:
                        print("CSC Output:", res_exe.stdout, res_exe.stderr)
                        raise SystemExit(1)
                    shutil.copy2(exe_out, os.path.join(dist_dl_dir, "SiKomputer.exe"))
                    print(f"2. SiKomputer.exe siap ({os.path.getsize(exe_out)} bytes)")
                else:
                    print("2. Lewati build SiKomputer.exe (bukan Windows csc.exe).")

            if "mac" in targets and os.path.isdir(mac_template):
                mac_stage = os.path.join(tmp, "SiKomputer.app")
                shutil.copytree(mac_template, mac_stage)
                plist_path = os.path.join(mac_stage, "Contents", "Info.plist")
                if os.path.exists(plist_path):
                    with open(plist_path, "r", encoding="utf-8") as fp:
                        plist = fp.read()
                    plist = re.sub(
                        r"(<key>CFBundleShortVersionString</key>\s*<string>)[^<]+(</string>)",
                        rf"\g<1>{version}\g<2>",
                        plist,
                    )
                    plist = re.sub(
                        r"(<key>CFBundleVersion</key>\s*<string>)[^<]+(</string>)",
                        rf"\g<1>{version_code}\g<2>",
                        plist,
                    )
                    with open(plist_path, "w", encoding="utf-8") as fp:
                        fp.write(plist)

                mac_web = os.path.join(mac_stage, "Contents", "Resources", "web")
                if os.path.exists(mac_web):
                    shutil.rmtree(mac_web)
                shutil.copytree(clean_web, mac_web)

                mac_zip_out = os.path.join(pub_dl_dir, "SiKomputer-macOS.zip")
                with zipfile.ZipFile(mac_zip_out, "w", zipfile.ZIP_DEFLATED) as zf:
                    for folder, _, files in os.walk(mac_stage):
                        for fname in files:
                            full_path = os.path.join(folder, fname)
                            rel_path = os.path.relpath(full_path, tmp).replace("\\", "/")
                            zinfo = zipfile.ZipInfo(rel_path)
                            if rel_path.endswith("Contents/MacOS/SiKomputer"):
                                zinfo.external_attr = 0o100755 << 16
                            else:
                                zinfo.external_attr = 0o100644 << 16
                            zinfo.compress_type = zipfile.ZIP_DEFLATED
                            with open(full_path, "rb") as fp:
                                zf.writestr(zinfo, fp.read())
                shutil.copy2(mac_zip_out, os.path.join(dist_dl_dir, "SiKomputer-macOS.zip"))
                print(f"3. SiKomputer-macOS.zip siap ({os.path.getsize(mac_zip_out)} bytes)")

    if "apk" in targets:
        jdk_home = os.environ.get("JAVA_HOME") or r"C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot"
        default_sdk = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Android", "Sdk")
        sdk_home = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT") or default_sdk

        if os.path.isdir(sdk_home):
            if os.path.exists(dist_mobile):
                shutil.rmtree(dist_mobile)
            os.makedirs(dist_mobile, exist_ok=True)
            for item in os.listdir(dist_dir):
                if item in ("downloads", "sw.js"):
                    continue
                src = os.path.join(dist_dir, item)
                dst = os.path.join(dist_mobile, item)
                if os.path.isdir(src):
                    shutil.copytree(src, dst)
                else:
                    shutil.copy2(src, dst)

            res_sync = subprocess.run("npx cap sync android", shell=True, cwd=root, capture_output=True, text=True)
            if res_sync.returncode != 0:
                print("Cap sync failed:", res_sync.stdout, res_sync.stderr)
                raise SystemExit(1)

            env = os.environ.copy()
            if os.path.isdir(jdk_home):
                env["JAVA_HOME"] = jdk_home
                env["PATH"] = os.path.join(jdk_home, "bin") + os.pathsep + env.get("PATH", "")
            env["ANDROID_HOME"] = sdk_home
            env["ANDROID_SDK_ROOT"] = sdk_home

            gradlew = os.path.join(android_dir, "gradlew.bat" if os.name == "nt" else "gradlew")
            if os.name != "nt" and os.path.exists(gradlew):
                os.chmod(gradlew, os.stat(gradlew).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

            res_apk = subprocess.run([gradlew, "assembleRelease", "--no-daemon"], cwd=android_dir, env=env, capture_output=True, text=True)
            if res_apk.returncode != 0:
                print("Gradle output:", res_apk.stdout[-2000:], res_apk.stderr[-2000:])
                raise SystemExit(1)

            signed_apk = os.path.join(android_dir, "app", "build", "outputs", "apk", "release", "app-release.apk")
            unsigned_apk = os.path.join(android_dir, "app", "build", "outputs", "apk", "release", "app-release-unsigned.apk")
            apk_src = signed_apk if os.path.exists(signed_apk) else unsigned_apk
            apk_out = os.path.join(pub_dl_dir, "SiKomputer.apk")
            shutil.copy2(apk_src, apk_out)
            shutil.copy2(apk_out, os.path.join(dist_dl_dir, "SiKomputer.apk"))
            print(f"4. SiKomputer.apk siap ({os.path.getsize(apk_out)} bytes)")
        else:
            raise FileNotFoundError(f"Android SDK tidak ditemukan di: {sdk_home}")


if __name__ == "__main__":
    main()
