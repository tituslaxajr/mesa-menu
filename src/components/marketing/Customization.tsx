import { Showcase } from "./Showcase";
import { ThemePicker } from "./ThemePicker";

export function Customization() {
  return (
    <Showcase
      id="customization"
      eyebrow="Customization"
      title={
        <>
          Make it look <span style={{ fontStyle: "italic", color: "var(--brand)" }}>exactly</span> like
          your café
        </>
      }
      body="Pick a theme, set your accent colour, drop in your logo, and choose a font pairing. Mesa keeps everything warm and readable — so it always looks designed, never default."
      bullets={[
        "Ready-made themes, from cozy to bold",
        "Your accent colour and logo throughout",
        "Editorial serif + clean sans, tuned for menus",
      ]}
      visual={<ThemePicker />}
    />
  );
}
