import {
  ArrowLeft,
  ExternalLink,
  Globe,
} from "lucide-react";
import { useEffect, useState } from "react";

const PREVIEW_STORAGE_KEY =
  "vibeweb_active_preview";

export default function PreviewPage() {
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  useEffect(() => {
    const storedUrl =
      sessionStorage.getItem(
        PREVIEW_STORAGE_KEY
      );

    setPreviewUrl(storedUrl);
  }, []);

  const handleBack = () => {
    window.location.href = "/";
  };

  const handleOpenRuntime = () => {
    if (!previewUrl) {
      return;
    }

    window.open(
      previewUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (!previewUrl) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0d12",
          color: "#fff",
          fontFamily:
            "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 420,
            padding: 24,
          }}
        >
          <Globe size={40} />

          <h2
            style={{
              marginTop: 16,
            }}
          >
            Preview not available
          </h2>

          <p
            style={{
              opacity: 0.6,
              lineHeight: 1.6,
            }}
          >
            No active generated project
            was found in this browser
            session.
          </p>

          <button
            onClick={handleBack}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Back to VibeWeb
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0b0d12",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          height: 52,
          minHeight: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          background: "#11141b",
          borderBottom:
            "1px solid rgba(255,255,255,0.08)",
          color: "#fff",
          fontFamily:
            "Inter, system-ui, sans-serif",
        }}
      >
        {/* LEFT */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            onClick={handleBack}
            title="Back to VibeWeb"
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              borderRadius: 7,
              background:
                "rgba(255,255,255,0.06)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} />
          </button>

          <Globe
            size={16}
            color="#7c9cff"
          />

          <strong>
            VibeWeb.ai
          </strong>

          <span
            style={{
              opacity: 0.4,
            }}
          >
            /
          </span>

          <span
            style={{
              opacity: 0.7,
            }}
          >
            Live Preview
          </span>
        </div>

        {/* RIGHT */}

        <button
          onClick={handleOpenRuntime}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 11px",
            borderRadius: 7,
            border:
              "1px solid rgba(255,255,255,0.1)",
            background:
              "rgba(255,255,255,0.05)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <ExternalLink size={14} />

          <span>
            Open Runtime
          </span>
        </button>
      </header>

      {/* GENERATED APPLICATION */}

      <main
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          background: "#fff",
        }}
      >
        <iframe
          title="VibeWeb Generated Application"
          src={previewUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          allow="fullscreen"
          sandbox="
            allow-scripts
            allow-same-origin
            allow-forms
            allow-modals
            allow-popups
          "
        />
      </main>
    </div>
  );
}