"use client";

import React, { useState } from "react";
import { Layout, Menu, Button, Typography, Avatar, Dropdown, theme } from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  TrophyOutlined,
  BarChartOutlined,
  AlertOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: "/admin", icon: <DashboardOutlined />, label: "Главная" },
  { key: "/admin/teachers", icon: <TeamOutlined />, label: "Преподаватели" },
  { key: "/admin/students", icon: <UserOutlined />, label: "Студенты" },
  { key: "/admin/subjects", icon: <BookOutlined />, label: "Предметы" },
  { key: "/admin/schedule", icon: <CalendarOutlined />, label: "Расписание" },
  { key: "/admin/clubs", icon: <TrophyOutlined />, label: "Клубы" },
  { key: "/admin/analytics", icon: <BarChartOutlined />, label: "Аналитика" },
  { key: "/admin/risk-dashboard", icon: <AlertOutlined />, label: "Риск-дашборд" },
];

export default function AdminShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { token } = theme.useToken();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const selectedKey =
    menuItems.find(
      (item) => item.key !== "/admin" && pathname.startsWith(item.key)
    )?.key ??
    (pathname === "/admin" ? "/admin" : "");

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
          overflow: "auto",
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? 0 : "0 20px",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #1677ff, #4096ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3L1 9L5 11.18V17.18L12 21L19 17.18V11.18L21 10.09V17H23V9L12 3ZM18.82 9L12 12.72L5.18 9L12 5.28L18.82 9ZM17 15.99L12 18.72L7 15.99V12.27L12 15L17 12.27V15.99Z"
                fill="white"
              />
            </svg>
          </div>
          {!collapsed && (
            <Text strong style={{ marginLeft: 12, fontSize: 15 }}>
              Панель админа
            </Text>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{
            border: "none",
            padding: "8px 0",
          }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: "margin-left 0.2s" }}>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            position: "sticky",
            top: 0,
            zIndex: 9,
            height: 64,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />

          <Dropdown
            menu={{
              items: [
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "Выйти",
                  danger: true,
                  onClick: handleSignOut,
                },
              ],
            }}
            placement="bottomRight"
          >
            <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar style={{ background: "#1677ff" }} icon={<UserOutlined />} />
              <Text style={{ fontSize: 14 }}>{userName}</Text>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ padding: 24, minHeight: "calc(100vh - 64px)" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
