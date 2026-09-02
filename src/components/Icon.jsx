export default function Icon({ name }) {
  const path = {
    pencil: "M4 16.2V20h3.8L18.3 9.5l-3.8-3.8L4 16.2Z M13.1 7.1l3.8 3.8",
    trash: "M4 7h16 M9 7V4.8h6V7 M6.5 7l1 13h9l1-13 M10 10.5v6 M14 10.5v6",
    back: "M15 5l-7 7 7 7",
    share: "M8 12h9 M13.5 8l4 4-4 4 M6 5v14",
    tag: "M4 4h7l9 9-7 7-9-9V4Z M8 8h.01",
    plus: "M12 5v14 M5 12h14",
  }[name];
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path.split(" M").map((segment, i) => <path key={i} d={(i ? "M" : "") + segment} />)}
    </svg>
  );
}