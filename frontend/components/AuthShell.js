import Link from "next/link";

export function BrandMark() {
  return <Link href="/" className="auth-brand-mark" aria-label="TimeMate home">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 18c4.2 0 5.5-12 10-12s4.3 12 9 12" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="2.5" cy="18" r="1.8" fill="var(--mint)"/><circle cx="12.5" cy="6" r="1.8" fill="var(--foreground)"/><circle cx="21.5" cy="18" r="1.8" fill="var(--amber)"/>
    </svg>
    <span>TimeMate <i>AI</i></span>
  </Link>;
}

export default function AuthShell({ eyebrow, title, description, children }) {
  return <main className="auth-shell">
    <section className="auth-stage" aria-label="TimeMate preview">
      <BrandMark/>
      <div className="auth-stage-copy">
        <p className="auth-eyebrow">A little more room in your day</p>
        <h2>Make time for <em>what matters.</em></h2>
        <p>Bring your plans, calendar, and reminders together in one calm workspace.</p>
      </div>
      <div className="auth-preview">
        <div className="auth-preview-head"><span>YOUR DAY</span><span className="auth-live-dot">● LIVE</span></div>
        <div className="auth-preview-task"><span className="auth-preview-check"/><span><b>Plan the week ahead</b><small>Today · 9:30 AM</small></span><i className="auth-priority"/></div>
        <div className="auth-preview-task"><span className="auth-preview-check is-done">✓</span><span><b>Finish the important things</b><small>Today · 11:00 AM</small></span><i className="auth-priority mint"/></div>
        <div className="auth-preview-task"><span className="auth-preview-check"/><span><b>Make space to recharge</b><small>Today · 4:00 PM</small></span><i className="auth-priority blue"/></div>
        <div className="auth-preview-progress"><span>YOUR MOMENTUM</span><div><i/></div><b>One step at a time</b></div>
      </div>
      <p className="auth-stage-footer"><span>01</span> Stay on top of your day, without adding noise.</p>
    </section>

    <section className="auth-side">
      <div className="auth-card">
        <div className="auth-mobile-brand"><BrandMark/></div>
        <p className="auth-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
      </div>
    </section>
  </main>;
}
