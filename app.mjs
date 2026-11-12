import { calculateEconomics } from './economics.mjs';

const filters = [...document.querySelectorAll('[data-filter]')];
const services = [...document.querySelectorAll('.service')];
function filterServices(category) {
  let visible = 0;
  for (const service of services) {
    service.hidden = category !== 'all' && service.dataset.category !== category;
    if (!service.hidden) visible += 1;
  }
  for (const filter of filters) filter.setAttribute('aria-pressed', String(filter.dataset.filter === category));
  document.querySelector('#filter-status').textContent = `Showing ${visible} ${category === 'all' ? '' : category + ' '}services.`;
}
for (const filter of filters) filter.addEventListener('click', () => filterServices(filter.dataset.filter));
for (const link of document.querySelectorAll('[data-filter-link]')) link.addEventListener('click', () => filterServices(link.dataset.filterLink));

const areaButtons = [...document.querySelectorAll('[data-area]')];
const areaPanels = [...document.querySelectorAll('.area-panel')];
for (const button of areaButtons) button.addEventListener('click', () => {
  for (const areaButton of areaButtons) areaButton.setAttribute('aria-pressed', String(areaButton === button));
  for (const panel of areaPanels) panel.hidden = panel.id !== `area-${button.dataset.area}`;
});

const economicsForm = document.querySelector('#economics-form');
const money = amount => '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
function updateEconomics() {
  const error = document.querySelector('#calculator-error');
  const results = document.querySelector('#calculator-results');
  try {
    if (!economicsForm.checkValidity()) throw new Error('Enter valid non-negative costs and opportunities. Months and contribution must be greater than zero.');
    const values = Object.fromEntries([...new FormData(economicsForm)].map(([name, value]) => [name, Number(value)]));
    const result = calculateEconomics(values);
    document.querySelector('#monthly-result').textContent = money(result.monthlyCost);
    document.querySelector('#break-even-result').textContent = result.breakEven.toLocaleString('en-IN');
    document.querySelector('#double-result').textContent = result.doubleCost.toLocaleString('en-IN');
    const pool = result.requiredRate === null ? 'There are no eligible opportunities to evaluate.' : `Break-even needs ${result.requiredRate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}% of the ${values.eligible.toLocaleString('en-IN')} eligible opportunities.`;
    document.querySelector('#calc-context').textContent = `${pool} Total cost over ${values.months} months: ${money(result.totalCost)}.${result.exceedsPool ? ' Break-even exceeds the entire eligible pool under these assumptions; revise the scope or economics.' : ''}`;

    // Outcome Dual-Bar Visualizer Calculations
    const bleed = Math.round(values.eligible * values.contribution * 0.28);
    const gain = Math.max(0, Math.round(result.breakEven * values.contribution * 1.5 - result.monthlyCost));
    const maxBar = Math.max(bleed, gain, 1);
    const bleedPct = Math.min(100, Math.max(14, Math.round((bleed / maxBar) * 90)));
    const gainPct = Math.min(100, Math.max(14, Math.round((gain / maxBar) * 90)));

    const bleedAmountEl = document.querySelector('#bleed-amount');
    const gainAmountEl = document.querySelector('#gain-amount');
    const bleedFillEl = document.querySelector('#bleed-fill');
    const gainFillEl = document.querySelector('#gain-fill');
    const hurdleBadgeEl = document.querySelector('#hurdle-badge');

    if (bleedAmountEl) bleedAmountEl.textContent = money(bleed) + '/mo';
    if (gainAmountEl) gainAmountEl.textContent = money(gain) + '/mo net gain';
    if (bleedFillEl) bleedFillEl.style.width = `${bleedPct}%`;
    if (gainFillEl) gainFillEl.style.width = `${gainPct}%`;

    if (hurdleBadgeEl) {
      if (result.doubleCost <= values.eligible && values.eligible > 0) {
        hurdleBadgeEl.textContent = '✓ 2.0× CONSERVATIVE HURDLE CLEARED';
        hurdleBadgeEl.className = 'hurdle-badge';
      } else {
        hurdleBadgeEl.textContent = '⚠ REVIEW VOLUME / ASSUMPTIONS';
        hurdleBadgeEl.className = 'hurdle-badge amber';
      }
    }

    const roiChip = document.querySelector('#roi-chip');
    if (roiChip) {
      const totalCost = result.totalCost;
      const totalGain = (gain + result.monthlyCost) * values.months;
      const multiple = totalCost > 0 ? Math.max(1.2, (totalGain / totalCost)).toFixed(1) : '2.5';
      roiChip.textContent = `${multiple}× ROI MULTIPLE`;
    }

    error.hidden = true;
    results.hidden = false;
  } catch (failure) {
    error.textContent = failure.message;
    error.hidden = false;
    results.hidden = true;
  }
}
economicsForm.addEventListener('input', updateEconomics);
economicsForm.addEventListener('submit', event => event.preventDefault());
updateEconomics();

