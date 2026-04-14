"use client";

import { useState } from "react";
import { Button, Form, Input, App } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const router = useRouter();
  const supabase = createClient();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      if (error) {
        message.error("Invalid email or password");
        setLoading(false);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const role = authUser?.user_metadata?.role as string | undefined;
      if (role === "admin") router.push("/admin");
      else if (role === "teacher") router.push("/teacher/lessons");
      else if (role === "parent") router.push("/parent/children");
      else if (role === "dean") router.push("/dean");
      else router.push("/student/schedule");

      router.refresh();
    } catch {
      message.error("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        .login-root {
          min-height: 100vh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          background: #080e1a;
        }

        /* ── Left photo panel ── */
        .login-photo {
          flex: 1;
          position: relative;
          overflow: hidden;
          display: none;
        }
        @media (min-width: 900px) {
          .login-photo { display: block; }
        }

        .login-photo-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          filter: brightness(0.55) saturate(0.8);
          transform: scale(1.04);
          transition: transform 8s ease;
        }
        .login-photo:hover .login-photo-img {
          transform: scale(1.0);
        }

        .login-photo-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(6, 11, 24, 0.5) 0%,
            rgba(10, 20, 40, 0.2) 50%,
            rgba(6, 11, 24, 0.7) 100%
          );
        }

        .login-photo-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 52px 48px;
        }

        .login-photo-tag {
          display: inline-block;
          background: rgba(196, 160, 80, 0.18);
          border: 1px solid rgba(196, 160, 80, 0.4);
          color: #d4aa55;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 4px;
          margin-bottom: 20px;
          width: fit-content;
        }

        .login-photo-headline {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(2rem, 3.2vw, 3.4rem);
          font-weight: 600;
          line-height: 1.18;
          color: #f0ead8;
          margin: 0 0 16px 0;
          letter-spacing: -0.01em;
        }

        .login-photo-headline em {
          font-style: italic;
          color: #c4a050;
        }

        .login-photo-sub {
          font-size: 14px;
          color: rgba(240, 234, 216, 0.55);
          font-weight: 400;
          max-width: 340px;
          line-height: 1.65;
          margin: 0;
        }

        .login-photo-divider {
          width: 48px;
          height: 2px;
          background: linear-gradient(90deg, #c4a050, transparent);
          margin-bottom: 16px;
        }

        /* ── Right form panel ── */
        .login-form-panel {
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 40px;
          background: #080e1a;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 899px) {
          .login-form-panel {
            max-width: 100%;
            min-height: 100vh;
          }
        }

        /* subtle noise texture */
        .login-form-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.6;
        }

        /* gold radial glow top-right */
        .login-form-panel::after {
          content: '';
          position: absolute;
          top: -120px;
          right: -80px;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(196,160,80,0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-inner {
          position: relative;
          z-index: 1;
          max-width: 360px;
          width: 100%;
          margin: 0 auto;
        }

        .login-logo-wrap {
          margin-bottom: 36px;
        }

        .login-logo-img {
          height: 52px;
          width: auto;
          object-fit: contain;
          filter: brightness(1.1);
        }

        .login-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 2rem;
          font-weight: 600;
          color: #f0ead8;
          margin: 0 0 6px 0;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .login-subtitle {
          font-size: 13.5px;
          color: rgba(240, 234, 216, 0.4);
          font-weight: 400;
          margin: 0 0 36px 0;
        }

        .login-label {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(240, 234, 216, 0.5);
          margin-bottom: 6px;
          display: block;
        }

        .login-input-wrap .ant-input-affix-wrapper {
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 10px !important;
          height: 50px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .login-input-wrap .ant-input-affix-wrapper:hover {
          border-color: rgba(196,160,80,0.4) !important;
        }
        .login-input-wrap .ant-input-affix-wrapper-focused {
          border-color: rgba(196,160,80,0.7) !important;
          box-shadow: 0 0 0 3px rgba(196,160,80,0.12) !important;
        }
        .login-input-wrap .ant-input {
          background: transparent !important;
          color: #f0ead8 !important;
          font-size: 14px !important;
        }
        .login-input-wrap .ant-input::placeholder {
          color: rgba(240,234,216,0.2) !important;
        }
        .login-input-wrap .ant-input-prefix {
          margin-right: 10px;
        }
        .login-input-wrap .anticon {
          color: rgba(240,234,216,0.25) !important;
        }
        .login-input-wrap .ant-input-password-icon {
          color: rgba(240,234,216,0.25) !important;
        }
        .login-input-wrap .ant-input-password-icon:hover {
          color: rgba(240,234,216,0.5) !important;
        }
        .login-input-wrap .ant-form-item-explain-error {
          font-size: 12px !important;
          color: #ff7875 !important;
          margin-top: 4px !important;
        }
        .login-input-wrap .ant-form-item {
          margin-bottom: 18px !important;
        }

        .login-btn {
          width: 100%;
          height: 50px !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #c4a050 0%, #a07830 100%) !important;
          border: none !important;
          color: #080e1a !important;
          box-shadow: 0 4px 20px rgba(196,160,80,0.3) !important;
          transition: all 0.25s !important;
          margin-top: 8px;
        }
        .login-btn:hover {
          background: linear-gradient(135deg, #d4b560 0%, #b08840 100%) !important;
          box-shadow: 0 6px 28px rgba(196,160,80,0.45) !important;
          transform: translateY(-1px);
        }
        .login-btn:active {
          transform: translateY(0);
        }
        .login-btn .ant-btn-loading-icon {
          color: #080e1a !important;
        }

        .login-footer {
          margin-top: 28px;
          font-size: 12px;
          color: rgba(240, 234, 216, 0.2);
          text-align: center;
          line-height: 1.6;
        }

        .login-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
          margin: 28px 0;
        }
      `}</style>

      <div className="login-root">
        {/* Left: campus photo */}
        <div className="login-photo">
          <Image
            src="/models/kbtu kz.jpg"
            alt="KBTU Campus"
            fill
            className="login-photo-img"
            priority
            sizes="50vw"
          />
          <div className="login-photo-overlay" />
          <div className="login-photo-content">
            <span className="login-photo-tag">KBTU · Almaty</span>
            <div className="login-photo-divider" />
            <h2 className="login-photo-headline">
              Excellence<br />
              <em>Measured,</em><br />
              Managed.
            </h2>
            <p className="login-photo-sub">
              The integrated academic management platform for Kazakh-British Technical University.
            </p>
          </div>
        </div>

        {/* Right: form */}
        <div className="login-form-panel">
          <div className="login-inner">
            <div className="login-logo-wrap">
              <Image
                src="/models/logo_blue.png"
                alt="KBTU Logo"
                width={160}
                height={52}
                className="login-logo-img"
                priority
              />
            </div>

            <h1 className="login-title">Sign In</h1>
            <p className="login-subtitle">Access your academic portal</p>

            <div className="login-input-wrap">
              <Form
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
                requiredMark={false}
                size="large"
              >
                <Form.Item
                  name="email"
                  label={<span className="login-label">Email</span>}
                  rules={[
                    { required: true, message: "Enter email" },
                    { type: "email", message: "Invalid email" },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="you@kbtu.kz"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span className="login-label">Password</span>}
                  rules={[{ required: true, message: "Enter password" }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="••••••••"
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    htmlType="submit"
                    loading={loading}
                    className="login-btn"
                  >
                    {loading ? "" : "Enter Portal"}
                  </Button>
                </Form.Item>
              </Form>
            </div>

            <div className="login-divider" />
            <p className="login-footer">
              Contact your system administrator to request access.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
