import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import AntdProvider from "@/lib/antd/AntdProvider";
import QueryProvider from "@/lib/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "University Portal",
  description: "Academic Performance & Club Management Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <AntdRegistry>
          <AntdProvider>
            <QueryProvider>{children}</QueryProvider>
          </AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