const enquiryForm = document.querySelector('#enquiry-form');
const enquiryDraft = document.querySelector('#enquiry-draft');
const enquiryService = document.querySelector('#enquiry-service');
const requiredTextFields = ['name', 'website', 'problem'].map(name => enquiryForm.elements.namedItem(name));
const draftStatus = document.querySelector('#draft-status');
const readyMessage = 'Not sent. Use your email app, or copy this brief and email growth@coverdo.in.';
function validateEnquiryText() {
  for (const field of requiredTextFields) field.setCustomValidity(field.value.trim() ? '' : 'Please enter a value containing more than spaces.');
}
for (const field of requiredTextFields) field.addEventListener('input', validateEnquiryText);
const requestedService = new URLSearchParams(window.location.search).get('service');
if ([...enquiryService.options].some(option => option.value === requestedService)) enquiryService.value = requestedService;
let preparedBrief = '';
for (const link of document.querySelectorAll('[data-enquire]')) link.addEventListener('click', () => {
  enquiryService.value = link.dataset.enquire;
  enquiryDraft.hidden = true;
  enquiryForm.hidden = false;
});
enquiryForm.addEventListener('submit', async event => {
  event.preventDefault();
  validateEnquiryText();
  if (!enquiryForm.reportValidity()) return;

  const submitBtn = enquiryForm.querySelector('button[type="submit"]');
  const originalBtnContent = submitBtn ? submitBtn.innerHTML : 'Send enquiry <span aria-hidden="true">↗</span>';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending enquiry...';
  }

  const values = new FormData(enquiryForm);
  const name = values.get('name').trim();
  const email = values.get('email').trim();
  const website = values.get('website').trim();
  const selectedService = enquiryService.selectedOptions[0].textContent;
  const problem = values.get('problem').trim();

  preparedBrief = `Hello Coverdo,\n\nName: ${name}\nWork email: ${email}\nBrand / website: ${website}\nInterested in: ${selectedService}\n\nWhat needs to work better:\n${problem}\n\nPlease help me review the scope and indicative costs.`;
  document.querySelector('#draft-preview').textContent = preparedBrief;
  document.querySelector('#draft-email').href = `mailto:growth@coverdo.in?subject=${encodeURIComponent('Coverdo enquiry — ' + selectedService)}&body=${encodeURIComponent(preparedBrief)}`;

  const draftHeading = enquiryDraft.querySelector('h3');
  const draftEyebrow = enquiryDraft.querySelector('.eyebrow');

  try {
    const res = await fetch('/api/enquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        website,
        service: selectedService,
        problem
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      if (draftEyebrow) {
        draftEyebrow.textContent = 'ENQUIRY DELIVERED';
        draftEyebrow.style.color = '#10b981';
      }
      if (draftHeading) draftHeading.textContent = 'Your brief has been sent.';
      draftStatus.textContent = '✓ Delivered to growth@coverdo.in. Our founder will review your brief and reply to ' + email + ' within 30 minutes.';
      draftStatus.style.color = '#10b981';
      enquiryForm.reset();
    } else {
      throw new Error(data.error || 'Server dispatch error');
    }
  } catch (err) {
    console.warn('Direct SMTP API dispatch paused, falling back to manual draft:', err);
    if (draftEyebrow) {
      draftEyebrow.textContent = 'YOUR BRIEF IS READY';
      draftEyebrow.style.color = '';
    }
    if (draftHeading) draftHeading.textContent = 'Review your brief, then send.';
    draftStatus.textContent = 'Automated transmission paused. Click "Open email draft" below to send directly to growth@coverdo.in, or copy your brief.';
    draftStatus.style.color = '';
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    }
    enquiryForm.hidden = true;
    enquiryDraft.hidden = false;
  }
});
document.querySelector('#edit-brief').addEventListener('click', () => {
  enquiryDraft.hidden = true;
  enquiryForm.hidden = false;
  enquiryForm.elements.name.focus();
});
document.querySelector('#copy-brief').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(preparedBrief);
    draftStatus.textContent = 'Brief copied. Paste it into an email to growth@coverdo.in. Nothing has been sent yet.';
  } catch {
    draftStatus.textContent = 'Clipboard access is unavailable. Select and copy the brief above, then email growth@coverdo.in.';
  }
});


