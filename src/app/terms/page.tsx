import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { FEEDBACK_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service — Mesa",
  description: "The terms for using Mesa during the beta.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 1, 2026">
      <p>
        Welcome to Mesa. Mesa is a digital menu service that lets cafés publish a QR-code menu and
        manage it from an owner dashboard. Mesa is operated by Cortana Tech Solutions
        (&ldquo;Mesa&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using
        the service, you agree to these terms.
      </p>

      <h2>1. The beta</h2>
      <p>
        Mesa is currently in <strong>beta</strong>. It is provided free of charge while we test and
        improve it. Features may change, break, or be removed, and the service may be interrupted.
        We may reset or delete beta data, so please don&rsquo;t rely on Mesa as your only record of
        your menu. The prices shown on our pricing page are for information only — no payment is
        collected during the beta.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must give accurate sign-up details and keep your password secure. You&rsquo;re
        responsible for activity under your account. Tell us promptly if you suspect unauthorized
        use. You must be authorized to act for the café you set up.
      </p>

      <h2>3. Your content</h2>
      <p>
        Your menu items, descriptions, photos, branding, and café details (&ldquo;your
        content&rdquo;) remain <strong>yours</strong>. You grant Mesa a licence to host, display,
        and process your content solely to provide the service (for example, showing your menu to
        your guests). You&rsquo;re responsible for your content — including that prices,
        ingredients, and allergen or dietary information are accurate and lawful, and that you have
        the rights to any images you upload.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>upload unlawful, infringing, or harmful content;</li>
        <li>attempt to break, overload, probe, or gain unauthorized access to the service or other cafés&rsquo; data;</li>
        <li>use Mesa to send spam or to collect people&rsquo;s data without a lawful basis; or</li>
        <li>resell or misrepresent the service.</li>
      </ul>

      <h2>5. Guests and orders</h2>
      <p>
        Where ordering is enabled, Mesa helps a guest assemble an order to show your staff. Mesa is
        not a payment processor and does not handle money. You are responsible for fulfilling orders,
        pricing, taxes, and your dealings with your guests.
      </p>

      <h2>6. Plans &amp; future billing</h2>
      <p>
        During the beta you may try any tier for free. If we introduce paid plans, we&rsquo;ll give
        notice and you&rsquo;ll be able to choose whether to continue. We won&rsquo;t charge a card
        without your clear consent.
      </p>

      <h2>7. Availability &amp; &ldquo;as is&rdquo;</h2>
      <p>
        Mesa is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>, without
        warranties of any kind. We don&rsquo;t guarantee the service will be uninterrupted, error-free,
        or that data will never be lost. To the extent allowed by law, Mesa is not liable for
        indirect or consequential losses, or for lost profits, revenue, or data arising from your use
        of the service.
      </p>

      <h2>8. Suspension &amp; termination</h2>
      <p>
        You may stop using Mesa and delete your café at any time. We may suspend or end access if you
        breach these terms or to protect the service or other users. You can request deletion of your
        account and data using the contact below.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these terms as Mesa evolves. We&rsquo;ll post the new version here with an
        updated date; continuing to use Mesa means you accept the changes.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of the Republic of the Philippines, and disputes are
        subject to the courts of the Philippines.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms? Email us at <a href={`mailto:${FEEDBACK_EMAIL}`}>{FEEDBACK_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
