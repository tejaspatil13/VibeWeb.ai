
import {
  ExternalLink,
  Globe,
  Loader2,
  Monitor,
  RotateCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useState } from "react";

interface Props {
  url: string | null;
  srcDoc?: string;
  loading: boolean;
  onRefresh: () => void;
  onStartRuntime: () => void;
  dark: boolean;
}
const PREVIEW_STORAGE_KEY =
  "vibeweb_active_preview";
export default function RuntimePreview({
  url,
  srcDoc,
  loading,
  onRefresh,
  onStartRuntime,
  dark,
}: Props) {
  const [device, setDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");

  /*
   * A preview exists if either:
   * - WebContainer has provided a URL
   * - srcDoc is being used
   */
  const hasPreview = Boolean(url || srcDoc);

  /*
   * IMPORTANT:
   *
   * Do not show the loading overlay when the preview
   * already exists.
   *
   * WebContainer can still be doing background work while
   * the application is already visible and interactive.
   */
  const showLoadingOverlay = loading && !hasPreview;

  /*
   * Open the generated application.
   *
   * NOTE:
   * A WebContainer preview URL is not a permanent deployed URL.
   * Opening the raw webcontainer-api.io URL in a new tab can
   * sometimes show the WebContainer "Connect project" page.
   *
   * We still open the actual preview URL here when available.
   * For a real standalone public preview URL, we will eventually
   * need a separate sandbox/preview server.
   */
  const handleOpenNewTab = () => {
  if (!url) {
    return;
  }

  sessionStorage.setItem(
    PREVIEW_STORAGE_KEY,
    url
  );

  const previewWindow = window.open(
    `${window.location.origin}/preview`,
    "_blank"
  );

  if (!previewWindow) {
    console.warn(
      "Preview popup was blocked by the browser."
    );
  }
};

  return (
    <div className="preview-container">
      {/* =====================================================
          PREVIEW ADDRESS BAR
      ====================================================== */}

      <div className="preview-address-bar">
        <Globe
          size={14}
          color="var(--accent-primary)"
        />

        {/* URL */}
        <div
          className="url-display"
          title={
            url ||
            "Live preview"
          }
        >
          <span>
            {url ||
              "http://localhost:3000"}
          </span>
        </div>

        {/* DEVICE SWITCHER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <button
            className={`icon-btn ${
              device === "desktop"
                ? "active"
                : ""
            }`}
            title="Desktop View"
            onClick={() =>
              setDevice("desktop")
            }
          >
            <Monitor size={14} />
          </button>

          <button
            className={`icon-btn ${
              device === "tablet"
                ? "active"
                : ""
            }`}
            title="Tablet View (768px)"
            onClick={() =>
              setDevice("tablet")
            }
          >
            <Tablet size={14} />
          </button>

          <button
            className={`icon-btn ${
              device === "mobile"
                ? "active"
                : ""
            }`}
            title="Mobile View (375px)"
            onClick={() =>
              setDevice("mobile")
            }
          >
            <Smartphone size={14} />
          </button>
        </div>

        {/* ACTIONS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            marginLeft: 4,
          }}
        >
          {/* REFRESH */}
          <button
            className="icon-btn"
            title="Reload Preview"
            onClick={onRefresh}
            disabled={!hasPreview}
          >
            <RotateCw
              size={13}
              className={
                loading
                  ? "spin"
                  : undefined
              }
            />
          </button>

          {/* OPEN IN NEW TAB */}
          {url && (
            <button
              className="icon-btn"
              title="Open Generated App in New Tab"
              onClick={handleOpenNewTab}
            >
              <ExternalLink size={13} />
            </button>
          )}
        </div>
      </div>

      {/* =====================================================
          PREVIEW VIEWPORT
      ====================================================== */}

      <div
        className={`preview-viewport ${
          device
        } ${dark ? "dark-bg" : ""}`}
      >
        {/* ===================================================
            LOADING OVERLAY

            IMPORTANT:
            Only show this before a preview exists.

            Once WebContainer gives us a URL, the application
            should remain visible even if runtimeLoading is still
            true in the background.
        ==================================================== */}

        {showLoadingOverlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              zIndex: 10,
              color: "#ffffff",
              backdropFilter:
                "blur(2px)",
            }}
          >
            <Loader2
              className="spin"
              size={26}
              color="var(--accent-primary)"
            />

            <span
              style={{
                fontSize:
                  "var(--font-xs)",
                fontWeight: 600,
              }}
            >
              Compiling &amp; Loading Preview...
            </span>
          </div>
        )}

        {/* ===================================================
            PREVIEW
        ==================================================== */}

        {hasPreview ? (
          <div className="preview-frame-wrapper">
            <iframe
              title="Application Live Preview"
              src={
                url ?? undefined
              }
              srcDoc={
                !url && srcDoc
                  ? srcDoc
                  : undefined
              }
              className={`preview-frame ${device}`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          </div>
        ) : (
          /* =================================================
             EMPTY STATE
          ================================================== */

          <div className="preview-empty-splash">
            <div className="preview-empty-icon">
              <Globe size={24} />
            </div>

            <strong>
              Live Preview Ready
            </strong>

            <p>
              Your web application
              preview will render here
              in real-time as the AI
              writes and updates your
              code.
            </p>

            <button
              className="btn-primary"
              onClick={
                onStartRuntime
              }
              style={{
                marginTop: 8,
              }}
            >
              Launch Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
