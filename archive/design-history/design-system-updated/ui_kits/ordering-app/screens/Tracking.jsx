const STAGES = [
  { id: "secured",   label: "Secured" },
  { id: "pouring",   label: "Pouring" },
  { id: "sealing",   label: "Sealing" },
  { id: "ready",     label: "Ready" },
];

const TrackingScreen = ({ orderNumber }) => {
  // Cycle through stages for the demo
  const [idx, setIdx] = React.useState(1);
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % (STAGES.length + 1)), 2400);
    return () => clearInterval(t);
  }, []);
  const activeIdx = Math.min(idx, STAGES.length - 1);
  const fillPct = (activeIdx / (STAGES.length - 1)) * 100;

  return (
    <React.Fragment>
      <div className="bbm-track-hero">
        <div className="bbm-track-eyebrow">Order · {orderNumber}</div>
        <h1 className="bbm-track-h">ON THE BAR.</h1>
        <p className="bbm-track-sub">We've got you. Sit tight.</p>
      </div>

      <div className="bbm-pearls">
        <div className="seg-fill" style={{ width: "calc(" + fillPct + "% - 18px)" }}></div>
        {STAGES.map((s, i) => {
          const cls = i < activeIdx ? "done" : (i === activeIdx ? "active" : "");
          return (
            <div key={s.id} className={"bbm-pearl " + cls}>
              <span className="bbm-pearl-dot"></span>
              <span className="bbm-pearl-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      <div className="bbm-track-card">
        <div className="bbm-track-eta">
          <span className="l">Pickup window</span>
          <span className="r">6 min</span>
        </div>
        <div className="bbm-track-note">
          Counter at Indiranagar · 12th Main. The bar will ping you when it's sealed.
          No need to wait at the counter — we'll hold it cold.
        </div>
      </div>

      <div className="bbm-track-card" style={{ marginTop: 12 }}>
        <div className="bbm-track-eta">
          <span className="l">Pearls of the session</span>
          <span className="r" style={{ fontSize: 16 }}>3 items</span>
        </div>
        <div className="bbm-track-note">
          Brown sugar pearl · Bibim-tikka · Yuzu-amla brew
        </div>
      </div>
    </React.Fragment>
  );
};

window.TrackingScreen = TrackingScreen;
