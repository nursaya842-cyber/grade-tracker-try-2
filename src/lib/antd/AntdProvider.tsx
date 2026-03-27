"use client";

import React from "react";
import { ConfigProvider, App } from "antd";
import ruRU from "antd/locale/ru_RU";

const theme = {
  token: {
    colorPrimary: "#1677ff",
    borderRadius: 6,
  },
};

export default function AntdProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider locale={ruRU} theme={theme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
