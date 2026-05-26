const DROP_ITEMS = [
  { n: "Unbothered tee", d: "Heavy cotton, kraft tag.", price: "₹1,490", tag: "01 · TEE", stage: "rose" },
  { n: "House mug",      d: "Stoneware, hand-glazed.",   price: "₹890",  tag: "02 · CUP", stage: "mint",  chip: "Low" },
  { n: "Deadpan cap",    d: "Six-panel, brushed twill.", price: "₹990",  tag: "03 · CAP", stage: "butter" },
  { n: "Kraft tote",     d: "Heavy canvas, numbered.",   price: "₹650",  tag: "04 · TOTE", stage: "lavender" },
];

const DropFeature = () => {
  return (
    <section className="bb-drop" id="drop">
      <div className="bb-drop-inner">
        <div className="bb-drop-meta">
          <span className="bb-label">Drop 04 · Friday 22:00</span>
          <h2 className="bb-display-md">SECURE<br/>YOUR PIECE.</h2>
          <p className="bb-drop-sub">
            Heavy cotton tees, kraft-tagged ceramics, deadpan back-print. 200 numbered. No restocks.
          </p>
          <div className="bb-drop-cta">
            <button className="bb-btn bb-btn-secondary bb-btn-lg">Get on the list</button>
            <span className="bb-drop-counter">000 / 200 secured</span>
          </div>
        </div>
        <div className="bb-card-grid bb-card-grid-merch">
          {DROP_ITEMS.map(item => (
            <article className="bb-card bb-card-merch" key={item.n}>
              <div className={"bb-card-img merch-img stage-" + item.stage}>
                <span className="bb-img-tag">{item.tag}</span>
              </div>
              <div className="bb-card-body">
                <h3 className="bb-card-name">{item.n}</h3>
                <p className="bb-card-desc">{item.d}</p>
                <div className="bb-card-foot">
                  <span className="bb-price">{item.price}</span>
                  {item.chip ? <span className="bb-card-chip lowstock">{item.chip}</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

window.DropFeature = DropFeature;
