const Nav = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <header className="bb-nav-wrap">
      <div className="bb-marquee">
        <div className="bb-marquee-track">
          {Array.from({length: 2}).map((_, k) => (
            <React.Fragment key={k}>
              <span>DROP 04 LANDS FRIDAY</span><span className="bb-dot"></span>
              <span>FOR THE UNBOTHERED</span><span className="bb-dot"></span>
              <span>S-TIER SIPS · K-STREET DRIP</span><span className="bb-dot"></span>
              <span>ARTIST 03 — KAVYA / SARGAM</span><span className="bb-dot"></span>
            </React.Fragment>
          ))}
        </div>
      </div>
      <nav className="bb-nav">
        <a href="#" className="bb-brand">BOBA BEAR</a>
        <div className="bb-links">
          <a href="#menu" className="active">Menu</a>
          <a href="#drop">Drops</a>
          <a href="#artists">Artists</a>
          <a href="#locate">Locate</a>
        </div>
        <button className="bb-btn bb-btn-primary bb-btn-md">Access the Drop →</button>
      </nav>
    </header>
  );
};

window.Nav = Nav;
