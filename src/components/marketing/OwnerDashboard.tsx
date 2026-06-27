import { Showcase } from "./Showcase";
import { DashboardMock } from "./DashboardMock";

export function OwnerDashboard() {
  return (
    <Showcase
      id="owner-dashboard"
      reverse
      eyebrow="The owner dashboard"
      title={
        <>
          Change your menu in <span style={{ fontStyle: "italic", color: "var(--brand)" }}>seconds</span>
        </>
      }
      body="Update a price, add a photo, or flip an item to sold-out — guests see it the moment you save. No reprinting, no waiting, no design skills needed."
      bullets={[
        "Add items and categories in minutes",
        "Sold-out in a tap — the item dims for everyone",
        "Daily specials and promos when you want them",
      ]}
      visual={<DashboardMock />}
    />
  );
}
