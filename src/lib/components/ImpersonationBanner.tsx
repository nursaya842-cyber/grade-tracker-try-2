"use client";

import React from "react";
import { Alert, Button } from "antd";
import { stopImpersonation } from "@/app/(admin)/admin/_actions/impersonation-actions";

export default function ImpersonationBanner({ userName }: { userName: string }) {
  return (
    <Alert
      type="warning"
      banner
      message={
        <span>
          You are currently viewing as: <strong>{userName}</strong>
        </span>
      }
      action={
        <form action={stopImpersonation}>
          <Button size="small" type="primary" htmlType="submit">
            Return as Admin
          </Button>
        </form>
      }
      style={{ position: "sticky", top: 0, zIndex: 100 }}
    />
  );
}
