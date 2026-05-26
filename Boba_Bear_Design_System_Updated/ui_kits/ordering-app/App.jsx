// ============================================================
// Boba Bear · Ordering app — top-level state + routing
// ============================================================

const App = () => {
  const [screen, setScreen] = React.useState("menu");
  const [selected, setSelected] = React.useState(null);
  const [cart, setCart] = React.useState([
    { ...MENU_DATA[0], qty: 1 },
    { ...MENU_DATA[2], qty: 1 },
  ]);

  const addToCart = (item, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + qty } : c);
      return [...prev, { ...item, qty }];
    });
  };

  const openItem = (item) => { setSelected(item); setScreen("detail"); };

  const handleSecure = () => { setScreen("tracking"); };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <IOSDevice dark={true} width={402} height={874}>
      <div className="bbm-app" data-theme="dark">
        <TopBar cartCount={cartCount} onCart={() => setScreen("cart")} />
        <div className="bbm-scroll">
          {screen === "menu"     && <MenuScreen onSelect={openItem} onAdd={(i) => addToCart(i, 1)} />}
          {screen === "detail"   && <ItemDetailScreen item={selected} onBack={() => setScreen("menu")} onAdd={(i, q) => { addToCart(i, q); setScreen("cart"); }} />}
          {screen === "cart"     && <CartScreen cart={cart} onSecure={handleSecure} />}
          {screen === "tracking" && <TrackingScreen orderNumber="BB-04-2719" />}
        </div>
        <BottomTabBar screen={screen} setScreen={setScreen} />
      </div>
    </IOSDevice>
  );
};

window.OrderingApp = App;
