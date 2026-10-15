import { translations } from "../i18n";

/* ------------------------------------------------------------------ */
/* Screen: configuration is incomplete                                 */
/* ------------------------------------------------------------------ */

export default function Misconfigured({ names }) {
  return (
    <div className="cabas-wrap">
      <div className="cabas-hello">
        <h1>{translations.config.title}</h1>
        <p>{translations.config.blurb(names.length)}</p>
      </div>
      <div className="cabas-panel">
        <ul style={{ margin: 0, paddingLeft: 20, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14 }}>
          {names.map((name) => <li key={name}>{name}</li>)}
        </ul>
      </div>
      <div className="cabas-panel">
        <h2>{translations.config.devTitle}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>{translations.config.devBody}</p>
      </div>
      <div className="cabas-panel">
        <h2>{translations.config.prodTitle}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>{translations.config.prodBody}</p>
      </div>
    </div>
  );
}