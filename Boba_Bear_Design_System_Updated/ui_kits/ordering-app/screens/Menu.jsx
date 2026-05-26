const MENU_DATA = [
  { id: "m1", tag: "House",  name: "Brown sugar pearl",  desc: "Tapioca · oat milk.",     price: 240, stage: "rose" },
  { id: "m2", tag: "House",  name: "Matcha · black",      desc: "Stone-ground matcha.",   price: 260, stage: "mint" },
  { id: "m3", tag: "Bowls",  name: "Bibim-tikka",         desc: "Gochu paneer · kimchi.",  price: 320, stage: "butter" },
  { id: "m4", tag: "Bowls",  name: "Bulgogi paratha",     desc: "Mushroom · ssamjang.",   price: 340, stage: "peach" },
  { id: "m5", tag: "Iced",   name: "Yuzu-amla brew",      desc: "Amla · yuzu · slow.",     price: 220, stage: "sky" },
  { id: "m6", tag: "Iced",   name: "Mango-gochujang",     desc: "Chausa mango.",           price: 240, stage: "lavender" },
];
const CATS = ["All", "House", "Bowls", "Iced"];

const MenuScreen = ({ onSelect, onAdd }) => {
  const [cat, setCat] = React.useState("All");
  const items = cat === "All" ? MENU_DATA : MENU_DATA.filter(i => i.tag === cat);
  return (
    <React.Fragment>
      <section className="bbm-hero">
        <div className="bbm-hero-tag">Drop 04 · Friday 22:00</div>
        <h1 className="bbm-hero-h">SECURE YOUR PIECE.</h1>
        <button className="bbm-hero-cta">Get on the list →</button>
      </section>

      <div className="bbm-eyebrow">
        <span className="bbm-eyebrow-dot"></span>
        From the bar
      </div>
      <h2 className="bbm-section-title">This week's menu</h2>

      <div className="bbm-chips">
        {CATS.map(c => (
          <button key={c} className={"bbm-chip" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      <div className="bbm-card-grid">
        {items.map(item => (
          <article key={item.id} className="bbm-card" onClick={() => onSelect(item)}>
            <div className={"bbm-card-img stage-" + item.stage}>
              <span className="bbm-card-tag">{item.tag}</span>
              <img src={MASCOT} alt="" style={{ width: "55%", mixBlendMode: "multiply", opacity: 0.85 }} />
            </div>
            <div className="bbm-card-body">
              <h3 className="bbm-card-name">{item.name}</h3>
              <p className="bbm-card-desc">{item.desc}</p>
              <div className="bbm-card-foot">
                <span className="bbm-price">₹{item.price}</span>
                <button
                  className="bbm-card-plus"
                  onClick={(e) => { e.stopPropagation(); onAdd(item); }}
                  aria-label={"Add " + item.name + " to bar"}
                >+</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </React.Fragment>
  );
};

window.MenuScreen = MenuScreen;
window.MENU_DATA = MENU_DATA;
