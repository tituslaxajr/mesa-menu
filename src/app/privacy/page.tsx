import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { FEEDBACK_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy — Mesa",
  description: "How Mesa handles your data during the beta.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 1, 2026">
      <p>
        This policy explains what Mesa (operated by Cortana Tech Solutions) collects, why, and your
        choices. We handle personal data in line with the Philippines&rsquo; Data Privacy Act of 2012
        (RA 10173). &ldquo;You&rdquo; means a café owner using the dashboard; &ldquo;guest&rdquo;
        means a diner viewing a café&rsquo;s menu.
      </p>

      <h2>What we collect</h2>
      <h3>From café owners</h3>
      <ul>
        <li><strong>Account data</strong> — your email address and a securely hashed password (handled by our auth provider).</li>
        <li><strong>Café content</strong> — your café name, menu items, prices, descriptions, photos, branding, and settings.</li>
      </ul>
      <h3>From guests</h3>
      <ul>
        <li><strong>Order details</strong> — when a café enables ordering, the items, options, quantities, an optional table number, and any note a guest adds. Guests browse and order without creating an account.</li>
      </ul>
      <h3>Automatically</h3>
      <ul>
        <li><strong>Technical data</strong> — basic logs (e.g. IP address, browser type, timestamps) needed to run and secure the service.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use strictly necessary cookies to keep café owners signed in and to operate the service.
        We do <strong>not</strong> use advertising or cross-site tracking cookies.
      </p>

      <h2>How we use data</h2>
      <ul>
        <li>To provide the service — show menus to guests and let owners manage them;</li>
        <li>to authenticate owners and keep accounts secure;</li>
        <li>to provide support and respond to your messages; and</li>
        <li>to maintain, debug, and improve Mesa.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>Who we share it with</h2>
      <p>We use a small number of trusted providers (&ldquo;sub-processors&rdquo;) to run Mesa:</p>
      <ul>
        <li><strong>Supabase</strong> — database, authentication, and file storage.</li>
        <li><strong>Hostinger</strong> — application hosting.</li>
      </ul>
      <p>
        We may also disclose data if required by law. A café&rsquo;s own content (its menu) is, by
        design, shown publicly to that café&rsquo;s guests.
      </p>

      <h2>Where data is stored</h2>
      <p>
        Data is stored with our providers, which may process it on servers outside the Philippines.
        We rely on these providers&rsquo; safeguards to protect it in transit and at rest.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep account and café content while your account is active. If you delete your café or ask
        us to close your account, we remove the associated data, except where we must retain limited
        information to meet legal obligations. During the beta, data may also be reset.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the Data Privacy Act you may request to access, correct, update, or delete your personal
        data, or object to certain processing. Owners can edit most data directly in the dashboard;
        for anything else, contact us below and we&rsquo;ll help.
      </p>

      <h2>Security</h2>
      <p>
        We protect data with measures such as encrypted connections (HTTPS) and per-café access
        controls so one café cannot see another&rsquo;s private data. No system is perfectly secure,
        but we work to keep your data safe and to address issues promptly.
      </p>

      <h2>Children</h2>
      <p>Mesa is intended for café businesses and is not directed at children.</p>

      <h2>Changes</h2>
      <p>We&rsquo;ll post any updates to this policy here with a new date.</p>

      <h2>Contact</h2>
      <p>
        For privacy questions or requests, email <a href={`mailto:${FEEDBACK_EMAIL}`}>{FEEDBACK_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
