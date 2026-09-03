import { t } from "../i18n";

/* ------------------------------------------------------------------ */
/* Screen: configuration is incomplete                                 */
/* ------------------------------------------------------------------ */

export default function Misconfigured({ names }) {
  return (
    <div className="cabas-wrap">
      <div className="cabas-hello">
        <h1>{t.config.title}</h1>
        <p>{t.config.blurb(names.length)}</p>
      </div>
      <div className="cabas-panel">
        <ul style={{ margin: 0, paddingLeft: 20, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14 }}>
          {names.map((name) => <li key={name}>{name}</li>)}
        </ul>
      </div>
      <div className="cabas-panel">
        <h2>{t.config.devTitle}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>{t.config.devBody}</p>
      </div>
      <div className="cabas-panel">
        <h2>{t.config.prodTitle}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>{t.config.prodBody}</p>
      </div>
    </div>
  );
}