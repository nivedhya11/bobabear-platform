const ItemDetailScreen = ({ item, onBack, onAdd }) => {
  const [size, setSize] = React.useState("Regular");
  const [milk, setMilk] = React.useState("Oat");
  const [ice, setIce] = React.useState("Less");
  const [qty, setQty] = React.useState(1);

  if (!item) return (
    <div style={{ padding: 32, textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--font-body)" }}>
      Pick something from the menu.
    </div>
  );

  return (
    <React.Fragment>
      <div className={"bbm-detail-img stage-" + item.stage}>
        <span className="bbm-card-tag">{item.tag}</span>
        <img src={MASCOT} alt="" style={{ width: "55%", mixBlendMode: "multiply", opacity: 0.9 }} />
        <button className="bbm-back" onClick={onBack} aria-label="Back">←</button>
      </div>

      <h1 className="bbm-detail-name">{item.name}</h1>
      <p className="bbm-detail-desc">
        {item.desc} Slow-pulled. Sealed cold. No syrups, no shortcuts — the bar runs daily-fresh.
      </p>
      <div className="bbm-detail-price">₹{item.price * qty}</div>

      <ModGroup title="Size" hint="Pick one">
        {["Regular", "Large"].map(o => (
          <Option key={o} active={size === o} onClick={() => setSize(o)} l={o} r={o === "Large" ? "+₹40" : ""} />
        ))}
      </ModGroup>

      <ModGroup title="Milk" hint="Pick one">
        {["Oat", "Almond", "Whole"].map(o => (
          <Option key={o} active={milk === o} onClick={() => setMilk(o)} l={o} r={o === "Whole" ? "" : "+₹20"} />
        ))}
      </ModGroup>

      <ModGroup title="Ice" hint="Pick one">
        {["No ice", "Less", "Regular"].map(o => (
          <Option key={o} active={ice === o} onClick={() => setIce(o)} l={o} />
        ))}
      </ModGroup>

      <div className="bbm-add-row">
        <div className="bbm-qty">
          <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
          <span className="n">{qty}</span>
          <button onClick={() => setQty(q => q + 1)}>+</button>
        </div>
        <button className="bbm-btn-primary" onClick={() => onAdd(item, qty)}>Add to the bar →</button>
      </div>
    </React.Fragment>
  );
};

const ModGroup = ({ title, hint, children }) => (
  <div className="bbm-mod-group">
    <div className="bbm-mod-head">
      <h3 className="bbm-mod-title">{title}</h3>
      <span className="bbm-mod-hint">{hint}</span>
    </div>
    <div className="bbm-mod-options">{children}</div>
  </div>
);

const Option = ({ active, onClick, l, r }) => (
  <div className={"bbm-mod-option" + (active ? " active" : "")} onClick={onClick}>
    <span className="l">{l}</span>
    {r ? <span className="r">{r}</span> : null}
  </div>
);

window.ItemDetailScreen = ItemDetailScreen;
