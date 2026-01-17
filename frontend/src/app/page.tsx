"use client";

import { useState } from "react";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [runUrl, setRunUrl] = useState("");
  const [apkUrl, setApkUrl] = useState("");
  const [apkName, setApkName] = useState("");

  async function build() {
    setBusy(true);
    setMsg("Starting build...");
    setRunUrl("");
    setApkUrl("");
    setApkName("");

    const r = await fetch("/api/build", { method: "POST" });
    if (!r.ok) {
      setMsg(await r.text());
      setBusy(false);
      return;
    }

    const t = setInterval(async () => {
      const s = await fetch("/api/status", { cache: "no-store" }).then((x) =>
        x.json(),
      );
      if (s.url) setRunUrl(s.url);

      if (s.status === "completed") {
        clearInterval(t);
        setBusy(false);

        if (s.conclusion === "success") {
          setMsg("Build success!");

          // fetch latest apk url
          const a = await fetch("/api/latest-apk", { cache: "no-store" }).then(
            (x) => x.json(),
          );
          if (a.ok) {
            setApkUrl(a.url);
            setApkName(a.name);
          } else {
            setMsg("Build success, but APK not found in latest release yet.");
          }
        } else {
          setMsg("Build failed.");
        }
      } else {
        setMsg(`Build: ${s.status}...`);
      }
    }, 4000);
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <button onClick={build} disabled={busy}>
        {busy ? "Building..." : "Build APK"}
      </button>

      <p>{msg}</p>

      {runUrl && (
        <p>
          <a href={runUrl} target="_blank" rel="noreferrer">
            Open build logs
          </a>
        </p>
      )}

      {apkUrl && (
        <p>
          <a href={apkUrl} download>
            Download APK{apkName ? ` (${apkName})` : ""}
          </a>
        </p>
      )}
    </div>
  );
}
