import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/app/NotificationBell", () => ({
  NotificationBell: () => <button type="button" aria-label="Pranešimai">Pranešimai</button>,
}));

import { PageHeader } from "@/components/app/ui-bits";

describe("ŠA V2.3.24 – unified responsive page headers", () => {
  it.each(["Apžvalga", "Darbai", "Kalendorius", "Adresai", "Nuotraukos", "Pakeitimų žurnalas"])(
    "aligns the %s heading with one notification button",
    (title) => {
      const { container, unmount } = render(<PageHeader title={title} subtitle="Puslapio informacija" />);
      const row = screen.getByTestId("sa-page-header-row");
      expect(row).toContainElement(screen.getByRole("heading", { level: 1, name: title }));
      expect(row).toContainElement(screen.getByRole("button", { name: "Pranešimai" }));
      expect(container.querySelectorAll('[aria-label="Pranešimai"]')).toHaveLength(1);
      expect(row).toHaveClass("justify-between");
      unmount();
    },
  );

  it("keeps page actions below the shared title and notification row", () => {
    render(<PageHeader title="Darbai" subtitle="Šiandien liko: 2"
      actions={<button type="button">Naujas darbas</button>} />);
    const row = screen.getByTestId("sa-page-header-row");
    const actions = screen.getByRole("button", { name: "Naujas darbas" });
    expect(row).not.toContainElement(actions);
    expect(screen.getByTestId("sa-page-header")).toContainElement(actions);
    expect(screen.getByText("Šiandien liko: 2")).toBeInTheDocument();
  });
});
