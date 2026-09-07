const ARTISTS = [
  { n: "Kavya / Sargam",  d: "Carnatic-electronic", stage: "rose" },
  { n: "Aman Vir",        d: "Photographer", stage: "sky" },
  { n: "TILT.",           d: "Street dance collective", stage: "butter" },
  { n: "Mirage",          d: "Illustration", stage: "lavender" },
];

const ArtistGrid = () => (
  <section className="bb-section" id="artists">
    <div className="bb-section-head">
      <span className="bb-label">Artists in the room</span>
      <h2 className="bb-h2">Currently collaborating</h2>
    </div>
    <div className="bb-artist-grid">
      {ARTISTS.map(a => (
        <article className="bb-artist" key={a.n}>
          <div className={"bb-artist-img stage-" + a.stage}></div>
          <div className="bb-artist-body">
            <span className="bb-cat">{a.d}</span>
            <h3 className="bb-card-name">{a.n}</h3>
            <a href="#" className="bb-artist-link">View collab →</a>
          </div>
        </article>
      ))}
    </div>
  </section>
);

window.ArtistGrid = ArtistGrid;
