import type { ReactNode } from 'react';
import {
  Banknote,
  Building2,
  Calendar,
  CircleAlert,
  CircleCheck,
  FileText,
  Globe,
  IndianRupee,
  Mail,
  MapPin,
  Monitor,
  Phone,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react';
import type { BillOfSupplyViewModel } from '../../../../utils/ewayBillPreviewData';

/** Matched from reference Bill of Supply: Playfair Display (serif) + Montserrat (sans). */
export const BILL_OF_SUPPLY_GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,500;1,600&display=swap';

export const BILL_OF_SUPPLY_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 portrait; margin: 6mm; }
  :root {
    --navy: #0D2343;
    --navy-dark: #09182E;
    --gold: #C89A2B;
    --gold-light: #E7C567;
    --gold-deep: #B8891D;
    --gold-mid: #D7A739;
    --border: #DDD6C8;
    --bg: #FAF9F7;
    --card: #FFFFFF;
    --text: #1F2937;
    --muted: #6B7280;
    --divider: #ECECEC;
    --outer: #D7B05A;
  }
  body {
    font-family: 'Montserrat', Arial, Helvetica, sans-serif;
    background: #fff;
    color: var(--text);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .bos-page {
    /* px (not mm) — html-to-image captures more reliably with CSS pixels */
    width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    padding: 26px;
    background: var(--bg);
    border: 1.5px solid var(--outer);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  .bos-page > * + * { margin-top: 9px; }

  .bos-row {
    display: grid;
    gap: 9px;
    align-items: stretch;
  }
  .bos-row-2 { grid-template-columns: 1fr 1fr; }
  .bos-row-3 { grid-template-columns: 1.15fr 1fr 0.95fr; }

  .bos-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
  }

  /* ========== HEADER (3 cols + gold vertical rules) ========== */
  .bos-header {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr) 200px;
    align-items: stretch;
    background: transparent;
    overflow: visible;
  }
  .bos-header-col {
    padding: 6px 10px;
    min-width: 0;
  }
  .bos-header-col + .bos-header-col {
    border-left: 1px solid var(--outer);
  }
  .bos-header-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    overflow: visible;
  }
  .bos-logo {
    width: 180px;
    max-width: 100%;
    height: auto;
    display: block;
    object-fit: contain;
  }

  .bos-header-company {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 10px 12px;
  }
  .bos-header-company > * + * { margin-top: 6px; }
  .bos-company-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 2px;
  }
  .bos-company-brand > * + * { margin-top: 5px; }
  .bos-company-name {
    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
    font-weight: 700;
    color: var(--navy);
    text-transform: uppercase;
    text-align: center;
    position: relative;
    z-index: 1;
  }
  .bos-company-name-l1,
  .bos-company-name-l2 {
    display: block;
    font-size: 16px;
    letter-spacing: 0.6px;
    line-height: 1.3;
    position: relative;
  }
  .bos-company-name-l2 { margin-top: 2px; }
  .bos-tagline {
    font-family: 'Montserrat', Arial, Helvetica, sans-serif;
    font-size: 8.5px;
    font-weight: 600;
    color: var(--gold);
    letter-spacing: 1.1px;
    text-transform: uppercase;
    text-align: center;
    line-height: 1.35;
    position: relative;
    z-index: 1;
  }
  .bos-wheat-divider {
    display: flex;
    align-items: center;
    width: 92%;
    max-width: 280px;
    margin: 2px auto 0;
  }
  .bos-wheat-line {
    flex: 1 1 auto;
    height: 1px;
    background: var(--gold);
    min-width: 16px;
  }
  .bos-wheat-icon {
    width: 14px;
    height: 14px;
    color: var(--gold);
    flex-shrink: 0;
    margin: 0 8px;
  }
  .bos-contact-list {
    display: flex;
    flex-direction: column;
  }
  .bos-contact-list > * + * { margin-top: 4px; }
  .bos-contact-row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    font-size: 9.5px;
    line-height: 1.4;
    color: var(--navy);
  }
  .bos-contact-icon {
    width: 12px;
    height: 12px;
    color: var(--gold);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .bos-contact-label {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-right: 4px;
  }

  .bos-header-bill {
    padding: 0 0 0 10px;
    background: transparent;
    border-left: 1px solid var(--outer);
  }
  .bos-bill-card {
    background: linear-gradient(165deg, #0F2748 0%, #09182E 100%);
    border-radius: 8px;
    padding: 12px 12px 10px;
    color: #fff;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .bos-bill-title {
    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--gold-light);
    text-align: center;
    line-height: 1.25;
    white-space: nowrap;
    position: relative;
    z-index: 1;
  }
  .bos-bill-ornament {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 8px 0 7px;
    position: relative;
    z-index: 0;
  }
  .bos-bill-ornament-line {
    width: 28px;
    height: 1px;
    background: var(--gold);
    flex-shrink: 0;
  }
  .bos-bill-diamond {
    width: 6px;
    height: 6px;
    margin: 0 6px;
    background: var(--gold-light);
    /* avoid transform — html-to-image often misplaces rotated nodes */
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    flex-shrink: 0;
  }
  .bos-bill-sub {
    font-size: 7.5px;
    line-height: 1.35;
    color: rgba(255,255,255,0.82);
    text-align: center;
    margin-bottom: 8px;
  }
  .bos-bill-rows { margin-top: auto; }
  .bos-bill-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    font-size: 9.5px;
    padding: 5.5px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.28);
  }
  .bos-bill-row:last-child { border-bottom: none; padding-bottom: 0; }
  .bos-bill-label {
    color: var(--gold);
    font-weight: 600;
    flex: 0 1 auto;
    padding-right: 8px;
  }
  .bos-bill-value {
    color: #fff;
    font-weight: 700;
    text-align: right;
    word-break: break-word;
    max-width: 55%;
  }

  /* ========== PARTY CARDS + RIBBON ========== */
  .bos-party {
    position: relative;
    padding: 22px 14px 12px;
    margin-top: 8px;
  }
  .bos-ribbon {
    position: absolute;
    top: -13px;
    left: 12px;
    display: inline-flex;
    align-items: center;
    z-index: 2;
  }
  .bos-ribbon-icon {
    width: 34px;
    height: 34px;
    background: var(--navy-dark);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    z-index: 2;
  }
  .bos-ribbon-icon svg { width: 15px; height: 15px; color: #fff; }
  .bos-ribbon-bar {
    height: 28px;
    margin-left: -3px;
    padding: 0 20px 0 12px;
    display: flex;
    align-items: center;
    background: linear-gradient(90deg, #B8891D, #D7A739 50%, #C89A2B);
    color: #fff;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.65px;
    text-transform: uppercase;
    white-space: nowrap;
    clip-path: polygon(0 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 0 100%);
  }
  .bos-party-name {
    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 3px;
  }
  .bos-party-address {
    font-size: 10px;
    line-height: 1.4;
    color: #555;
    margin-bottom: 8px;
  }
  .bos-kv {
    display: grid;
    grid-template-columns: 102px 8px 1fr;
    font-size: 10px;
    line-height: 1.45;
    gap: 0 2px;
  }
  .bos-kv + .bos-kv { margin-top: 3px; }
  .bos-kv-label { color: var(--navy); font-weight: 600; }
  .bos-kv-sep { color: var(--muted); text-align: center; }
  .bos-kv-value { color: #444; font-weight: 500; word-break: break-word; }

  /* ========== LOGISTICS STRIP (one band, 5 cells) ========== */
  .bos-strip {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    overflow: hidden;
    min-height: 68px;
  }
  .bos-strip-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 8px 6px;
    text-align: center;
    position: relative;
  }
  .bos-strip-cell + .bos-strip-cell::before {
    content: '';
    position: absolute;
    left: 0;
    top: 12px;
    bottom: 12px;
    width: 1px;
    background: var(--divider);
  }
  .bos-strip-icon {
    color: var(--gold);
    width: 16px;
    height: 16px;
    display: inline-flex;
  }
  .bos-strip-icon svg { width: 16px; height: 16px; color: var(--gold); }
  .bos-strip-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.55px;
    text-transform: uppercase;
    color: var(--navy);
  }
  .bos-strip-value {
    font-size: 10.5px;
    font-weight: 600;
    color: #444;
    line-height: 1.25;
    word-break: break-word;
  }

  /* ========== TABLE + TOTALS ========== */
  .bos-table-block {
    background: #fff;
    border: 1px solid #D8D8D8;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
  }
  .bos-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  .bos-table thead th {
    background: var(--navy);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.35px;
    height: 36px;
    padding: 0 8px;
    text-align: center;
    white-space: nowrap;
    border: 1px solid #0A1C36;
  }
  .bos-table thead th.left { text-align: left; }
  .bos-table thead th.right { text-align: right; }
  .bos-table tbody td {
    height: 36px;
    padding: 6px 8px;
    border: 1px solid #E8E8E8;
    vertical-align: middle;
    color: var(--navy);
    background: #fff;
  }
  .bos-table .center { text-align: center; }
  .bos-table .right { text-align: right; font-variant-numeric: tabular-nums; }
  .bos-item-desc {
    font-weight: 600;
    font-size: 10.5px;
    color: var(--navy);
    line-height: 1.35;
  }
  .bos-table tfoot td {
    background: #fff;
    font-weight: 700;
    height: 34px;
    padding: 6px 8px;
    color: var(--navy);
    border: 1px solid #E8E8E8;
    font-size: 10px;
  }
  .bos-table tfoot .bos-total-qty-label {
    text-align: right;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    padding-right: 12px;
  }

  .bos-totals-bar {
    display: grid;
    grid-template-columns: 1.25fr 1fr;
    gap: 20px;
    padding: 12px 14px 14px;
    border-top: 1px solid #E8E8E8;
    align-items: end;
  }
  .bos-words-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--navy);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .bos-words-value {
    font-family: 'Montserrat', Arial, Helvetica, sans-serif;
    font-style: normal;
    font-size: 11.5px;
    line-height: 1.45;
    color: #333;
    font-weight: 500;
  }
  .bos-totals-stack { display: flex; flex-direction: column; gap: 6px; }
  .bos-total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10.5px;
    gap: 12px;
  }
  .bos-total-row span:first-child {
    color: var(--navy);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.35px;
  }
  .bos-total-row span:last-child {
    font-weight: 700;
    color: var(--navy);
    font-variant-numeric: tabular-nums;
  }
  .bos-grand {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--navy);
    border-radius: 4px;
    height: 42px;
    padding: 0 14px;
    margin-top: 2px;
  }
  .bos-grand-label {
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }
  .bos-grand-value {
    color: var(--gold-light);
    font-size: 18px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  /* ========== INFO CARDS ========== */
  .bos-info {
    padding: 12px;
  }
  .bos-info-head {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
  }
  .bos-info-icon {
    color: var(--gold);
    width: 16px;
    height: 16px;
    display: inline-flex;
    flex-shrink: 0;
  }
  .bos-info-icon svg { width: 16px; height: 16px; color: var(--gold); }
  .bos-info-title {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 0.55px;
  }
  .bos-info-rule {
    height: 1px;
    background: var(--divider);
    margin-bottom: 8px;
  }
  .bos-decl {
    font-size: 9.5px;
    line-height: 1.45;
    color: #555;
  }
  .bos-sign-card {
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }
  .bos-sign-label {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.55px;
    text-transform: uppercase;
    color: var(--navy);
    margin-bottom: 10px;
  }
  .bos-sign-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    text-align: center;
  }
  .bos-sign-img {
    width: 150px;
    max-width: 85%;
    height: auto;
    display: block;
    margin: 0 auto 6px;
    object-fit: contain;
  }
  .bos-sign-line {
    width: 88%;
    height: 1px;
    background: #9CA3AF;
    margin: 0 auto 6px;
  }
  .bos-sign-for {
    font-size: 10px;
    font-weight: 500;
    color: var(--navy);
    line-height: 1.35;
  }

  /* ========== LEGAL / DISCLAIMER ========== */
  .bos-legal-card { padding: 12px; }
  .bos-disclaimer-card {
    padding: 12px;
    background: #FFF9EF;
    border-color: #E8D5A8;
  }
  .bos-legal-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bos-legal-list li {
    display: flex;
    gap: 7px;
    font-size: 9px;
    line-height: 1.4;
    color: #555;
  }
  .bos-legal-bullet {
    width: 12px;
    height: 12px;
    color: var(--gold);
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* ========== THANKS ========== */
  .bos-thanks {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding-top: 2px;
  }
  .bos-flourish { width: 70px; height: 11px; flex-shrink: 0; }
  .bos-thanks-text {
    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.8px;
    color: var(--gold);
    white-space: nowrap;
  }

  .bos-empty { color: var(--muted); font-style: italic; }

  @media print {
    body { margin: 0; background: white; }
    .bos-page { page-break-after: avoid; break-after: avoid-page; }
  }
`;

function dash(value?: string | null): string {
  const v = (value ?? '').trim();
  return v || '—';
}

function GoldFlourish({ flip }: { flip?: boolean }) {
  return (
    <svg
      className="bos-flourish"
      viewBox="0 0 90 14"
      aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M2 7c10-5 18 5 28 0s18-5 28 0 18 5 28 0"
        fill="none"
        stroke="#C89A2B"
        strokeWidth="1.15"
      />
      <path d="M40 7h10" stroke="#E7C567" strokeWidth="1.2" />
      <circle cx="45" cy="7" r="2" fill="#C89A2B" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg className="bos-wheat-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 19c8-1 12-7 14-14-6 1-12 5-14 14z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M7 17c4-3 8-7 10-12"
        fill="none"
        stroke="#FAF9F7"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function splitCompanyName(name: string): { line1: string; line2: string } {
  const n = name.trim();
  const m = n.match(/^(.*?)\s+(AGRO PRODUCTS LLP)$/i);
  if (m) {
    return { line1: m[1].toUpperCase(), line2: m[2].toUpperCase() };
  }
  if (/llp$/i.test(n)) {
    const parts = n.split(/\s+/);
    if (parts.length >= 3) {
      return {
        line1: parts.slice(0, -3).join(' ').toUpperCase() || parts[0].toUpperCase(),
        line2: parts.slice(-3).join(' ').toUpperCase(),
      };
    }
  }
  return { line1: n.toUpperCase(), line2: '' };
}

function Ribbon({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="bos-ribbon">
      <div className="bos-ribbon-icon">{icon}</div>
      <div className="bos-ribbon-bar">{title}</div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bos-kv">
      <span className="bos-kv-label">{label}</span>
      <span className="bos-kv-sep">:</span>
      <span className="bos-kv-value">{dash(value)}</span>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  children,
  className = '',
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bos-card bos-info ${className}`.trim()}>
      <div className="bos-info-head">
        <span className="bos-info-icon">{icon}</span>
        <div className="bos-info-title">{title}</div>
      </div>
      <div className="bos-info-rule" />
      {children}
    </div>
  );
}

