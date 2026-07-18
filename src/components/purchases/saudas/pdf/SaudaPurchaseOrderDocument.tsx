import type { ReactNode } from 'react';
import type { SaudaPdfViewModel } from '../../../utils/saudaPdfData';

const SAUDA_PDF_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 portrait; margin: 0; }
  body {
    font-family: 'Montserrat', Arial, sans-serif;
    background: #FBF9F5;
    color: #555555;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sauda-po-page {
    width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    background: #FBF9F5;
    display: flex;
  }
  .sauda-po-sidebar {
    width: 230px;
    flex-shrink: 0;
    background: #fff;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #E6E1D8;
  }
  .sauda-po-sidebar-header {
    background: #0F2E21;
    display: block;
    padding: 0;
    line-height: 0;
  }
  .sauda-po-sidebar-header img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
  }
  .sauda-po-sidebar-body {
    flex: 1;
    padding: 24px 18px 0;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 0;
  }
  .sauda-po-contact-item {
    display: flex;
    gap: 10px;
    margin-bottom: 18px;
    font-size: 11px;
    line-height: 1.65;
    color: #666;
  }
  .sauda-po-contact-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: #C89A43;
    margin-top: 2px;
  }
  .sauda-po-divider {
    height: 1px;
    background: #E9E2D8;
    margin: 28px 0;
  }
  .sauda-po-order-heading {
    font-family: 'Montserrat', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #B37A26;
    margin-bottom: 14px;
  }
  .sauda-po-po-number {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28px;
    font-weight: 500;
    color: #C89A43;
    line-height: 1.1;
    margin-bottom: 18px;
  }
  .sauda-po-meta-row {
    margin-bottom: 12px;
  }
  .sauda-po-meta-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 3px;
  }
  .sauda-po-meta-value {
    font-family: 'Cormorant Garamond', serif;
    font-size: 16px;
    font-weight: 500;
    color: #1F1F1F;
  }
  .sauda-po-sidebar-footer {
    margin-top: auto;
    position: relative;
    margin-left: -18px;
    margin-right: -18px;
    width: calc(100% + 36px);
  }
  .sauda-po-sidebar-footer img {
    width: 100%;
    display: block;
    object-fit: cover;
    object-position: center bottom;
  }
  .sauda-po-main {
    flex: 1;
    padding: 32px 36px 28px 32px;
    min-width: 0;
  }
  .sauda-po-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    gap: 16px;
  }
  .sauda-po-title-block h1 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 42px;
    font-weight: 400;
    line-height: 0.95;
    letter-spacing: -0.5px;
    color: #1B1B1B;
  }
  .sauda-po-title-block h1 .gold {
    color: #C89A43;
    display: block;
  }
  .sauda-po-motto {
    border-left: 2px solid #C89A43;
    padding-left: 16px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 4px;
    line-height: 2.2;
    text-transform: uppercase;
    color: #444;
    white-space: pre-line;
    padding-top: 4px;
  }
  .sauda-po-recipient {
    margin-bottom: 22px;
    padding-bottom: 20px;
    border-bottom: 1px solid #E9E2D8;
  }
  .sauda-po-to-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #B37A26;
    margin-bottom: 8px;
  }
  .sauda-po-vendor-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 30px;
    font-weight: 500;
    color: #1B1B1B;
    margin-bottom: 10px;
  }
  .sauda-po-recipient-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 20px;
    align-items: start;
  }
  .sauda-po-address {
    font-size: 13px;
    line-height: 1.75;
    color: #666;
    max-width: 340px;
  }
  .sauda-po-tax-block {
    text-align: right;
    font-size: 12px;
    line-height: 1.9;
    color: #555;
  }
  .sauda-po-tax-block strong {
    font-weight: 600;
    color: #333;
  }
  .sauda-po-section {
    margin-bottom: 22px;
  }
  .sauda-po-section-title {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
    font-family: 'Montserrat', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #B37A26;
    white-space: nowrap;
  }
  .sauda-po-section-title::before,
  .sauda-po-section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #DDBA73;
  }
  .sauda-po-product-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    border-top: 1px solid #E9E2D8;
    border-bottom: 1px solid #E9E2D8;
  }
  .sauda-po-product-cell {
    padding: 12px 10px;
    border-right: 1px solid #E9E2D8;
  }
  .sauda-po-product-cell:nth-child(4n) { border-right: none; }
  .sauda-po-product-cell:nth-child(n+5) { border-top: 1px solid #E9E2D8; }
  .sauda-po-label {
    font-size: 11px;
    font-weight: 600;
    color: #444;
    margin-bottom: 6px;
  }
  .sauda-po-value {
    font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    font-size: 17px;
    font-weight: 500;
    color: #1F1F1F;
    line-height: 1.25;
    word-break: break-word;
  }
  .sauda-po-pricing {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0;
    text-align: center;
    border-top: 1px solid #E9E2D8;
    border-bottom: 1px solid #E9E2D8;
    padding-top: 10px;
    padding-bottom: 10px;
  }
  .sauda-po-pricing-icon-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    margin-bottom: 10px;
  }
  .sauda-po-pricing-icon-cell {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .sauda-po-pricing-icon {
    width: 28px;
    height: 28px;
    color: #C89A43;
    stroke: #C89A43;
    fill: none;
    stroke-width: 1.6;
  }
  .sauda-po-pricing-col {
    padding: 0 8px;
    border-right: 1px solid #E9E2D8;
  }
  .sauda-po-pricing-col:last-child { border-right: none; }
  .sauda-po-pricing .sauda-po-label { font-size: 10px; margin-bottom: 8px; }
  .sauda-po-pricing .sauda-po-value { font-size: 15px; }
  .sauda-po-parties {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    align-items: start;
  }
  .sauda-po-party-card {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    min-width: 0;
  }
  .sauda-po-party-body {
    min-width: 0;
    flex: 1;
  }
  .sauda-po-party-icon {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #0F2E21;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sauda-po-party-icon svg {
    width: 22px;
    height: 22px;
    stroke: #DDBA73;
    fill: none;
    stroke-width: 1.6;
  }
  .sauda-po-party-role {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 4px;
  }
  .sauda-po-party-name {
    font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    font-size: 20px;
    font-weight: 600;
    color: #1B1B1B;
    margin-bottom: 6px;
    line-height: 1.2;
    word-break: break-word;
  }
  .sauda-po-party-detail {
    font-size: 12px;
    line-height: 1.75;
    color: #666;
  }
  .sauda-po-amount-box {
    display: flex;
    min-height: 120px;
    border-radius: 10px;
    overflow: hidden;
    background: linear-gradient(135deg, #0F2E21 0%, #1B422F 100%);
    margin-bottom: 18px;
    box-shadow: 0 6px 25px rgba(0,0,0,0.05);
    page-break-inside: avoid;
  }
  .sauda-po-amount-left {
    flex: 1;
    padding: 22px 28px;
    border-right: 1px solid rgba(255,255,255,0.12);
  }
  .sauda-po-amount-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.75);
    margin-bottom: 8px;
  }
  .sauda-po-amount-value {
    font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    font-size: 38px;
    font-weight: 600;
    color: #DDBA73;
    line-height: 1;
    margin-bottom: 8px;
  }
  .sauda-po-amount-words {
    font-size: 12px;
    color: #DDBA73;
    opacity: 0.9;
    line-height: 1.5;
    max-width: 320px;
  }
  .sauda-po-amount-right {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 12px;
    position: relative;
  }
  .sauda-po-amount-strip {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 6px;
    background: #C89A43;
  }
  .sauda-po-signature {
    font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    font-size: 22px;
    font-style: italic;
    color: #DDBA73;
    margin-bottom: 6px;
    white-space: nowrap;
    text-align: center;
    line-height: 1.1;
  }
  .sauda-po-parties,
  .sauda-po-section {
    page-break-inside: avoid;
  }
  .sauda-po-signatory {
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.8);
    text-align: center;
    line-height: 1.5;
  }
  .sauda-po-footer {
    text-align: center;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #999;
    line-height: 2;
    padding-top: 12px;
    border-top: 1px solid #E9E2D8;
  }
  @media print {
    html, body {
      width: 794px;
      margin: 0;
      padding: 0;
    }
    .sauda-po-page {
      width: 794px;
      min-height: 1123px;
      page-break-after: avoid;
    }
  }
