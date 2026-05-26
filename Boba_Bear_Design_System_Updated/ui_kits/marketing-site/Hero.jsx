const Hero = () => {
  return (
    <section className="bb-hero">
      <div className="bb-hero-bg" aria-hidden="true">
        <div className="bb-hero-protection"></div>
      </div>

      <div className="bb-hero-inner">
        <div className="bb-eyebrow">
          <span className="bb-eyebrow-dot"></span>
          <span>Now on the bar · Bengaluru · Indiranagar 12th</span>
        </div>
        <h1 className="bb-display">
          FOR THE<br/>
          <span className="bb-display-stroke">UNBOTHERED.</span>
        </h1>
        <p className="bb-hero-sub">
          Indo-Korean. Iced. Earnest about almost nothing.
        </p>
        <div className="bb-hero-cta">
          <button className="bb-btn bb-btn-primary bb-btn-lg">Access the Drop →</button>
          <button className="bb-btn bb-btn-outline bb-btn-lg">See the menu</button>
        </div>
        <img src="../../assets/logo/mascot.svg" alt="" className="bb-hero-bear" />
      </div>
    </section>
  );
};

window.Hero = Hero;
