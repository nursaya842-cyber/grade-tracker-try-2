"use client";

import { useState } from "react";
import { Button, Form, Input, Typography, App } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

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
        message.error("Неверный email или пароль");
        setLoading(false);
        return;
      }

      // Get role from user metadata (avoids RLS timing issues)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const role = authUser?.user_metadata?.role as string | undefined;
      if (role === "admin") router.push("/admin");
      else if (role === "teacher") router.push("/teacher/lessons");
      else if (role === "parent") router.push("/parent/children");
      else router.push("/student/schedule");

      router.refresh();
    } catch {
      message.error("Ошибка подключения к серверу");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d2137 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Glow accent */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(22,119,255,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "0 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo / Header area */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              boxShadow: "0 8px 32px rgba(22,119,255,0.3)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3L1 9L5 11.18V17.18L12 21L19 17.18V11.18L21 10.09V17H23V9L12 3ZM18.82 9L12 12.72L5.18 9L12 5.28L18.82 9ZM17 15.99L12 18.72L7 15.99V12.27L12 15L17 12.27V15.99Z"
                fill="white"
              />
            </svg>
          </div>
          <Title
            level={3}
            style={{
              color: "#e8edf4",
              margin: 0,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            KBTU CVM System
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
            Войдите в систему управления
          </Text>
        </div>

        {/* Login card */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "36px 32px 28px",
            boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
          }}
        >
          <Form
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="email"
              label={
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 500 }}>
                  Email
                </span>
              }
              rules={[
                { required: true, message: "Введите email" },
                { type: "email", message: "Некорректный email" },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: "rgba(255,255,255,0.3)" }} />}
                placeholder="example@university.kz"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "#e8edf4",
                  height: 48,
                  borderRadius: 10,
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 500 }}>
                  Пароль
                </span>
              }
              rules={[{ required: true, message: "Введите пароль" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "rgba(255,255,255,0.3)" }} />}
                placeholder="••••••••"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "#e8edf4",
                  height: 48,
                  borderRadius: 10,
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 48,
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 15,
                  background: "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
                  border: "none",
                  boxShadow: "0 4px 16px rgba(22,119,255,0.35)",
                }}
              >
                Войти
              </Button>
            </Form.Item>
          </Form>
        </div>

        <Text
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 24,
            color: "rgba(255,255,255,0.25)",
            fontSize: 12,
          }}
        >
          Для получения доступа обратитесь к администратору
        </Text>
      </div>
    </div>
  );
}
