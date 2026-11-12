# Coverdo

> Connected ecommerce. Clear ownership. Practical ecommerce consulting across growth, operations, reporting, and connected systems for Indian brands.

Coverdo connects the work between your store, customers, and fulfillment systems. 12 independently scoped services with transparent indicative pricing, visible delivery milestones, and 100% client credential ownership.

---

## Architecture & Capabilities

- **12 Dedicated Service Proposals (`services/`):**
  - **Delivery Exception Resolution:** Turn failed delivery attempts into owned, closed-loop carrier actions.
  - **Checkout Conversation Recovery:** Answer customer objections behind abandoned checkouts.
  - **Support Resolution Assistant:** Provide verified context and safe human escalation.
  - **Operational Contribution Reporting:** Reconciled order model and daily net margin decision view.
  - **Creative Launch Sprint:** 1 offer, 3 message hypotheses, 3 video edits, 6 statics, and launch sheet.
  - **One-channel Ads Management:** Campaign and creative-testing workload actively managed.
  - **Product / Offer Landing Page:** Dedicated conversion path for a core offer.
  - **Retention Journey:** Cohort-based replenishment and repeat purchase journeys.
  - **Loyalty Programme:** Accrual, redemption, refund reversal, and reporting rules.
  - **One-process Integration:** Error queues, reconciliation, and runbooks across 2 systems.
  - **One-purpose Voice Agent:** Bounded telephony workflow with human handoff.
  - **Feedback-to-Resolution:** Accountable follow-through on customer feedback themes.
- **Break-Even Economics Calculator (`economics.mjs`):** Client-side unit economics calculation computing monthly equivalent cost, break-even outcomes, and 2x hurdle targets.
- **Direct GoDaddy SMTP Inbound Pipeline (`api/enquiry.js`):** Serverless endpoint connecting directly over SSL (port 465) to `smtpout.secureserver.net` to dispatch structured enquiry dossiers to `growth@coverdo.in`.

---

## SEO & Deployment

- **Live Production URL:** [https://coverdo.in](https://coverdo.in) (and [https://coverdo.vercel.app](https://coverdo.vercel.app))
- **Canonical Domain:** `https://coverdo.in/`
- **Schema.org Structured Data:** Valid JSON-LD `Organization` and `OfferCatalog` metadata.
- **Sitemap & Robots:** Standalone `sitemap.xml` listing all 12 services and `robots.txt`.

---

## Repository Structure

```
├── api/
│   ├── enquiry.js        # GoDaddy direct SMTP inbound handler
│   └── evaluation.js     # Legacy compatible wrapper
├── services/             # 12 standalone service proposal pages
│   ├── ads-management.html
│   ├── checkout-recovery.html
│   ├── contribution-reporting.html
│   ├── creative-sprint.html
│   ├── delivery-exceptions.html
│   ├── feedback.html
│   ├── integration.html
│   ├── landing-page.html
│   ├── loyalty.html
│   ├── retention.html
│   ├── support-assistant.html
│   └── voice-agent.html
├── index.html            # Main website with service catalog, economics & enquiry
├── styles.css            # Base stylesheet (typography, layout, components)
├── experience.css        # Visual styling and responsive overrides
├── app.mjs               # Interactive filtering, calculator & enquiry dispatcher
├── economics.mjs         # Pure functional unit economics calculation
├── catalog.json          # Service catalog database
├── favicon.svg           # Brand favicon
├── robots.txt            # Search engine crawl rules
├── sitemap.xml           # Multi-page SEO sitemap
├── package.json          # Node dependencies (nodemailer)
├── README.md
└── .gitignore
```
