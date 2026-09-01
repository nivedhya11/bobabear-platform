import { Hero } from "@/components/Hero";
import { Manifesto } from "@/components/Manifesto";
import { SignatureDrops } from "@/components/SignatureDrops";
import { TheBar } from "@/components/TheBar";
import { ThePlates } from "@/components/ThePlates";
import { TheSweet } from "@/components/TheSweet";
import { MerchDrop } from "@/components/MerchDrop";
import { Artists } from "@/components/Artists";
import { AccessCTA } from "@/components/AccessCTA";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      {/* §00 — Hero */}
      <section id="top">
        <Hero />
      </section>

      {/* Manifesto — quiet quote between hero and drops */}
      <Manifesto />

      {/* §01 — Signature Drops (provides its own id="drops" section) */}
      <SignatureDrops />

      {/* §02 — Menu: three chapters, each its own section */}
      <TheBar />
      <ThePlates />
      <TheSweet />

      {/* §04 — Merch (provides its own id="merch" section) */}
      <MerchDrop />

      {/* §06 — Artists (single tease card) */}
      <Artists />

      {/* §06 — Access (provides its own id="access" section) */}
      <AccessCTA />
    </main>
  );
}
