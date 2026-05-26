const MENU_ITEMS = [
  { tag: "House boba", name: "Brown sugar pearl",  desc: "Slow-cooked tapioca, oat milk, single-origin.", price: "₹240", stage: "rose" },
  { tag: "House boba", name: "Matcha · black",      desc: "Stone-ground matcha, double-brewed black, hand-pulled milk.", price: "₹260", stage: "mint" },
  { tag: "Bowls",      name: "Bibim-tikka rice",    desc: "Gochu-marinated paneer, sesame, kimchi.", price: "₹320", stage: "butter", chip: "New" },
  { tag: "Bowls",      name: "Bulgogi paratha",     desc: "Soy-marinated mushroom, flaky paratha, ssamjang.", price: "₹340", stage: "peach" },
  { tag: "Iced",       name: "Yuzu-amla cold-brew", desc: "Indian amla, Japanese yuzu, slow drip.", price: "₹220", stage: "sky" },
  { tag: "Iced",       name: "Mango-gochujang",     desc: "Chausa mango, a whisper of chili.", price: "₹240", stage: "lavender", chip: "New" },
];

const CATEGORIES = ["All", "House boba", "Bowls", "Iced"];

const MenuStrip = () => {
  const [active, setActive] = React.useState("All");
  const items = active === "All" ? MENU_ITEMS : MENU_ITEMS.filter(i => i.tag === active);

  return (
    <section className="bb-section" id="menu">
      <div className="bb-section-head">
        <span className="bb-label">From the bar</span>
        <h2 className="bb-h2">This week on the menu</h2>
      </div>
      <div className="bb-chips">
        {CATEGORIES.map(c => (
          <button
            key={c}
            className={"bb-chip" + (active === c ? " active" : "")}
            onClick={() => setActive(c)}
          >{c}</button>
        ))}
      </div>
      <div className="bb-card-grid bb-card-grid-food">
        {items.map(item => (
          <article className="bb-card bb-card-food" key={item.name}>
            <div className={"bb-card-img food-img stage-" + item.stage}>
              <span className="bb-img-tag">{item.tag}</span>
              <img src="../../assets/logo/mascot.svg" alt="" />
            </div>
            <div className="bb-card-body">
              <h3 className="bb-card-name">{item.name}</h3>
              <p className="bb-card-desc">{item.desc}</p>
              <div className="bb-card-foot">
                <span className="bb-price">{item.price}</span>
                {item.chip ? <span className="bb-card-chip new">{item.chip}</span> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

window.MenuStrip = MenuStrip;
