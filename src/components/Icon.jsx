export default function Icon({ name }) {
  const path = {
    pencil: "M4 16.2V20h3.8L18.3 9.5l-3.8-3.8L4 16.2Z M13.1 7.1l3.8 3.8",
    trash: "M4 7h16 M9 7V4.8h6V7 M6.5 7l1 13h9l1-13 M10 10.5v6 M14 10.5v6",
    back: "M15 5l-7 7 7 7",
    share: "M15 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M15 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M8.59 13.51L15.42 17.49 M15.41 6.51L8.59 10.49",
    tag: "M4 4h7l9 9-7 7-9-9V4Z M8 8h.01",
    plus: "M12 5v14 M5 12h14",
    x: "M6 6l12 12 M18 6L6 18",
    eye: "M2 12c2.5-4.5 6.5-7 10-7s7.5 2.5 10 7c-2.5 4.5-6.5 7-10 7s-7.5-2.5-10-7Z M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
    eyeOff: "M2 12c2.5-4.5 6.5-7 10-7s7.5 2.5 10 7c-2.5 4.5-6.5 7-10 7s-7.5-2.5-10-7Z M4 4l16 16",
  }[name];
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path.split(" M").map((segment, i) => <path key={i} d={(i ? "M" : "") + segment} />)}
    </svg>
  );
}