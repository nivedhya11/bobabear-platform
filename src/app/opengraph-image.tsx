import { ImageResponse } from "next/og";
import { SITE_TAGLINE } from "@/lib/site";

export const dynamic = "force-static";

export const alt =
  "Boba Bear — boba tea & Korean street food in Dehradun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand-token colours mirrored from globals.css (dark mode).
const PAGE = "#1A2210";
const SAFFRON = "#F5A623";
const CREAM = "#FAF3E2";
const FIREFLY = "#A8D832";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: PAGE,
          backgroundImage:
            "radial-gradient(circle at 18% 22%, rgba(245,166,35,0.18), transparent 45%), radial-gradient(circle at 85% 80%, rgba(168,216,50,0.16), transparent 45%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: CREAM,
            opacity: 0.7,
          }}
        >
          <span>Boba Bear / Dehradun</span>
          <span>Est. 2026</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 800,
              lineHeight: 1,
              color: SAFFRON,
            }}
          >
            Boba Bear
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              marginTop: 16,
              color: CREAM,
            }}
          >
            Boba Tea &amp; Korean Street Food
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: FIREFLY,
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    { ...size },
  );
}