export interface BillOfSupplyDocumentProps {
  data: BillOfSupplyViewModel;
  assetBaseUrl?: string;
}

export function BillOfSupplyDocument({
  data,
  assetBaseUrl = '',
}: BillOfSupplyDocumentProps) {
  const logoSrc = `${assetBaseUrl}/images/bill-of-supply/logo.png?v=9`;
  const signatureSrc = `${assetBaseUrl}/images/bill-of-supply/signature.png?v=1`;
  const phone = data.companyPhones.filter(Boolean).join(' / ');
  const { line1: companyLine1, line2: companyLine2 } = splitCompanyName(
    data.companyName,
  );
  const placeOfSupplyDisplay =
    data.placeOfSupply && data.stateCode && !data.placeOfSupply.includes('(')
      ? `${data.placeOfSupply} (${data.stateCode})`
      : data.placeOfSupply;
  return (
    <div className="bos-page">
      {/* 1. Header — logo | company | bill card */}
      <div className="bos-header">
        <div className="bos-header-col bos-header-logo">
          <img
            className="bos-logo"
            src={logoSrc}
            alt="Adhra Amrit Premium Agro Foods"
          />
        </div>

        <div className="bos-header-col bos-header-company">
          <div className="bos-company-brand">
            <div className="bos-company-name">
              <div className="bos-company-name-l1">{companyLine1}</div>
              {companyLine2 ? (
                <div className="bos-company-name-l2">{companyLine2}</div>
              ) : null}
            </div>
            <div className="bos-tagline">{data.companyTagline}</div>
            <div className="bos-wheat-divider">
              <span className="bos-wheat-line" />
              <LeafIcon />
              <span className="bos-wheat-line" />
            </div>
          </div>
          <div className="bos-contact-list">
            <div className="bos-contact-row">
              <MapPin className="bos-contact-icon" strokeWidth={2} />
              <span>
                <span className="bos-contact-label">Registered Office:</span>
                {dash(data.companyAddress)}
              </span>
            </div>
            <div className="bos-contact-row">
              <Phone className="bos-contact-icon" strokeWidth={2} />
              <span>{dash(phone)}</span>
            </div>
            <div className="bos-contact-row">
              <Mail className="bos-contact-icon" strokeWidth={2} />
              <span>{dash(data.companyEmail)}</span>
            </div>
            <div className="bos-contact-row">
              <Globe className="bos-contact-icon" strokeWidth={2} />
              <span>{dash(data.companyWebsite)}</span>
            </div>
          </div>
        </div>

        <div className="bos-header-bill">
          <div className="bos-bill-card">
            <div className="bos-bill-title">{data.documentTitle}</div>
            <div className="bos-bill-ornament">
              <span className="bos-bill-ornament-line" />
              <span className="bos-bill-diamond" />
              <span className="bos-bill-ornament-line" />
            </div>
            <div className="bos-bill-sub">{data.documentSubtitle}</div>
            <div className="bos-bill-rows">
              <div className="bos-bill-row">
                <span className="bos-bill-label">Bill of Supply No.</span>
                <span className="bos-bill-value">{dash(data.invoiceNo)}</span>
              </div>
              <div className="bos-bill-row">
                <span className="bos-bill-label">Date</span>
                <span className="bos-bill-value">{dash(data.invoiceDate)}</span>
              </div>
              <div className="bos-bill-row">
                <span className="bos-bill-label">Place of Supply</span>
                <span className="bos-bill-value">{dash(placeOfSupplyDisplay)}</span>
              </div>
              <div className="bos-bill-row">
                <span className="bos-bill-label">State Code</span>
                <span className="bos-bill-value">{dash(data.stateCode)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Supplier / Buyer */}
      <div className="bos-row bos-row-2">
        <div className="bos-card bos-party">
          <Ribbon icon={<Building2 strokeWidth={2} />} title="Supplier (From)" />
          <div className="bos-party-name">{dash(data.companyName)}</div>
          <div className="bos-party-address">{dash(data.companyAddress)}</div>
          <Kv label="GSTIN" value={data.companyGstin} />
          <Kv label="PAN" value={data.companyPan} />
          <Kv label="LLPIN" value={data.companyLlpin} />
          <Kv label="FSSAI No." value={data.fssai} />
          <Kv label="IEC Code" value={data.companyIec} />
          <Kv label="MSME UDYAM No." value={data.udyamNo} />
        </div>

        <div className="bos-card bos-party">
          <Ribbon icon={<User strokeWidth={2} />} title="Buyer (To)" />
          <div className="bos-party-name">{dash(data.billToName)}</div>
          <div className="bos-party-address">{dash(data.billToAddress)}</div>
          <Kv label="GSTIN" value={data.billToGstin} />
          <Kv label="State Code" value={data.stateCode} />
          <Kv label="Mobile" value={data.billToMobile} />
          <Kv label="Email" value={data.billToEmail} />
        </div>
      </div>

      {/* 3. Logistics strips */}
      <div className="bos-strip">
        <div className="bos-strip-cell">
          <span className="bos-strip-icon">
            <FileText strokeWidth={2} />
          </span>
          <div className="bos-strip-label">PO No.</div>
          <div className="bos-strip-value">{dash(data.orderNo)}</div>
        </div>
        <div className="bos-strip-cell">
          <span className="bos-strip-icon">
            <Calendar strokeWidth={2} />
          </span>
          <div className="bos-strip-label">PO Date</div>
          <div className="bos-strip-value">{dash(data.orderDate)}</div>
        </div>
        <div className="bos-strip-cell">
          <span className="bos-strip-icon">
            <Truck strokeWidth={2} />
          </span>
          <div className="bos-strip-label">Dispatch From</div>
          <div className="bos-strip-value">{dash(data.dispatchFrom)}</div>
        </div>
        <div className="bos-strip-cell">
          <span className="bos-strip-icon">
            <MapPin strokeWidth={2} />
          </span>
          <div className="bos-strip-label">Ship To</div>
          <div className="bos-strip-value">{dash(data.shipToPlace)}</div>
        </div>
        <div className="bos-strip-cell">
          <span className="bos-strip-icon">
            <IndianRupee strokeWidth={2} />
          </span>
          <div className="bos-strip-label">Payment Terms</div>
          <div className="bos-strip-value">{dash(data.paymentTerms)}</div>
        </div>
      </div>
      <div className="bos-strip">
        <div className="bos-strip-cell">
          <span className="bos-strip-icon">
            <Truck strokeWidth={2} />
          </span>
          <div className="bos-strip-label">Vehicle No.</div>
          <div className="bos-strip-value">{dash(data.vehicleNo)}</div>
        </div>
        <div className="bos-strip-cell">
          <span className="bos-strip-icon">
            <Truck strokeWidth={2} />
          </span>
          <div className="bos-strip-label">Transporter</div>
          <div className="bos-strip-value">{dash(data.transporter)}</div>
        </div>
        <div className="bos-strip-cell">
          <span className="bos-strip-icon">
            <FileText strokeWidth={2} />
          </span>
          <div className="bos-strip-label">LR / GR No.</div>
          <div className="bos-strip-value">{dash(data.grLrNo)}</div>
        </div>
        <div className="bos-strip-cell">
          <span className="bos-strip-icon">
            <MapPin strokeWidth={2} />
          </span>
          <div className="bos-strip-label">Distance</div>
          <div className="bos-strip-value">
            {data.distanceKm ? `${data.distanceKm} km` : '–'}
          </div>
        </div>
        <div className="bos-strip-cell">
          <span className="bos-strip-icon">
            <FileText strokeWidth={2} />
          </span>
          <div className="bos-strip-label">Terms of Delivery</div>
          <div className="bos-strip-value">{dash(data.termsOfDelivery)}</div>
        </div>
      </div>

      {/* 4. Items + totals together */}
      <div className="bos-table-block">
        <table className="bos-table">
          <thead>
            <tr>
              <th style={{ width: 34 }}>Sr.</th>
              <th className="left">Description of Goods</th>
              <th style={{ width: 72 }}>HSN Code</th>
              <th style={{ width: 48 }}>Bags</th>
              <th style={{ width: 52 }}>Qty.</th>
              <th style={{ width: 44 }}>Unit</th>
              <th className="right" style={{ width: 68 }}>
                Rate (₹)
              </th>
              <th className="right" style={{ width: 72 }}>
                Discount (₹)
              </th>
              <th className="right" style={{ width: 90 }}>
                Taxable Value (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {data.lines.length === 0 ? (
              <tr>
                <td colSpan={9} className="center bos-empty">
                  No line items in preview payload
                </td>
              </tr>
            ) : (
              data.lines.map((line) => (
                <tr key={line.slNo}>
                  <td className="center">{line.slNo}</td>
                  <td>
                    <div className="bos-item-desc">
                      {line.description}
                      {line.descriptionSub ? ` (${line.descriptionSub})` : ''}
                    </div>
                  </td>
                  <td className="center">{dash(line.hsn)}</td>
                  <td className="center">{dash(line.bags)}</td>
                  <td className="center">{dash(line.qty)}</td>
                  <td className="center">{dash(line.unit)}</td>
                  <td className="right">{dash(line.rate)}</td>
                  <td className="right">{dash(line.discount)}</td>
                  <td className="right">{dash(line.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="bos-total-qty-label">
                Total Quantity
              </td>
              <td className="center">{dash(data.totalBags)}</td>
              <td className="center">{dash(data.totalQtySum)}</td>
              <td className="center">{dash(data.totalUnit)}</td>
              <td />
              <td />
              <td className="right">{dash(data.taxableValue)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="bos-totals-bar">
          <div>
            <div className="bos-words-label">Amount in Words</div>
            <div className="bos-words-value">{dash(data.amountInWords)}</div>
          </div>
          <div className="bos-totals-stack">
            <div className="bos-total-row">
              <span>Total Taxable Value</span>
              <span>₹ {dash(data.taxableValue)}</span>
            </div>
            <div className="bos-total-row">
              <span>Round Off</span>
              <span>₹ {dash(data.roundOff)}</span>
            </div>
            <div className="bos-grand">
              <span className="bos-grand-label">Grand Total</span>
              <span className="bos-grand-value">₹ {dash(data.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. E-Invoice / E-Way */}
      <div className="bos-row bos-row-2">
        <InfoCard icon={<Monitor strokeWidth={2} />} title="E-Invoice Details">
          <Kv label="IRN" value={data.eInvoiceIrn} />
          <Kv label="Ack. No." value={data.eInvoiceAckNo} />
          <Kv label="Ack. Date" value={data.eInvoiceAckDate} />
        </InfoCard>
        <InfoCard icon={<Truck strokeWidth={2} />} title="E-Way Bill Details">
          <Kv label="E-Way Bill No." value={data.eWayBillNo} />
          <Kv label="E-Way Bill Date" value={data.eWayBillDate || data.invoiceDate} />
          <Kv label="IRN Linked" value={data.eInvoiceIrn} />
        </InfoCard>
      </div>

      {/* 6. Declaration / Bank / Sign */}
      <div className="bos-row bos-row-3">
        <InfoCard icon={<ShieldCheck strokeWidth={2} />} title="Declaration">
          <p className="bos-decl">{data.declaration}</p>
        </InfoCard>
        <InfoCard icon={<Banknote strokeWidth={2} />} title="Bank Details">
          <Kv label="Bank Name" value={data.bankName} />
          <Kv label="A/C No." value={data.bankAccount} />
          <Kv label="IFSC Code" value={data.bankIfsc || data.bankBranchIfsc} />
          <Kv label="Branch" value={data.bankBranch} />
        </InfoCard>
        <div className="bos-card bos-sign-card">
          <div className="bos-sign-label">Authorized Signatory</div>
          <div className="bos-sign-body">
            <img
              className="bos-sign-img"
              src={signatureSrc}
              alt={data.authorisedSignatory || 'Authorized signature'}
            />
            <div className="bos-sign-line" />
            <div className="bos-sign-for">For {dash(data.companyName)}</div>
          </div>
        </div>
      </div>

      {/* 7. Legal / Disclaimer */}
      <div className="bos-row bos-row-2">
        <div className="bos-card bos-legal-card">
          <div className="bos-info-head">
            <span className="bos-info-icon">
              <CircleCheck strokeWidth={2} />
            </span>
            <div className="bos-info-title">Important Legal Terms</div>
          </div>
          <div className="bos-info-rule" />
          <ul className="bos-legal-list">
            {data.legalTerms.map((term) => (
              <li key={term}>
                <CircleCheck className="bos-legal-bullet" strokeWidth={2} />
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bos-card bos-disclaimer-card">
          <div className="bos-info-head">
            <span className="bos-info-icon">
              <CircleAlert strokeWidth={2} />
            </span>
            <div className="bos-info-title">Disclaimer</div>
          </div>
          <div className="bos-info-rule" />
          <p className="bos-decl">{data.disclaimer}</p>
          {data.jurisdiction ? (
            <p className="bos-decl" style={{ marginTop: 6 }}>
              {data.jurisdiction}
            </p>
          ) : null}
        </div>
      </div>

      <div className="bos-thanks">
        <GoldFlourish />
        <div className="bos-thanks-text">THANK YOU FOR YOUR BUSINESS!</div>
        <GoldFlourish flip />
      </div>
    </div>
  );
}
