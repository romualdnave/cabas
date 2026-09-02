import { useEffect } from "react";

export default function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="cabas-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cabas-modal" role="dialog" aria-modal="true" aria-label={title}>
        {children}
      </div>
    </div>
  );
}