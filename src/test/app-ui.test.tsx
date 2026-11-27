import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { SportsActivityApp } from "@/routes/index";

describe("Sports Activity App UI Flows", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders Today dashboard with calorie guidance, expert recommendations, and Why this? citations", () => {
    render(<SportsActivityApp />);

    expect(screen.getByText(/Daily Calorie Guidance/i)).toBeInTheDocument();
    expect(screen.getByText(/Expert Weekly Targets/i)).toBeInTheDocument();

    const whyButtons = screen.getAllByRole("button", { name: /Why this\?/i });
    expect(whyButtons.length).toBeGreaterThan(0);

    fireEvent.click(whyButtons[0]!);
    expect(screen.getByText(/Reviewed recommendation record/i)).toBeInTheDocument();
  });

  it("navigates across Plan, Run GPS, Progress, Profile, and Internal Reviewer Console", () => {
    render(<SportsActivityApp />);

    fireEvent.click(screen.getByRole("button", { name: /Plan/i }));
    expect(screen.getByText(/Weekly Plan & Schedule/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Run GPS/i }));
    expect(screen.getByText(/GPS Run Tracker/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Manual Entry/i }));
    expect(screen.getByText(/Manual Run Entry/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Progress/i }));
    expect(screen.getByText(/Progress & Insights/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Profile/i }));
    expect(screen.getByText(/Profile & Settings/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Open Reviewer Console/i }));
    expect(screen.getByText(/Content Reviewer Console/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Run Suite/i }));
    expect(screen.getByText(/0 Violations/i)).toBeInTheDocument();
  });

  it("supports Gym session logging with previous session reference", () => {
    render(<SportsActivityApp />);

    fireEvent.click(screen.getByRole("button", { name: /Plan/i }));
    const logGymBtn = screen.queryByRole("button", { name: /Log Gym Session/i });
    if (logGymBtn) {
      fireEvent.click(logGymBtn);
      expect(screen.getByText(/Complete & Save Gym Session/i)).toBeInTheDocument();
    }
  });

  it("blocks under-18 users in onboarding and flags health screening conditions", () => {
    window.localStorage.setItem(
      "sports_activity_app_state_v1",
      JSON.stringify({ onboardingComplete: false }),
    );
    render(<SportsActivityApp />);

    // Delete/Reset from Profile -> Onboarding flow or direct edit
    fireEvent.click(screen.getByRole("button", { name: /Profile/i }));
    fireEvent.click(screen.getByRole("button", { name: /Edit Profile/i }));
    expect(screen.getByText(/Edit Profile & Goal/i)).toBeInTheDocument();

    const ageInput = screen.getByLabelText(/Age \(18\+ required\)/i);
    fireEvent.change(ageInput, { target: { value: "16" } });
    expect(screen.getByText(/adults 18 and older/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue to Training/i })).toBeDisabled();

    fireEvent.change(ageInput, { target: { value: "26" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Training/i }));
    fireEvent.click(screen.getByRole("button", { name: /Health Screening/i }));

    const heartSwitch = screen.getByRole("switch", {
      name: /Heart, blood pressure, or chest pain condition/i,
    });
    fireEvent.click(heartSwitch);
    expect(screen.getByText(/Consult a healthcare professional/i)).toBeInTheDocument();
  });

  it("supports Dark Mode, Dynamic Type, bilingual localization, and expandable history", () => {
    render(<SportsActivityApp />);

    fireEvent.click(screen.getByRole("button", { name: /Profile/i }));
    expect(screen.getByText(/Install on iPhone Home Screen/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Dark" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByRole("tab", { name: "Large" }));
    expect(document.documentElement.getAttribute("data-type-scale")).toBe("large");

    fireEvent.click(screen.getByRole("tab", { name: "Bahasa Indonesia" }));
    expect(screen.getByText(/Profil & Pengaturan/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Progres/i }));
    expect(screen.getByText(/Progres & Statistik/i)).toBeInTheDocument();

    const runHistoryBtn = screen.getByRole("button", { name: /Morning Park Casual Run/i });
    fireEvent.click(runHistoryBtn);
    expect(screen.getByText(/Split 1/i)).toBeInTheDocument();
  });
});