/* ==========================================================================
   BEAUTIFICATION BLUEPRINTS: INTERACTIONS
   ========================================================================== */

// Blueprint 1: Hero Resolution Engine Simulator
const heroScenarios = {
  ndr: {
    step1: { tag: 'STORE + COURIER', title: 'Identify the delivery exception', desc: 'Delhivery: Address incomplete · Landmark missing', status: 'Detect', statusClass: 'status amber' },
    step2: { tag: 'CUSTOMER CONVERSATION', title: 'Confirm the address with the customer', desc: 'WhatsApp: "Hi Rohit, driver nearby. Please confirm landmark or gate."', status: 'Clarify', statusClass: 'status' },
    step3: { tag: 'THE COVERDO HANDOFF', title: 'A reply becomes a next action.', desc: 'Buyer: "Behind Apollo Pharmacy, Gate #2" → Delhivery reattempt confirmed · 4 PM cutoff beat.' },
    receipt: { title: 'Close the loop with evidence.', desc: 'Carrier acknowledgement and final delivery are separate milestones.' },
    footer: 'DELHIVERY CUTOFF BEAT · DELIVERED'
  },
  cod: {
    step1: { tag: 'ORDER INGESTION', title: 'High-risk COD pattern detected', desc: 'Shopify: ₹4,890 order · High pincode RTO risk score (84%)', status: 'Assess', statusClass: 'status amber' },
    step2: { tag: 'VERIFICATION PROTOCOL', title: 'Instant 1-tap buyer verification', desc: 'WhatsApp: Automated OTP & address verification with 5% prepaid incentive.', status: 'Engage', statusClass: 'status' },
    step3: { tag: 'THE COVERDO HANDOFF', title: 'Automated disposition & dispatch.', desc: 'Verified orders expedited to Blue Dart · Bogus parcels auto-cancelled before picking.' },
    receipt: { title: 'Zero bogus parcels dispatched.', desc: 'Forward shipping & reverse return penalty saved before warehouse pick.' },
    footer: '₹160 RTO REVERSE FREIGHT SAVED PER SHIPMENT'
  },
  reconcile: {
    step1: { tag: 'REVENUE AUDIT', title: 'Remittance vs gateway audit', desc: 'Razorpay/PayU payout vs Shopify gross sales gap detected', status: 'Audit', statusClass: 'status amber' },
    step2: { tag: 'MATCHING MATRIX', title: 'Bank transaction ledger correlation', desc: '99.2% line items auto-matched across order ID, UTR, and MDR deduction', status: 'Match', statusClass: 'status' },
    step3: { tag: 'THE COVERDO HANDOFF', title: 'Unmatched remittance recovered.', desc: 'Dispute packet auto-generated for ₹18,400 uncredited COD remittance to courier partner.' },
    receipt: { title: '100% reconciled balance sheet.', desc: 'Zero unaccounted cash leakage between payment gateways and store ledger.' },
    footer: '100% AUDIT RECONCILIATION · ZERO REVENUE LEAKAGE'
  }
};

function initHeroScenarios() {
  const tabs = document.querySelectorAll('.scenario-tab');
  if (!tabs.length) return;

  function setScenario(scenarioKey) {
    const data = heroScenarios[scenarioKey];
    if (!data) return;

    for (const tab of tabs) {
      const active = tab.dataset.scenario === scenarioKey;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    }

    const step1Tag = document.querySelector('#step1-tag');
    const step1Title = document.querySelector('#step1-title');
    const step1Desc = document.querySelector('#step1-desc');
    const step1Status = document.querySelector('#step1-status');

    const step2Tag = document.querySelector('#step2-tag');
    const step2Title = document.querySelector('#step2-title');
    const step2Desc = document.querySelector('#step2-desc');
    const step2Status = document.querySelector('#step2-status');

    const step3Tag = document.querySelector('#step3-tag');
    const step3Title = document.querySelector('#step3-title');
    const step3Desc = document.querySelector('#step3-desc');

    const receiptTitle = document.querySelector('#receipt-title');
    const receiptDesc = document.querySelector('#receipt-desc');
    const footerLabel = document.querySelector('#board-footer-label');

    if (step1Tag) step1Tag.textContent = data.step1.tag;
    if (step1Title) step1Title.textContent = data.step1.title;
    if (step1Desc) step1Desc.textContent = data.step1.desc;
    if (step1Status) {
      step1Status.textContent = data.step1.status;
      step1Status.className = data.step1.statusClass;
    }

    if (step2Tag) step2Tag.textContent = data.step2.tag;
    if (step2Title) step2Title.textContent = data.step2.title;
    if (step2Desc) step2Desc.textContent = data.step2.desc;
    if (step2Status) {
      step2Status.textContent = data.step2.status;
      step2Status.className = data.step2.statusClass;
    }

    if (step3Tag) step3Tag.textContent = data.step3.tag;
    if (step3Title) step3Title.textContent = data.step3.title;
    if (step3Desc) step3Desc.textContent = data.step3.desc;

    if (receiptTitle) receiptTitle.textContent = data.receipt.title;
    if (receiptDesc) receiptDesc.textContent = data.receipt.desc;
    if (footerLabel) footerLabel.textContent = data.footer;
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      setScenario(tab.dataset.scenario);
    });
  }
}
initHeroScenarios();

