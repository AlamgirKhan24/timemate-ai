"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/AuthShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [apiOnline, setApiOnline] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/health`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setApiOnline(data.status === "ok"))
      .catch(() => { if (!controller.signal.aborted) setApiOnline(false); });
    return () => controller.abort();
  }, []);

  return <main className="landing-page">
    <header className="landing-top">
      <BrandMark/>
      <nav aria-label="Main menu" className="flex items-center gap-3">
        <Link href="/login" className="landing-login">Sign in</Link>
        <Link href="/register" className="landing-start">Get started <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>

    <section className="landing-hero">
      <div className="landing-copy">
        <p className="dashboard-eyebrow"><span className="landing-pulse"/> A calmer way to plan</p>
        <h1>Make time for <em>what matters.</em></h1>
        <p className="landing-subtitle">A thoughtful calendar and task companion that keeps your day clear, your priorities close, and your reminders right on time.</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/register" className="landing-start landing-start-large">Create your free account <span aria-hidden="true">↗</span></Link>
          <Link href="/login" className="landing-secondary">I already have an account</Link>
        </div>
        <div className="landing-status" aria-live="polite"><span className={`landing-status-dot ${apiOnline === false ? "is-offline" : ""}`}/>{apiOnline === null ? "Checking your workspace connection" : apiOnline ? "Workspace services are online" : "Workspace service is currently offline"}</div>
      </div>

      <div className="landing-preview-wrap" aria-label="Illustration of a personal task dashboard">
        <div className="landing-orbit landing-orbit-one"/><div className="landing-orbit landing-orbit-two"/>
        <div className="landing-preview">
          <div className="landing-preview-header"><div><p className="dashboard-eyebrow">TODAY · YOUR WORKSPACE</p><h2>A steady start.</h2></div><span className="landing-preview-avatar">TM</span></div>
          <div className="landing-preview-summary"><div><b>03</b><span>on your list</span></div><div><b>01</b><span>already done</span></div><div className="landing-preview-flourish">✳</div></div>
          <div className="landing-preview-list">
            <div className="landing-preview-item"><span className="landing-preview-check done">✓</span><span><b>Set your priorities</b><small>Completed · 9:00 AM</small></span><i className="mint"/></div>
            <div className="landing-preview-item"><span className="landing-preview-check"/><span><b>Focus on what matters</b><small>Next up · 11:30 AM</small></span><i/></div>
            <div className="landing-preview-item"><span className="landing-preview-check"/><span><b>Leave room to recharge</b><small>Later · 4:00 PM</small></span><i className="blue"/></div>
          </div>
          <div className="landing-preview-footer"><span>YOUR DAY, IN VIEW</span><div><span/><span/><span/><span/><span/><span/><span/></div></div>
        </div>
        <div className="landing-float-note"><span>✦</span> A gentle nudge, right on time</div>
      </div>
    </section>

    <section className="landing-features" aria-label="TimeMate features">
      <article><span className="landing-feature-icon">◷</span><div><h2>Plan with clarity</h2><p>Keep tasks and your calendar together, with time shown in your timezone.</p></div><span className="landing-feature-index">01</span></article>
      <article><span className="landing-feature-icon mint">⌁</span><div><h2>Stay gently on track</h2><p>Set reminders for the things you don’t want to miss.</p></div><span className="landing-feature-index">02</span></article>
      <article><span className="landing-feature-icon blue">✳</span><div><h2>Let AI help you plan</h2><p>Turn a simple instruction into a task draft you can review before saving.</p></div><span className="landing-feature-index">03</span></article>
    </section>
    <footer className="landing-footer"><BrandMark/><span>Make a little more room for your day.</span></footer>
  </main>;
}
