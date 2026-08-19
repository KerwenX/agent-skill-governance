// Lucide-style stroke icons (subset, consistent 1.8 stroke)
import React from "react";

type P = React.SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 16): React.SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor", strokeWidth: 1.8,
  strokeLinecap: "round", strokeLinejoin: "round",
});

export const I = {
  Shield:   (p: P) => <svg {...base(p.size)} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Search:   (p: P) => <svg {...base(p.size)} {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  Users:    (p: P) => <svg {...base(p.size)} {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Inbox:    (p: P) => <svg {...base(p.size)} {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  Git:      (p: P) => <svg {...base(p.size)} {...p}><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>,
  Network:  (p: P) => <svg {...base(p.size)} {...p}><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4M7 17l4-6M17 17l-4-6"/></svg>,
  History:  (p: P) => <svg {...base(p.size)} {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>,
  Bolt:     (p: P) => <svg {...base(p.size)} {...p}><path d="M13 2 3 14h8l-1 8 10-12h-8z"/></svg>,
  Play:     (p: P) => <svg {...base(p.size)} {...p}><polygon points="6 4 20 12 6 20 6 4"/></svg>,
  Pause:    (p: P) => <svg {...base(p.size)} {...p}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>,
  Reset:    (p: P) => <svg {...base(p.size)} {...p}><path d="M4 4v5h5"/><path d="M20 20v-5h-5"/><path d="M4 9a8 8 0 0 1 14-4M20 15a8 8 0 0 1-14 4"/></svg>,
  Check:    (p: P) => <svg {...base(p.size)} {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  X:        (p: P) => <svg {...base(p.size)} {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Warn:     (p: P) => <svg {...base(p.size)} {...p}><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Info:     (p: P) => <svg {...base(p.size)} {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Bell:     (p: P) => <svg {...base(p.size)} {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  ChevronR: (p: P) => <svg {...base(p.size)} {...p}><polyline points="9 18 15 12 9 6"/></svg>,
  ChevronD: (p: P) => <svg {...base(p.size)} {...p}><polyline points="6 9 12 15 18 9"/></svg>,
  Plus:     (p: P) => <svg {...base(p.size)} {...p}><path d="M12 5v14M5 12h14"/></svg>,
  Send:     (p: P) => <svg {...base(p.size)} {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Doc:      (p: P) => <svg {...base(p.size)} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Book:     (p: P) => <svg {...base(p.size)} {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Cog:      (p: P) => <svg {...base(p.size)} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Window:   (p: P) => <svg {...base(p.size)} {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M6 6h.01M9 6h.01"/></svg>,
  Spark:    (p: P) => <svg {...base(p.size)} {...p}><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/></svg>,
  Lock:     (p: P) => <svg {...base(p.size)} {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  FileCode: (p: P) => <svg {...base(p.size)} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m10 12-2 2 2 2M14 12l2 2-2 2"/></svg>,
  Terminal: (p: P) => <svg {...base(p.size)} {...p}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  ArrowR:   (p: P) => <svg {...base(p.size)} {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  ArrowU:   (p: P) => <svg {...base(p.size)} {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  External: (p: P) => <svg {...base(p.size)} {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Layers:   (p: P) => <svg {...base(p.size)} {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Pulse:    (p: P) => <svg {...base(p.size)} {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Dot:      (p: P) => <svg {...base(p.size)} {...p}><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>,
  Trash:    (p: P) => <svg {...base(p.size)} {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
};

export type IconName = keyof typeof I;
export const Icon: React.FC<{ name: IconName; size?: number; className?: string }> = ({ name, size, className }) => {
  const C = I[name];
  return <C size={size} className={className} />;
};
