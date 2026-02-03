import type { ReactNode } from "react";
import { Summary } from "./Summary";
import type { HsaEvent } from "../services/types";

interface LayoutProps {
  children: ReactNode;
  events: HsaEvent[];
}

export function Layout({ children, events }: LayoutProps) {
  return (
    <div className="layout">
      <header className="header">
        <h1>HSA Helper</h1>
        <Summary events={events} />
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}
