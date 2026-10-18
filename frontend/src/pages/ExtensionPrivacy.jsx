import React from "react";

const DATA_ROWS = [
  {
    data: "Your RTI draft details (ministry, authority, subject, request text)",
    source: "Copied to your clipboard from RTIgram when you click Autofill",
    use: "Read once by the extension to fill the portal form in your current browser tab. Never transmitted anywhere.",
  },
  {
    data: "Your applicant details (name, gender, phone, email, PIN code, state, address) you entered on RTIgram",
    source: "Same clipboard payload",
    use: "Same as above — filled into the portal's form fields in your browser only.",
  },
];

const PERMISSION_ROWS = [
  {
    perm: "clipboardRead",
    why: "To read the draft payload you copied from RTIgram, only when you trigger a fill.",
  },
  {
    perm: "scripting",
    why: "To run the fill logic on the RTI Online page, and to temporarily suppress the portal's own blocking pop-up dialogs during the fill so the process completes without interruption.",
  },
  {
    perm: "activeTab / host permission for rtionline.gov.in",
    why: "To read and fill form fields on that specific government portal only. The extension has no access to any other website.",
  },
];

function Section({ n, title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--ink)" }}>
        {n}. {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
        {children}
      </div>
    </section>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto my-4 rounded-[var(--r-md)]" style={{ border: "1px solid var(--rule-strong)" }}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--glass)" }}>
            {columns.map((c) => (
              <th
                key={c}
                className="text-left px-4 py-2 font-semibold"
                style={{ color: "var(--ink)", borderBottom: "1px solid var(--rule-strong)" }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: i > 0 ? "1px solid var(--rule)" : "none" }}>
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top" style={{ color: "var(--ink-2)" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExtensionPrivacy() {
  return (
    <div style={{ background: "var(--canvas)" }}>
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <span
            className="mono-text uppercase inline-block mb-4"
            style={{ color: "var(--accent)", fontSize: "0.6875rem", letterSpacing: "0.1em" }}
          >
            RTIgram Autofill · Browser Extension
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: "var(--ink)" }}>
            Privacy Policy
          </h1>
          <p className="text-sm mb-10" style={{ color: "var(--ink-4)" }}>
            Effective date: 17 October 2026
          </p>

          <Section n={1} title="What this extension is">
            <p>
              RTIgram Autofill is a browser extension (Chrome and Firefox) published by{" "}
              <strong>Charcha Foundation</strong>, the organisation that runs{" "}
              <a href="https://www.rtigram.com" style={{ color: "var(--accent)" }}>
                RTIgram
              </a>{" "}
              ("RTIgram," "we," "us"). It helps a citizen fill their own RTI application — already
              drafted on RTIgram — into the central official RTI Online portal (rtionline.gov.in).
            </p>
            <p>
              This Policy explains, specifically for the extension, what data it accesses, why,
              and what it never does.
            </p>
          </Section>

          <Section n={2} title="What the extension does">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                On the RTIgram website, you finish drafting your RTI and click "Autofill using
                extension." This copies your draft's details (ministry, public authority,
                subject, request text, and the applicant details you entered) to your device's
                clipboard and opens the RTI Online portal.
              </li>
              <li>
                You log in to the portal, accept its terms, and complete email/OTP verification
                yourself — the extension has no part in this step and never sees your portal
                login credentials.
              </li>
              <li>
                Once you reach the actual filing page, the extension reads the clipboard content{" "}
                <strong>only at that moment, only because you are present and have triggered
                the action</strong>, and fills the matching fields on the page.
              </li>
              <li>
                You still enter the CAPTCHA, review everything, attach any PDF, and complete
                payment and submission yourself.
              </li>
            </ol>
          </Section>

          <Section n={3} title="What data the extension accesses">
            <DataTable
              columns={["Data", "Source", "What happens to it"]}
              rows={DATA_ROWS.map((r) => [r.data, r.source, r.use])}
            />
            <p>
              <strong>That is the entire extent of what the extension accesses.</strong> It does
              not read any other clipboard content, any other website, your browsing history,
              your login credentials, or any portal account data.
            </p>
          </Section>

          <Section n={4} title="What the extension never does">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Never sends any data to RTIgram's servers, to Charcha Foundation, or to any third
                party. All reading and filling happens locally, inside your own browser, in the
                single tab you're using.
              </li>
              <li>
                Never stores or persists anything — no local storage, no extension-scoped
                storage, no cookies, no account, no sign-in.
              </li>
              <li>Never tracks your usage, never includes analytics, and never serves ads.</li>
              <li>
                Never fills or touches: CAPTCHA, OTP, your portal login email, your payment
                details, or the final submit action. Those remain entirely in your control.
              </li>
              <li>Never sells, shares, or monetises any data in any way.</li>
              <li>
                Never reads your clipboard on any website other than the RTI Online filing page,
                and only in response to your own action.
              </li>
            </ul>
          </Section>

          <Section n={5} title="Permissions the extension requests, and why">
            <DataTable
              columns={["Permission", "Why it's needed"]}
              rows={PERMISSION_ROWS.map((r) => [<code key="p">{r.perm}</code>, r.why])}
            />
          </Section>

          <Section n={6} title="Data retention">
            <p>
              None. The extension holds no data in memory beyond the single fill operation, and
              nothing is written to disk, browser storage, or any server. There is nothing to
              retain, and nothing for us to delete on your request, because nothing is ever kept.
            </p>
          </Section>

          <Section n={7} title="Third parties">
            <p>
              The only third-party destination involved at all is the RTI Online portal itself
              (rtionline.gov.in), which is where you choose to paste/fill your own data as part
              of filing your own RTI application — this is the normal, intended use of the
              extension, not data sharing by us. The portal's own privacy practices are governed
              by the Government of India and are outside our control; please refer to their site
              for details.
            </p>
            <p>
              We do not integrate with, or send data to, any analytics provider, advertising
              network, or other third-party service from within the extension.
            </p>
          </Section>

          <Section n={8} title="Children">
            <p>
              The extension does not ask for or collect age information. Since the extension
              never transmits or stores any data, there is no additional data-protection concern
              specific to children beyond what already applies to anyone using it.
            </p>
          </Section>

          <Section n={9} title="Changes to this policy">
            <p>
              If this Policy changes in a way that affects what the extension accesses or how,
              the updated version will be published here with a new effective date, and (where
              required) reflected in the extension's store listing before the update is
              distributed.
            </p>
          </Section>

          <Section n={10} title="Grievance Officer and contact">
            <p>
              <strong>Grievance Officer:</strong> Dipti Arora
              <br />
              <strong>Email:</strong>{" "}
              <a href="mailto:diptiarora60@gmail.com" style={{ color: "var(--accent)" }}>
                diptiarora60@gmail.com
              </a>
              <br />
              <strong>Address:</strong> Flat No. 304, Pocket 8, Sector 12, Dwarka, N.S.I.T.
              Dwarka, New Delhi – 110078
            </p>
            <p>
              <strong>General queries:</strong>{" "}
              <a href="mailto:connect.rtigram@gmail.com" style={{ color: "var(--accent)" }}>
                connect.rtigram@gmail.com
              </a>
            </p>
          </Section>
        </div>
      </section>
    </div>
  );
}
