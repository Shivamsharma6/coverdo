/**
 * Coverdo — Operational Execution Partner for Indian D2C Brands
 * Client Application Logic: Unit Economics Calculator, Stage Selector, Intake Form, and Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  initEngineConsole();
  initCalculator();
  initStageSelector();
  initIntakeForm();
  initHeaderScroll();
  initFaqAccordions();
  initRevealMotion();
});

// ---------- 0. Reveal Motion Layer ----------
function initRevealMotion() {
  const elements = document.querySelectorAll('[data-reveal]');
  if (!elements.length) return;

  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));

  // Fallback: reveal all elements after 1s so nothing stays hidden on headless runners
  setTimeout(() => {
    elements.forEach(el => el.classList.add('is-revealed'));
  }, 1000);
}

// ---------- 1. Unit Economics & Break-Even Calculator ----------
function initCalculator() {
  const problemSelect = document.getElementById('calc-problem');
  const ordersRange = document.getElementById('calc-orders');
  const ordersNum = document.getElementById('calc-orders-num');
  const codRange = document.getElementById('calc-cod');
  const codNum = document.getElementById('calc-cod-num');
  const marginRange = document.getElementById('calc-margin');
  const marginNum = document.getElementById('calc-margin-num');

  // Outputs
  const outCost = document.getElementById('out-cost');
  const outBreakeven = document.getElementById('out-breakeven');
  const outHurdle = document.getElementById('out-hurdle');
  const outNetBenefit = document.getElementById('out-net-benefit');
  const verdictTitle = document.getElementById('out-verdict-title');
  const verdictDesc = document.getElementById('out-verdict-desc');

  // Sliders display badges
  const ordersBadge = document.getElementById('val-orders');
  const codBadge = document.getElementById('val-cod');
  const marginBadge = document.getElementById('val-margin');

  if (!problemSelect || !ordersRange) return;

  // Sync range and number inputs
  function syncInputs(range, num, badge, prefix = '', suffix = '') {
    range.addEventListener('input', () => {
      num.value = range.value;
      if (badge) badge.textContent = prefix + parseInt(range.value, 10).toLocaleString('en-IN') + suffix;
      calculate();
    });
    num.addEventListener('input', () => {
      let val = parseInt(num.value, 10);
      if (isNaN(val)) return;
      if (val < parseInt(range.min, 10)) val = parseInt(range.min, 10);
      if (val > parseInt(range.max, 10)) val = parseInt(range.max, 10);
      range.value = val;
      if (badge) badge.textContent = prefix + val.toLocaleString('en-IN') + suffix;
      calculate();
    });
  }

  syncInputs(ordersRange, ordersNum, ordersBadge, '', ' orders');
  syncInputs(codRange, codNum, codBadge, '', '%');
  syncInputs(marginRange, marginNum, marginBadge, '₹', '');

  problemSelect.addEventListener('change', calculate);

  // Fee and model profiles from Playbook Part 1 & Part 3
  const problemProfiles = {
    ndr: {
      name: 'Delivery Exception Resolution (NDR)',
      setupFee: 70000,
      monthlyRetainer: 25000,
      toolLicense: 8000,
      getEligible: (orders, codShare) => Math.round(orders * (codShare / 100) * 0.20),
      recoveryRate: 0.08
    },
    cod: {
      name: 'Pre-Dispatch COD Confirmation',
      setupFee: 45000,
      monthlyRetainer: 0,
      toolLicense: 4000,
      getEligible: (orders, codShare) => Math.round(orders * (codShare / 100) * 0.15),
      recoveryRate: 0.12
    },
    checkout: {
      name: 'Checkout Objection Recovery',
      setupFee: 45000,
      monthlyRetainer: 0,
      toolLicense: 5000,
      getEligible: (orders) => Math.round(orders * 0.40),
      recoveryRate: 0.06
    },
    support: {
      name: 'Support Resolution Assistant',
      setupFee: 60000,
      monthlyRetainer: 20000,
      toolLicense: 7000,
      getEligible: (orders) => Math.round(orders * 0.18),
      recoveryRate: 0.10
    },
    reporting: {
      name: 'Operational Contribution Reporting',
      setupFee: 80000,
      monthlyRetainer: 25000,
      toolLicense: 10000,
      getEligible: (orders) => orders,
      recoveryRate: 0.03
    }
  };

  function calculate() {
    const profile = problemProfiles[problemSelect.value] || problemProfiles.ndr;
    const orders = parseInt(ordersRange.value, 10);
    const codShare = parseInt(codRange.value, 10);
    const margin = parseInt(marginRange.value, 10);

    // Amortize setup over 6 months
    const amortizedSetup = profile.setupFee / 6;
    const monthlyCost = Math.round(amortizedSetup + profile.monthlyRetainer + profile.toolLicense);

    // Break-even and 2x hurdle targets
    const breakevenUnits = Math.ceil(monthlyCost / margin);
    const hurdleUnits = Math.ceil((monthlyCost * 2) / margin);

    // Projected recovery
    const eligibleUnits = profile.getEligible(orders, codShare);
    const projectedRecoveries = Math.round(eligibleUnits * profile.recoveryRate);
    const grossBenefit = projectedRecoveries * margin;
    const netBenefit = grossBenefit - monthlyCost;
    const benefitCostRatio = grossBenefit / (monthlyCost || 1);

    // Render results
    outCost.textContent = '₹' + monthlyCost.toLocaleString('en-IN') + '/mo';
    outBreakeven.textContent = breakevenUnits.toLocaleString('en-IN') + ' units';
    outHurdle.textContent = hurdleUnits.toLocaleString('en-IN') + ' units';

    if (netBenefit >= 0) {
      outNetBenefit.textContent = '+₹' + netBenefit.toLocaleString('en-IN') + '/mo';
      outNetBenefit.className = 'gt-card-val nums val-positive';
    } else {
      outNetBenefit.textContent = '-₹' + Math.abs(netBenefit).toLocaleString('en-IN') + '/mo';
      outNetBenefit.className = 'gt-card-val nums val-negative';
    }

    // Dynamic Capital ROI Visualizer update
    const chartBleedVal = document.getElementById('chart-bleed-val');
    const chartGainVal = document.getElementById('chart-gain-val');
    const chartBleedBar = document.getElementById('chart-bleed-bar');
    const chartGainBar = document.getElementById('chart-gain-bar');
    const roiStatusPill = document.getElementById('roi-status-pill');

    const estimatedBleed = Math.round(eligibleUnits * 160 + (orders * 0.05 * 120));
    if (chartBleedVal) chartBleedVal.textContent = '₹' + estimatedBleed.toLocaleString('en-IN') + '/mo';
    if (chartGainVal) {
      chartGainVal.textContent = (netBenefit >= 0 ? '+₹' : '-₹') + Math.abs(netBenefit).toLocaleString('en-IN') + '/mo';
      chartGainVal.className = netBenefit >= 0 ? 'nums val-accent' : 'nums val-negative';
    }

    const maxVal = Math.max(estimatedBleed, Math.abs(netBenefit), 1);
    if (chartBleedBar) chartBleedBar.style.width = Math.min(100, Math.max(15, Math.round((estimatedBleed / maxVal) * 90))) + '%';
    if (chartGainBar) chartGainBar.style.width = Math.min(100, Math.max(15, Math.round((Math.max(0, netBenefit) / maxVal) * 95))) + '%';

    if (roiStatusPill) {
      if (benefitCostRatio >= 2.0 && eligibleUnits >= hurdleUnits) {
        roiStatusPill.textContent = 'PASSES 2x HURDLE';
        roiStatusPill.className = 'gt-roi-status-badge';
      } else {
        roiStatusPill.textContent = 'BELOW 2x THRESHOLD';
        roiStatusPill.className = 'gt-roi-status-badge below-hurdle';
      }
    }

    // Verdict evaluation
    if (benefitCostRatio >= 2.0 && eligibleUnits >= hurdleUnits) {
      verdictTitle.className = 'gt-verdict-title verdict-justified';
      verdictTitle.textContent = 'Project Justified (' + benefitCostRatio.toFixed(1) + '× B/C)';
      verdictDesc.textContent = 'Your store volume provides ' + eligibleUnits.toLocaleString('en-IN') +
        ' monthly eligible events. An estimated ' + Math.round(profile.recoveryRate * 100) +
        '% recovery yields ₹' + grossBenefit.toLocaleString('en-IN') +
        ' gross contribution, easily clearing our 2× hurdle.';
    } else if (benefitCostRatio >= 1.0) {
      verdictTitle.className = 'gt-verdict-title verdict-marginal';
      verdictTitle.textContent = 'Marginal Fit (' + benefitCostRatio.toFixed(1) + '× B/C)';
      verdictDesc.textContent = 'Your numbers break even, but sit below our conservative 2× safety screen. We recommend a bounded one-time setup rather than an ongoing managed retainer.';
    } else {
      verdictTitle.className = 'gt-verdict-title verdict-unsuitable';
      verdictTitle.textContent = 'Below Threshold (' + benefitCostRatio.toFixed(1) + '× B/C)';
      verdictDesc.textContent = 'With ' + orders.toLocaleString('en-IN') + ' monthly orders, recovering ' +
        breakevenUnits + ' orders requires unrealistic recovery rates. We advise configuring existing tool capabilities first before paying an external partner.';
    }
  }

  calculate();
}

// ---------- 2. Stage Selector (Growww Tech Inspired) ----------
function initStageSelector() {
  const stageCards = document.querySelectorAll('.gt-stage-card');
  if (!stageCards.length) return;

  stageCards.forEach((card) => {
    card.addEventListener('click', () => {
      stageCards.forEach((c) => c.classList.remove('is-active'));
      card.classList.add('is-active');

      const targetProblem = card.getAttribute('data-problem');
      const calcSelect = document.getElementById('calc-problem');
      if (calcSelect && targetProblem) {
        calcSelect.value = targetProblem;
        calcSelect.dispatchEvent(new Event('change'));
      }
    });
  });
}

// ---------- 3. Commercial Intake Form ----------
function initIntakeForm() {
  const form = document.getElementById('intake-form');
  const responseMsg = document.getElementById('form-response');

  if (!form || !responseMsg) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const domain = document.getElementById('brand-domain').value.trim();
    const role = document.getElementById('user-role').value;
    const volume = document.getElementById('order-volume').value;
    const contact = document.getElementById('business-contact').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!domain || !contact) {
      responseMsg.className = 'form-response-msg error';
      responseMsg.textContent = 'Please enter your brand website and business contact.';
      responseMsg.hidden = false;
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying store economics...';
    }

    setTimeout(() => {
      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request Store Evaluation';
      }

      responseMsg.className = 'form-response-msg success';
      responseMsg.innerHTML = '<strong>Evaluation request logged.</strong> Our founding operator will review <code>' +
        escapeHtml(domain) + '</code> against live courier metrics and respond to <code>' +
        escapeHtml(contact) + '</code> within 30 business minutes.';
      responseMsg.hidden = false;
    }, 600);
  });
}

// ---------- 4. Sticky Header & Smooth Scroll ----------
function initHeaderScroll() {
  const header = document.querySelector('.gt-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }, { passive: true });
}

// ---------- 5. FAQ Accordions ----------
function initFaqAccordions() {
  const detailsList = document.querySelectorAll('.gt-faq-item');
  detailsList.forEach((detail) => {
    detail.addEventListener('toggle', () => {
      if (detail.open) {
        detailsList.forEach((other) => {
          if (other !== detail && other.open) {
            other.open = false;
          }
        });
      }
    });
  });
}

// Helper: Escape HTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- 4. Engine Console Interactive Telemetry ----------
function initEngineConsole() {
  const tabs = document.querySelectorAll('.gt-console-tab');
  const badgeText = document.getElementById('telemetry-badge-text');
  const logText = document.getElementById('telemetry-log-text');
  const nodeShopify = document.getElementById('node-shopify');
  const nodeMeta = document.getElementById('node-meta');
  const nodeCourier = document.getElementById('node-courier');
  const nodeBank = document.getElementById('node-bank');

  if (!tabs.length) return;

  const scenarios = {
    ndr: {
      badge: 'NDR Interception Active',
      log: 'Order #48291 · Buyer confirmed landmark · 4 PM carrier cutoff beat',
      activeNodes: [nodeShopify, nodeCourier]
    },
    cod: {
      badge: 'Fake COD Shield Active',
      log: 'Order #48302 · Suspicious PIN code auto-held · Buyer verified via WhatsApp',
      activeNodes: [nodeShopify, nodeCourier]
    },
    recon: {
      badge: 'Margin Reconciliation Closed',
      log: 'Shopify ₹4.8L GMV matched to RazorpayX bank settlement · 0 weight discrepancy',
      activeNodes: [nodeShopify, nodeMeta, nodeBank]
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const scenarioKey = tab.getAttribute('data-scenario');
      const sc = scenarios[scenarioKey];
      if (!sc) return;

      if (badgeText) badgeText.textContent = sc.badge;
      if (logText) logText.textContent = sc.log;

      [nodeShopify, nodeMeta, nodeCourier, nodeBank].forEach((n) => {
        if (n) n.classList.remove('active');
      });
      sc.activeNodes.forEach((n) => {
        if (n) n.classList.add('active');
      });
    });
  });
}
