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
