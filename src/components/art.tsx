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
  return (
    <span
      className={`avatar avatar-${index % 6} ${small ? "avatar-small" : ""}`}
      aria-hidden="true"
    >
      <span className="avatar-eyes">
        <i />
        <i />
      </span>
      <span className="avatar-mouth" />
    </span>
  );
}
