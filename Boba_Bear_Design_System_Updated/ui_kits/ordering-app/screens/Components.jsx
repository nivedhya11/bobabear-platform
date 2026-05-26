// Shared bits — TopBar, BottomTabBar
const MASCOT = "../../assets/logo/mascot.svg";

const TopBar = ({ cartCount, onCart }) => (
  <div className="bbm-topbar">
    <div className="bbm-topbar-brand">BB</div>
    <div className="bbm-topbar-loc">
      <small>Pickup</small>
      <span>Indiranagar 12th</span>
    </div>
    <button className="bbm-cartchip" onClick={onCart}>
      Cart <span className="count">{cartCount}</span>
    </button>
  </div>
);

const BottomTabBar = ({ screen, setScreen }) => {
  const TABS = [
    { id: "menu",     label: "Menu",     glyph: "M" },
    { id: "detail",   label: "Item",     glyph: "i" },
    { id: "cart",     label: "Cart",     glyph: "C" },
    { id: "tracking", label: "Tracking", glyph: "T" },
  ];
  return (
    <nav className="bbm-tabbar">
      {TABS.map(t => (
        <button
          key={t.id}
          className={"bbm-tab" + (screen === t.id ? " active" : "")}
          onClick={() => setScreen(t.id)}
        >
          <span className="glyph">{t.glyph}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
};

window.TopBar = TopBar;
window.BottomTabBar = BottomTabBar;
window.MASCOT = MASCOT;
