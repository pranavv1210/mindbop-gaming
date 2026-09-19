export function GameArt({
  kind,
  hero = false,
}: {
  kind: string;
  hero?: boolean;
}) {
  return (
    <div
      className={`game-art art-${kind} ${hero ? "art-hero" : ""}`}
      aria-hidden="true"
    >
      {kind === "brain" && (
        <>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="brain-shape">
            <svg viewBox="0 0 150 150" fill="none">
              <path
                d="M75 119c-13 15-35 5-35-10-20-1-29-22-17-37-12-17-1-37 17-38 1-22 29-28 35-10 6-18 34-12 35 10 18 1 29 21 17 38 12 15 3 36-17 37 0 15-22 25-35 10Z"
                fill="#e7d8ff"
                stroke="#442086"
                strokeWidth="5"
              />
              <path
                d="M75 25v94M40 34c-1 13 9 21 18 18M23 72c17-6 29 5 26 19m61-57c1 13-9 21-18 18m35 20c-17-6-29 5-26 19M40 109c-3-12 9-23 20-17m50 17c3-12-9-23-20-17"
                stroke="#442086"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="art-spark spark-a">✦</span>
          <span className="art-spark spark-b">✧</span>
          <span className="art-mini">?</span>
        </>
      )}
      {kind === "cards" && (
        <>
          <div className="playing-card card-back">
            <span>?</span>
          </div>
          <div className="playing-card card-front">
            <span>♠</span>
            <div className="card-eyes">
              <i />
              <i />
            </div>
            <span>♠</span>
          </div>
          <span className="art-spark spark-a">✦</span>
        </>
      )}
      {kind === "eyes" && (
        <>
          <div className="suspect suspect-back">
            <i />
            <i />
          </div>
          <div className="suspect suspect-front">
            <i />
            <i />
          </div>
          <span className="art-spark spark-b">?</span>
        </>
      )}
      {kind === "bolt" && (
        <>
          <div className="bolt-shape">ϟ</div>
          <span className="art-spark spark-a">✦</span>
          <span className="art-spark spark-b">✧</span>
          <div className="orbit orbit-one" />
        </>
      )}
    </div>
  );
}
export function Avatar({
  index,
  small = false,
}: {
  index: number;
  small?: boolean;
}) {
  const characters = [
    <><path d="M12 29c0-9 5-16 12-16s12 7 12 16v9l-6-3-6 3-6-3-6 3Z" fill="#7457d9"/><path d="M18 13 15 7l7 4m8 2 3-6-7 4" stroke="#2c2144" strokeWidth="2.4" strokeLinecap="round"/><circle cx="20" cy="27" r="2" fill="white"/><circle cx="29" cy="27" r="2" fill="white"/><path d="m22 32 2 1 2-1" stroke="#2c2144" strokeWidth="2" strokeLinecap="round"/></>,
    <><path d="M10 23c0-9 6-15 14-15s14 6 14 15H10Z" fill="#ff8f75"/><path d="M18 23h12l4 17H14Z" fill="#ffd27d"/><circle cx="19" cy="17" r="2.5" fill="#fff"/><circle cx="29" cy="17" r="2.5" fill="#fff"/><circle cx="19" cy="17" r="1" fill="#3c2948"/><circle cx="29" cy="17" r="1" fill="#3c2948"/><path d="M21 28h6" stroke="#3c2948" strokeWidth="2" strokeLinecap="round"/></>,
    <><rect x="10" y="12" width="28" height="28" rx="9" fill="#55b99a"/><path d="M24 12V7m-4 0h8" stroke="#2d3450" strokeWidth="2.4" strokeLinecap="round"/><rect x="15" y="19" width="18" height="10" rx="5" fill="#d9fff1"/><circle cx="20" cy="24" r="2" fill="#253550"/><circle cx="28" cy="24" r="2" fill="#253550"/><path d="M19 34h10" stroke="#253550" strokeWidth="2" strokeLinecap="round"/></>,
    <><path d="M24 7 38 19l-5 20H15l-5-20Z" fill="#f1bd45"/><path d="m13 20 5-9 6 8 6-8 5 9" fill="#ffe58c" stroke="#3d304c" strokeWidth="2" strokeLinejoin="round"/><circle cx="19" cy="28" r="2" fill="#3d304c"/><circle cx="29" cy="28" r="2" fill="#3d304c"/><path d="M21 34c2 1 4 1 6 0" stroke="#3d304c" strokeWidth="2" strokeLinecap="round"/></>,
    <><circle cx="24" cy="24" r="15" fill="#82a7ef"/><path d="M6 28c8 4 28 5 36-5" stroke="#ff9cc0" strokeWidth="5" strokeLinecap="round"/><path d="M34 12 39 8m-2 7 5-1" stroke="#49385d" strokeWidth="2" strokeLinecap="round"/><circle cx="20" cy="21" r="2" fill="#fff"/><circle cx="28" cy="21" r="2" fill="#fff"/></>,
    <><path d="M12 19c0-7 5-12 12-12s12 5 12 12v21H12Z" fill="#f49bb5"/><path d="M12 39c3-5 6-5 9 0 3-5 6-5 9 0 2-4 4-5 6-2" fill="#f49bb5"/><path d="M17 21c4-5 10-5 14 0" stroke="#fff" strokeWidth="5" strokeLinecap="round"/><circle cx="20" cy="22" r="2" fill="#372943"/><circle cx="28" cy="22" r="2" fill="#372943"/><path d="M22 29h4" stroke="#372943" strokeWidth="2" strokeLinecap="round"/></>,
  ];
  return (
    <span
      className={`avatar avatar-${index % 6} ${small ? "avatar-small" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" aria-hidden="true">{characters[index % characters.length]}</svg>
    </span>
  );
}
