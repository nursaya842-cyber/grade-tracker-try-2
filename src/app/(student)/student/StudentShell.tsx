"use client";

import React, { useState } from "react";
import { Layout, Menu, Button, Typography, Avatar, Dropdown, theme } from "antd";
import {
  CalendarOutlined,
  TeamOutlined,
  CrownOutlined,
  NotificationOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

export default function StudentShell({
  children,
  userName,
  isClubHead,
}: {
  children: React.ReactNode;
  userName: string;
  isClubHead: boolean;
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

  const menuItems = [
    { key: "/student/schedule", icon: <CalendarOutlined />, label: "Расписание" },
    { key: "/student/my-clubs", icon: <TeamOutlined />, label: "Мои клубы" },
    ...(isClubHead
      ? [{ key: "/student/my-club", icon: <CrownOutlined />, label: "Мой клуб" }]
      : []),
    { key: "/student/announcements", icon: <NotificationOutlined />, label: "Объявления" },
    { key: "/student/profile", icon: <UserOutlined />, label: "Профиль" },
  ];

  const selectedKey =
    menuItems.find((item) => pathname.startsWith(item.key))?.key ?? "";

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
              background: "linear-gradient(135deg, #722ed1, #9254de)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <UserOutlined style={{ color: "#fff", fontSize: 16 }} />
          </div>
          {!collapsed && (
            <Text strong style={{ marginLeft: 12, fontSize: 15 }}>
              Студент
            </Text>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ border: "none", padding: "8px 0" }}
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
                { key: "logout", icon: <LogoutOutlined />, label: "Выйти", danger: true, onClick: handleSignOut },
              ],
            }}
            placement="bottomRight"
          >
            <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar style={{ background: "#722ed1" }} icon={<UserOutlined />} />
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
