import { Showcase } from "./Showcase";
import { PhoneMock } from "./PhoneMock";

export function CustomerApp() {
  return (
    <Showcase
      id="customer-app"
      eyebrow="The customer app"
      title={
        <>
          A menu your guests <span style={{ fontStyle: "italic", color: "var(--brand)" }}>love</span> to
          browse
        </>
      }
      body="Guests scan the QR on the table and a warm, photo-forward menu opens instantly — no app to install, no pinch-and-zoom PDF. It looks like your café, not a spreadsheet."
      bullets={[
        "Opens in a tap — fast on any phone",
        "Big, appetizing photos and clear prices",
        "Browse by category, search, and order with your server",
      ]}
      visual={<PhoneMock width={280} />}
    />
  );
}
