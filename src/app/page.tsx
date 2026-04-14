"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [countersStarted, setCountersStarted] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCountersStarted(true); },
      { threshold: 0.4 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --navy: #0b1d3a;
          --navy-mid: #14294f;
          --navy-light: #1e3a6e;
          --gold: #c5952a;
          --gold-light: #e8b84b;
          --gold-pale: #f5e9c8;
          --cream: #f7f2ea;
          --white: #ffffff;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        html { scroll-behavior: smooth; }

        body.landing {
          font-family: 'DM Sans', sans-serif;
          background: var(--navy);
          color: var(--cream);
          overflow-x: hidden;
        }

        /* ── NAV ──────────────────────────────── */
        .nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 20px 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav.scrolled {
          background: rgba(11, 29, 58, 0.96);
          backdrop-filter: blur(20px);
          padding: 14px 60px;
          border-bottom: 1px solid rgba(197, 149, 42, 0.15);
        }
        .nav-logo { display: flex; align-items: center; }
        .nav-logo img { height: 44px; filter: brightness(0) invert(1); }
        .nav-cta {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .btn-ghost {
          padding: 10px 24px;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 4px;
          color: var(--cream);
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.04em;
          transition: all 0.25s;
        }
        .btn-ghost:hover {
          border-color: var(--gold);
          color: var(--gold-light);
        }
        .btn-primary {
          padding: 10px 28px;
          background: var(--gold);
          border: 1px solid var(--gold);
          border-radius: 4px;
          color: var(--navy);
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.04em;
          transition: all 0.25s;
        }
        .btn-primary:hover {
          background: var(--gold-light);
          border-color: var(--gold-light);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(197, 149, 42, 0.3);
        }

        /* ── HERO ─────────────────────────────── */
        .hero {
          position: relative;
          height: 100vh;
          min-height: 700px;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .hero-photo {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .hero-photo img {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center 30%;
          transform: scale(1.05);
          animation: heroZoom 12s ease-out forwards;
        }
        @keyframes heroZoom {
          from { transform: scale(1.05); }
          to   { transform: scale(1.00); }
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            rgba(11, 29, 58, 0.92) 0%,
            rgba(11, 29, 58, 0.75) 55%,
            rgba(11, 29, 58, 0.45) 100%
          );
          z-index: 1;
        }
        .hero-ornament {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 160px;
          background: linear-gradient(to top, var(--navy) 0%, transparent 100%);
          z-index: 2;
        }
        .hero-content {
          position: relative;
          z-index: 3;
          max-width: 760px;
          padding: 0 60px;
          animation: heroIn 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          opacity: 0;
        }
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
          padding: 7px 16px;
          border: 1px solid rgba(197, 149, 42, 0.5);
          border-radius: 2px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--gold-light);
        }
        .hero-tag-dot {
          width: 5px; height: 5px;
          background: var(--gold);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(52px, 6vw, 84px);
          font-weight: 300;
          line-height: 1.08;
          letter-spacing: -0.01em;
          color: var(--white);
          margin-bottom: 8px;
        }
        .hero-title em {
          font-style: italic;
          color: var(--gold-light);
        }
        .hero-sub {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 3.5vw, 44px);
          font-weight: 300;
          color: rgba(245, 240, 232, 0.7);
          margin-bottom: 28px;
          letter-spacing: 0.01em;
        }
        .hero-desc {
          font-size: 16px;
          line-height: 1.7;
          color: rgba(245, 240, 232, 0.65);
          max-width: 520px;
          margin-bottom: 44px;
          font-weight: 300;
        }
        .hero-actions {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .btn-hero {
          padding: 15px 40px;
          background: var(--gold);
          border: none;
          border-radius: 3px;
          color: var(--navy);
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: all 0.3s;
        }
        .btn-hero:hover {
          background: var(--gold-light);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(197, 149, 42, 0.35);
        }
        .hero-scroll {
          position: absolute;
          bottom: 40px;
          left: 60px;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(245, 240, 232, 0.4);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .hero-scroll-line {
          width: 40px;
          height: 1px;
          background: rgba(197, 149, 42, 0.4);
          animation: scrollLine 2s ease-in-out infinite;
        }
        @keyframes scrollLine {
          0%, 100% { width: 40px; opacity: 0.4; }
          50% { width: 64px; opacity: 0.8; }
        }

        /* ── STATS ────────────────────────────── */
        .stats-bar {
          background: var(--navy-mid);
          border-top: 1px solid rgba(197, 149, 42, 0.15);
          border-bottom: 1px solid rgba(197, 149, 42, 0.15);
          padding: 48px 60px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }
        .stat-item {
          padding: 0 40px;
          border-right: 1px solid rgba(255,255,255,0.08);
          text-align: center;
        }
        .stat-item:first-child { padding-left: 0; }
        .stat-item:last-child { border-right: none; padding-right: 0; }
        .stat-number {
          font-family: 'Cormorant Garamond', serif;
          font-size: 56px;
          font-weight: 300;
          color: var(--gold-light);
          line-height: 1;
          margin-bottom: 8px;
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 2px;
        }
        .stat-suffix {
          font-size: 28px;
          color: var(--gold);
        }
        .stat-label {
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(245, 240, 232, 0.45);
          font-weight: 400;
        }

        /* ── SECTION BASE ─────────────────────── */
        .section {
          padding: 100px 60px;
        }
        .section-header {
          margin-bottom: 64px;
        }
        .section-eyebrow {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 500;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .section-eyebrow::before {
          content: '';
          display: block;
          width: 32px;
          height: 1px;
          background: var(--gold);
        }
        .section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 4vw, 56px);
          font-weight: 300;
          line-height: 1.12;
          color: var(--white);
          max-width: 640px;
        }
        .section-title em {
          font-style: italic;
          color: var(--gold-light);
        }

        /* ── ROLES ────────────────────────────── */
        .roles-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: rgba(197, 149, 42, 0.1);
          border: 1px solid rgba(197, 149, 42, 0.1);
        }
        .role-card {
          background: var(--navy-mid);
          padding: 48px 36px;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .role-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0;
          width: 100%;
          height: 3px;
          background: var(--gold);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .role-card:hover::after {
          transform: scaleX(1);
        }
        .role-card:hover {
          background: var(--navy-light);
          transform: translateY(-4px);
        }
        .role-icon {
          width: 52px;
          height: 52px;
          border: 1px solid rgba(197, 149, 42, 0.3);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          font-size: 22px;
          color: var(--gold-light);
          transition: all 0.35s;
        }
        .role-card:hover .role-icon {
          border-color: var(--gold);
          background: rgba(197, 149, 42, 0.08);
        }
        .role-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 500;
          color: var(--white);
          margin-bottom: 12px;
          letter-spacing: 0.01em;
        }
        .role-desc {
          font-size: 14px;
          line-height: 1.7;
          color: rgba(245, 240, 232, 0.55);
          margin-bottom: 28px;
          font-weight: 300;
        }
        .role-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .role-features li {
          font-size: 13px;
          color: rgba(245, 240, 232, 0.5);
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 300;
        }
        .role-features li::before {
          content: '';
          width: 16px;
          height: 1px;
          background: var(--gold);
          flex-shrink: 0;
        }

        /* ── FEATURES SPLIT ───────────────────── */
        .features-section {
          background: var(--navy-mid);
          border-top: 1px solid rgba(197, 149, 42, 0.08);
          border-bottom: 1px solid rgba(197, 149, 42, 0.08);
        }
        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }
        .features-text {}
        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 32px;
          margin-top: 48px;
        }
        .feature-item {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 4px;
          transition: all 0.3s;
        }
        .feature-item:hover {
          border-color: rgba(197, 149, 42, 0.2);
          background: rgba(197, 149, 42, 0.03);
        }
        .feature-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          color: var(--gold);
          font-weight: 500;
          letter-spacing: 0.08em;
          flex-shrink: 0;
          padding-top: 2px;
        }
        .feature-body {}
        .feature-title {
          font-size: 16px;
          font-weight: 500;
          color: var(--cream);
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }
        .feature-desc {
          font-size: 13px;
          line-height: 1.65;
          color: rgba(245, 240, 232, 0.5);
          font-weight: 300;
        }
        .features-visual {
          position: relative;
          height: 600px;
        }
        .features-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;
          filter: brightness(0.7) saturate(0.8);
        }
        .features-photo-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(11, 29, 58, 0.6) 0%, transparent 60%);
          border-radius: 4px;
        }
        .features-photo-badge {
          position: absolute;
          bottom: 32px;
          left: 32px;
          padding: 20px 28px;
          background: rgba(11, 29, 58, 0.9);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(197, 149, 42, 0.3);
          border-radius: 4px;
        }
        .badge-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 40px;
          font-weight: 300;
          color: var(--gold-light);
          line-height: 1;
        }
        .badge-text {
          font-size: 12px;
          color: rgba(245, 240, 232, 0.5);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 4px;
          font-weight: 300;
        }

        /* ── ARCHITECTURE ─────────────────────── */
        .arch-section {}
        .arch-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.05);
          margin-top: 64px;
        }
        .arch-block {
          padding: 48px 40px;
          background: var(--navy);
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
        }
        .arch-block:hover {
          background: var(--navy-mid);
          border-bottom-color: var(--gold);
        }
        .arch-label {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 20px;
          font-weight: 500;
        }
        .arch-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 400;
          color: var(--white);
          margin-bottom: 16px;
        }
        .arch-text {
          font-size: 13px;
          line-height: 1.7;
          color: rgba(245, 240, 232, 0.45);
          font-weight: 300;
        }
        .arch-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 24px;
        }
        .arch-tag {
          padding: 4px 12px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 2px;
          font-size: 11px;
          color: rgba(245, 240, 232, 0.4);
          letter-spacing: 0.06em;
          font-weight: 300;
        }

        /* ── CTA ──────────────────────────────── */
        .cta-section {
          position: relative;
          overflow: hidden;
          background: var(--navy-light);
          padding: 120px 60px;
          text-align: center;
          border-top: 1px solid rgba(197, 149, 42, 0.15);
          border-bottom: 1px solid rgba(197, 149, 42, 0.15);
        }
        .cta-section::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(197, 149, 42, 0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-eyebrow {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 500;
          margin-bottom: 24px;
        }
        .cta-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(40px, 5vw, 68px);
          font-weight: 300;
          color: var(--white);
          line-height: 1.1;
          margin-bottom: 20px;
        }
        .cta-title em {
          font-style: italic;
          color: var(--gold-light);
        }
        .cta-sub {
          font-size: 16px;
          color: rgba(245, 240, 232, 0.5);
          max-width: 480px;
          margin: 0 auto 48px;
          line-height: 1.7;
          font-weight: 300;
        }
        .cta-btn {
          display: inline-block;
          padding: 18px 56px;
          background: var(--gold);
          border-radius: 3px;
          color: var(--navy);
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: all 0.3s;
        }
        .cta-btn:hover {
          background: var(--gold-light);
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(197, 149, 42, 0.3);
        }

        /* ── FOOTER ───────────────────────────── */
        .footer {
          background: #070f1e;
          padding: 48px 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .footer-logo img {
          height: 36px;
          filter: brightness(0) invert(1);
          opacity: 0.5;
        }
        .footer-text {
          font-size: 12px;
          color: rgba(245, 240, 232, 0.25);
          letter-spacing: 0.04em;
        }
        .footer-link {
          font-size: 12px;
          color: rgba(245, 240, 232, 0.3);
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.2s;
        }
        .footer-link:hover { color: var(--gold-light); }

        /* ── COUNTER ──────────────────────────── */
        .counter { transition: opacity 0.5s; }

        /* ── DIVIDER ──────────────────────────── */
        .ornament-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 16px 0;
          color: rgba(197, 149, 42, 0.3);
        }
        .ornament-divider::before,
        .ornament-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(197, 149, 42, 0.12);
        }

        @media (max-width: 1024px) {
          .nav { padding: 16px 32px; }
          .nav.scrolled { padding: 12px 32px; }
          .section { padding: 80px 32px; }
          .hero-content { padding: 0 32px; }
          .stats-bar { padding: 40px 32px; grid-template-columns: repeat(2, 1fr); gap: 32px; }
          .stat-item { border-right: none; padding: 0; }
          .roles-grid { grid-template-columns: repeat(2, 1fr); }
          .features-grid { grid-template-columns: 1fr; gap: 48px; }
          .features-visual { height: 400px; }
          .arch-grid { grid-template-columns: 1fr; }
          .footer { flex-direction: column; gap: 20px; text-align: center; }
        }

        @media (max-width: 640px) {
          .roles-grid { grid-template-columns: 1fr; }
          .hero-actions { flex-direction: column; align-items: flex-start; }
          .nav { padding: 14px 20px; }
          .section { padding: 64px 20px; }
          .hero-content { padding: 0 20px; }
          .stats-bar { padding: 40px 20px; }
          .footer { padding: 40px 20px; }
          .cta-section { padding: 80px 20px; }
        }
      `}</style>

      <div className="landing" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* NAV */}
        <nav className={`nav${scrolled ? " scrolled" : ""}`}>
          <div className="nav-logo">
            <Image src="/models/logo_blue.png" alt="KBTU" width={160} height={44} style={{ height: 44, width: "auto", filter: "brightness(0) invert(1)" }} />
          </div>
          <div className="nav-cta">
            <Link href="/login" className="btn-ghost">Sign In</Link>
            <Link href="/login" className="btn-primary">Access Portal</Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-photo">
            <Image src="/models/kbtu kz.jpg" alt="KBTU Campus" fill priority style={{ objectFit: "cover", objectPosition: "center 30%" }} />
          </div>
          <div className="hero-overlay" />
          <div className="hero-ornament" />
          <div className="hero-content">
            <div className="hero-tag">
              <span className="hero-tag-dot" />
              KBTU Academic Platform
            </div>
            <h1 className="hero-title">
              Excellence<br />
              <em>Measured,</em><br />
              Managed.
            </h1>
            <p className="hero-desc">
              A unified academic management system for the Kazakh-British Technical University — tracking performance, attendance, and engagement across every department.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="btn-hero">Enter Portal</Link>
            </div>
          </div>
          <div className="hero-scroll">
            <span className="hero-scroll-line" />
            Scroll to explore
          </div>
        </section>

        {/* STATS */}
        <div className="stats-bar" ref={statsRef}>
          <StatItem value={3347} suffix="+" label="Enrolled Students" started={countersStarted} />
          <StatItem value={31} suffix="+" label="Faculty Members" started={countersStarted} />
          <StatItem value={36} suffix="+" label="Academic Subjects" started={countersStarted} />
          <StatItem value={100} suffix="%" label="Digital Attendance" started={countersStarted} />
        </div>

        {/* ROLES */}
        <section className="section">
          <div className="section-header">
            <div className="section-eyebrow">Platform Overview</div>
            <h2 className="section-title">One platform.<br /><em>Four perspectives.</em></h2>
          </div>
          <div className="roles-grid">
            <RoleCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              }
              title="Student"
              desc="Access your complete academic profile — from lesson schedules to personal recommendations."
              features={["Weekly schedule & events calendar", "Real-time grades & GPA", "Club membership & events", "AI-powered recommendations", "Weekly wellness check-in"]}
            />
            <RoleCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>
                </svg>
              }
              title="Teacher"
              desc="Manage your courses, track attendance, and monitor student performance with precision."
              features={["Lesson management & reports", "Attendance marking (manual + Face ID)", "Grade entry per lesson", "Student performance analytics", "At-risk student alerts"]}
            />
            <RoleCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                </svg>
              }
              title="Administrator"
              desc="Full operational oversight — schedules, faculty, analytics, and system-wide risk monitoring."
              features={["Full CRUD on all entities", "Lesson series scheduling", "Risk & effectiveness dashboards", "System-wide analytics", "User impersonation & audit log"]}
            />
            <RoleCard
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              }
              title="Parent"
              desc="Stay informed on your child's academic journey with transparent, real-time data access."
              features={["Child performance overview", "Attendance tracking", "GPA & grade history", "AI recommendations feed", "Engagement score monitoring"]}
            />
          </div>
        </section>

        <div className="ornament-divider" style={{ padding: "0 60px" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L12 8H18L13 12L15 18L10 14L5 18L7 12L2 8H8L10 2Z" stroke="currentColor" strokeWidth="1" fill="none"/></svg>
        </div>

        {/* FEATURES */}
        <section className="section features-section">
          <div className="features-grid">
            <div className="features-text">
              <div className="section-eyebrow">Key Capabilities</div>
              <h2 className="section-title">Built for <em>real academic workflows.</em></h2>
              <div className="feature-list">
                {[
                  ["01", "Face ID Attendance", "Biometric recognition powered by face-api.js. Identify all students in a group photo — or stream live from webcam."],
                  ["02", "AI Recommendations", "Rule-based engine + Gemini AI generates personalized Next Best Action cards for each student based on attendance, GPA, and engagement."],
                  ["03", "Engagement Scoring", "Composite metric: 35% attendance + 30% GPA + 20% club activity + 15% self-assessment. Segments students from Excellent to At-Risk."],
                  ["04", "Recurrence Scheduling", "Create a series once with a JSONB recurrence rule — the system generates every individual lesson automatically."],
                ].map(([num, title, desc]) => (
                  <div className="feature-item" key={num}>
                    <div className="feature-num">{num}</div>
                    <div className="feature-body">
                      <div className="feature-title">{title}</div>
                      <div className="feature-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="features-visual">
              <Image src="/models/kbtu kz.jpg" alt="KBTU" fill className="features-photo" style={{ objectFit: "cover", borderRadius: 4, filter: "brightness(0.7) saturate(0.8)" }} />
              <div className="features-photo-overlay" />
              <div className="features-photo-badge">
                <div className="badge-num">24h</div>
                <div className="badge-text">Recommendation Freshness</div>
              </div>
            </div>
          </div>
        </section>

        {/* TECH STACK */}
        <section className="section arch-section">
          <div className="section-header">
            <div className="section-eyebrow">Technology</div>
            <h2 className="section-title">Modern stack.<br /><em>Serious infrastructure.</em></h2>
          </div>
          <div className="arch-grid">
            <div className="arch-block">
              <div className="arch-label">Frontend</div>
              <div className="arch-title">Next.js 15</div>
              <div className="arch-text">App Router with server actions. TypeScript throughout. Ant Design 5 component library for admin-grade UI density.</div>
              <div className="arch-tags">
                <span className="arch-tag">React 19</span>
                <span className="arch-tag">TypeScript</span>
                <span className="arch-tag">Ant Design</span>
                <span className="arch-tag">Tailwind CSS</span>
                <span className="arch-tag">React Query</span>
              </div>
            </div>
            <div className="arch-block">
              <div className="arch-label">Backend & Data</div>
              <div className="arch-title">Supabase</div>
              <div className="arch-text">PostgreSQL with comprehensive RLS policies per role. Supabase Auth with JWT. Three storage buckets. Deno Edge Functions.</div>
              <div className="arch-tags">
                <span className="arch-tag">PostgreSQL</span>
                <span className="arch-tag">Row Level Security</span>
                <span className="arch-tag">Deno Edge Functions</span>
                <span className="arch-tag">Supabase Auth</span>
              </div>
            </div>
            <div className="arch-block">
              <div className="arch-label">Intelligence</div>
              <div className="arch-title">Gemini + face-api</div>
              <div className="arch-text">Google Gemini 2.5 Flash for recommendation generation. face-api.js with SSD MobileNet for biometric attendance.</div>
              <div className="arch-tags">
                <span className="arch-tag">Gemini 2.5 Flash</span>
                <span className="arch-tag">SSD MobileNet</span>
                <span className="arch-tag">Vercel Cron</span>
                <span className="arch-tag">Recharts</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-eyebrow">Ready to begin</div>
          <h2 className="cta-title">Access the <em>KBTU CVM</em><br />portal today.</h2>
          <p className="cta-sub">Sign in with your institutional credentials to view your academic dashboard.</p>
          <Link href="/login" className="cta-btn">Sign In Now</Link>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-logo">
            <Image src="/models/logo_blue.png" alt="KBTU" width={120} height={36} style={{ height: 36, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.5 }} />
          </div>
          <div className="footer-text">© 2026 KBTU CVM System. Kazakh-British Technical University.</div>
          <Link href="/login" className="footer-link">Sign In →</Link>
        </footer>
      </div>
    </>
  );
}

function StatItem({ value, suffix, label, started }: { value: number; suffix: string; label: string; started: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const duration = 1800;
    const step = 16;
    const increment = value / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [started, value]);

  return (
    <div className="stat-item">
      <div className="stat-number">
        <span>{started ? count.toLocaleString() : "0"}</span>
        <span className="stat-suffix">{suffix}</span>
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function RoleCard({ icon, title, desc, features }: { icon: React.ReactNode; title: string; desc: string; features: string[] }) {
  return (
    <div className="role-card">
      <div className="role-icon">{icon}</div>
      <div className="role-title">{title}</div>
      <div className="role-desc">{desc}</div>
      <ul className="role-features">
        {features.map((f) => <li key={f}>{f}</li>)}
      </ul>
    </div>
  );
}
