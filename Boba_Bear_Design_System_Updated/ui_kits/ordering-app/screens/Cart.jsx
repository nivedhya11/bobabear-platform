const CartScreen = ({ cart, onSecure }) => {
  if (!cart.length) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--font-body)" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, color: "var(--text-primary)", marginBottom: 6 }}>
          The cart is quiet.
        </div>
        <div style={{ fontSize: 13 }}>Nothing's in here yet. The bar's open whenever.</div>
      </div>
    );
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + taxes;

  return (
    <React.Fragment>
      <div className="bbm-eyebrow"><span className="bbm-eyebrow-dot"></span>Your session</div>
      <h2 className="bbm-section-title">What's on the bar</h2>

      <div>
        {cart.map(item => (
          <div key={item.id} className="bbm-cart-row">
            <div className={"bbm-cart-thumb stage-" + item.stage}>
              <img src={MASCOT} alt="" style={{ width: "70%", mixBlendMode: "multiply", opacity: 0.9 }} />
            </div>
            <div className="bbm-cart-meta">
              <span className="n">{item.name}</span>
              <span className="d">{item.qty} × ₹{item.price}</span>
            </div>
            <span className="bbm-cart-price">₹{item.price * item.qty}</span>
          </div>
        ))}
      </div>

      <div className="bbm-cart-totals">
        <div className="bbm-cart-line"><span>Subtotal</span><span>₹{subtotal}</span></div>
        <div className="bbm-cart-line"><span>Taxes</span><span>₹{taxes}</span></div>
        <div className="bbm-cart-line total"><span>Total</span><span className="r">₹{total}</span></div>
      </div>

      <button className="bbm-secure" onClick={onSecure}>Securing the Drop →</button>
    </React.Fragment>
  );
};

window.CartScreen = CartScreen;
