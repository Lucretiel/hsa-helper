import type { ReactNode } from "react";
import { Summary } from "./Summary";
import type { HsaEvent } from "../services/types";

interface LayoutProps {
  children: ReactNode;
  events: HsaEvent[];
  headerAction?: ReactNode;
}

export function Layout({ children, events, headerAction }: LayoutProps) {
  return (
    <div className="layout">
      <header className="header">
        <h1>HSA Helper</h1>
        <div className="summary-row">
          <Summary events={events} />
          {headerAction && <div className="header-action">{headerAction}</div>}
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}