`;

function IconPin() {
  return (
    <svg className="sauda-po-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg className="sauda-po-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg className="sauda-po-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg className="sauda-po-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ProductField({ label, value }: { label: string; value: string }) {
  return (
    <div className="sauda-po-product-cell">
      <div className="sauda-po-label">{label}</div>
      <div className="sauda-po-value">{value}</div>
    </div>
  );
}

function PricingCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="sauda-po-pricing-col">
      <div className="sauda-po-label">{label}</div>
      <div className="sauda-po-value">{value}</div>
    </div>
  );
}

export interface SaudaPurchaseOrderDocumentProps {
  data: SaudaPdfViewModel;
  assetBaseUrl: string;
}

function PricingIcon({ children }: { children: ReactNode }) {
  return (
    <div className="sauda-po-pricing-icon-cell">
      <svg className="sauda-po-pricing-icon" viewBox="0 0 24 24">
        {children}
      </svg>
    </div>
  );
}

export function SaudaPurchaseOrderDocument({ data, assetBaseUrl }: SaudaPurchaseOrderDocumentProps) {
  const logo = `${assetBaseUrl}/images/sauda-pdf/logo.png?v=2`;
  const sidebarArt = `${assetBaseUrl}/images/sauda-pdf/left-arch.png`;

  const hasBroker = data.brokerName !== '—';

  return (
    <div className="sauda-po-page">
      <aside className="sauda-po-sidebar">
        <div className="sauda-po-sidebar-header">
          <img src={logo} alt="Adhra Amrit Premium Agro Foods" />
        </div>
        <div className="sauda-po-sidebar-body">
          {data.company.address && (
            <div className="sauda-po-contact-item">
              <IconPin />
              <span>{data.company.address}</span>
            </div>
          )}
          {data.company.phone && (
            <div className="sauda-po-contact-item">
              <IconPhone />
              <span>{data.company.phone}</span>
            </div>
          )}
          {data.company.email && (
            <div className="sauda-po-contact-item">
              <IconMail />
              <span>{data.company.email}</span>
            </div>
          )}
          {data.company.website && (
            <div className="sauda-po-contact-item">
              <IconGlobe />
              <span>{data.company.website}</span>
            </div>
          )}
          {data.company.llpin && (
            <div className="sauda-po-meta-row">
              <div className="sauda-po-meta-label">LLPIN</div>
              <div className="sauda-po-meta-value">{data.company.llpin}</div>
            </div>
          )}

          <div className="sauda-po-divider" />

          <div className="sauda-po-order-heading">Order Information</div>
          <div className="sauda-po-po-number">{data.poNumber}</div>

          <div className="sauda-po-meta-row">
            <div className="sauda-po-meta-label">Date</div>
            <div className="sauda-po-meta-value">{data.saudaDate}</div>
          </div>
          {data.validUntil && (
            <div className="sauda-po-meta-row">
              <div className="sauda-po-meta-label">Valid Until</div>
              <div className="sauda-po-meta-value">{data.validUntil}</div>
            </div>
          )}
          {data.preparedBy && (
            <div className="sauda-po-meta-row">
              <div className="sauda-po-meta-label">Prepared By</div>
              <div className="sauda-po-meta-value">{data.preparedBy}</div>
            </div>
          )}

          <div className="sauda-po-sidebar-footer">
            <img src={sidebarArt} alt="" />
          </div>
        </div>
      </aside>

      <main className="sauda-po-main">
        <header className="sauda-po-header">
          <div className="sauda-po-title-block">
            <h1>
              SAUDA /
              <br />
              PURCHASE ORDER
              <span className="gold">CONFIRMATION</span>
            </h1>
          </div>
        </header>

        <section className="sauda-po-recipient">
          <div className="sauda-po-to-label">To</div>
          <div className="sauda-po-vendor-name">M/s {data.vendorName}</div>
          <div className="sauda-po-recipient-grid">
            <div className="sauda-po-address">{data.vendorAddress}</div>
            <div className="sauda-po-tax-block">
              <div>
                <strong>GSTIN</strong> {data.vendorGstin}
              </div>
              <div>
                <strong>PAN</strong> {data.vendorPan}
              </div>
              <div>
                <strong>Registration</strong> {data.vendorRegistration}
              </div>
            </div>
          </div>
        </section>

        <section className="sauda-po-section">
          <div className="sauda-po-section-title">Product Details</div>
          <div className="sauda-po-product-grid">
            <ProductField label="Sauda Type" value={data.saudaType} />
            <ProductField label="Category" value={data.category} />
            <ProductField label="Rice Code" value={data.riceCode} />
            <ProductField label="Variant" value={data.variant} />
            <ProductField label="Rice Length" value={data.riceLength} />
            <ProductField label="Whiteness (W)" value={data.whiteness} />
            <ProductField label="Avg Grain Length (mm)" value={data.avgGrainLength} />
            <ProductField label="Date" value={data.saudaDate} />
          </div>
        </section>

        <section className="sauda-po-section">
          <div className="sauda-po-section-title">Pricing &amp; Quantity</div>
          <div className="sauda-po-pricing-icon-row">
            <PricingIcon><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><path d="M7 7h.01" /></PricingIcon>
            <PricingIcon><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></PricingIcon>
            <PricingIcon><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></PricingIcon>
            <PricingIcon><circle cx="12" cy="5" r="3" /><path d="M12 22V8" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /></PricingIcon>
            <PricingIcon><circle cx="12" cy="12" r="10" /><path d="M9 9h.01" /><path d="M15 9h.01" /><path d="M8 15s1.5 2 4 2 4-2 4-2" /></PricingIcon>
          </div>
          <div className="sauda-po-pricing">
            <PricingCol label="Rate" value={data.rate} />
            <PricingCol label="Quantity" value={data.quantity} />
            <PricingCol label="No. of Bags" value={data.noOfBags} />
            <PricingCol label="Bag Weight" value={data.bagWeight} />
            <PricingCol label="Cash Discount" value={data.cashDiscount} />
          </div>
        </section>

        <section className="sauda-po-section">
          <div className="sauda-po-section-title">Parties</div>
          <div className="sauda-po-parties">
            <div className="sauda-po-party-card">
              <div className="sauda-po-party-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="M9 22V12h6v10" />
                </svg>
              </div>
              <div className="sauda-po-party-body">
                <div className="sauda-po-party-role">Vendor</div>
                <div className="sauda-po-party-name">{data.vendorName}</div>
                <div className="sauda-po-party-detail">
                  GSTIN: {data.vendorGstin}
                  <br />
                  PAN: {data.vendorPan}
                  <br />
                  {data.vendorAddress}
                </div>
              </div>
            </div>
            <div className="sauda-po-party-card">
              <div className="sauda-po-party-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="sauda-po-party-body">
                <div className="sauda-po-party-role">Broker</div>
                <div className="sauda-po-party-name">{hasBroker ? data.brokerName : '—'}</div>
                {hasBroker && (
                  <div className="sauda-po-party-detail">Commission: {data.brokerCommission}</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="sauda-po-amount-box">
          <div className="sauda-po-amount-left">
            <div className="sauda-po-amount-label">Estimated Amount</div>
            <div className="sauda-po-amount-value">{data.estimatedAmount}</div>
            {data.amountInWords && <div className="sauda-po-amount-words">{data.amountInWords}</div>}
          </div>
          <div className="sauda-po-amount-right">
            <div className="sauda-po-amount-strip" />
            <div className="sauda-po-signature">{data.authorisedSignature}</div>
            <div className="sauda-po-signatory">
              Authorised Signatory
              <br />
              {data.company.name}
            </div>
          </div>
        </section>

        <footer className="sauda-po-footer">
          <div>Generated on {data.generatedAt}</div>
          <div>This is a computer-generated document</div>
        </footer>
      </main>
    </div>
  );
}

export { SAUDA_PDF_STYLES };