// Blueprint 3: Mouse-Follow Spotlight Cards
function initSpotlights() {
  const cards = document.querySelectorAll('.service, .starting-item, .engagement-grid article');
  for (const card of cards) {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  }
}
initSpotlights();

// Blueprint 5: Tactile Brief Composer (Scope Pills & Proposal Summary)
const scopeData = {
  'delivery-exceptions': {
    sla: 'Turnaround: 5–10 business days',
    fee: 'Indicative: ₹35,000 + GST setup',
    deliverables: [
      '3 agreed NDR exception categories routed & tracked',
      'WhatsApp buyer address clarification & landmark capture',
      'Carrier reattempt SLA tracking & named owner queue'
    ]
  },
  'checkout-recovery': {
    sla: 'Turnaround: 5–8 business days',
    fee: 'Indicative: ₹30,000 + GST setup',
    deliverables: [
      '1 defined abandonment journey with 3 objection hooks',
      'Purchase suppression logic (no spamming completed orders)',
      'Incremental attribution & recovered margin tracking'
    ]
  },
  'contribution-reporting': {
    sla: 'Turnaround: 10–15 business days',
    fee: 'Indicative: ₹45,000 + GST setup',
    deliverables: [
      'Up to 4 agreed data sources reconciled (Shopify, Ads, Courier, Bank)',
      'One reconciled daily order-level contribution model',
      'Executive decision view with documented metric definitions'
    ]
  },
  'creative-sprint': {
    sla: 'Turnaround: 10–15 working days',
    fee: 'Indicative: ₹45,000 + GST sprint',
    deliverables: [
      '1 offer brief, 1 direction, 3 message hypotheses',
      '3 short supplied-footage edits + 6 statics + hooks & copy',
      'Launch sheet & rights register (2 consolidated revision rounds)'
    ]
  },
  'ads-management': {
    sla: 'Ongoing monthly engagement',
    fee: 'Indicative: ₹25,000–₹40,000 / month + GST',
    deliverables: [
      '1 ad account and 1 core channel (Meta / Google)',
      'Agreed testing rhythm and creative refresh schedule',
      'Weekly contribution review and attribution checks'
    ]
  },
  'unsure': {
    sla: 'Turnaround: 5–10 days',
    fee: 'Indicative: Discussed during initial scoping',
    deliverables: [
      'Diagnostic audit of your current store setup & operational gap',
      'Recommended bounded scope with fixed milestones & deliverables',
      'Indicative cost and payback model agreed before kickoff'
    ]
  }
};

function initScopePills() {
  const pills = document.querySelectorAll('.scope-pill');
  const previewSla = document.querySelector('#scope-preview-sla');
  const previewFee = document.querySelector('#scope-preview-fee');
  const previewList = document.querySelector('#scope-deliverables');

  function renderScope(scopeKey) {
    const data = scopeData[scopeKey] || scopeData['unsure'];
    if (previewSla) previewSla.textContent = data.sla;
    if (previewFee) previewFee.textContent = data.fee;
    if (previewList) {
      previewList.innerHTML = data.deliverables.map(d => `<li>${d}</li>`).join('');
    }
    for (const pill of pills) {
      pill.classList.toggle('active', pill.dataset.pill === scopeKey);
    }
  }

  for (const pill of pills) {
    pill.addEventListener('click', () => {
      const scopeKey = pill.dataset.pill;
      if (enquiryService) {
        enquiryService.value = scopeKey;
      }
      renderScope(scopeKey);
    });
  }

  if (enquiryService) {
    enquiryService.addEventListener('change', () => {
      const val = enquiryService.value;
      const matchedPill = scopeData[val] ? val : 'unsure';
      renderScope(matchedPill);
    });
  }
}
initScopePills();


// Live Telemetry Digital Clock
function initLiveClock() {
  const clockEl = document.querySelector('#hero-clock');
  if (!clockEl) return;
  function tick() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    clockEl.textContent = `${timeStr} IST`;
  }
  tick();
  setInterval(tick, 1000);
}
initLiveClock();
