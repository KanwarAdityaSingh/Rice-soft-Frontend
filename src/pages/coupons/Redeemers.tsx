import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CouponPageHeader,
  CouponLoading,
  CouponEmpty,
  CouponPagination,
  PayoutStatusBadge,
} from '../../components/coupons/shared/CouponUi';
import { couponsAPI } from '../../services/coupons.api';
import type { Redeemer, Redemption } from '../../types/coupons';
import {
  formatRupees,
  formatDateTime,
  hasRedeemerBankDetails,
} from '../../utils/couponFormat';

function RedeemerBankCells({ redeemer }: { redeemer: Redeemer }) {
  return (
    <>
      <td>{redeemer.account_holder_name ?? '—'}</td>
      <td>{redeemer.bank_name ?? '—'}</td>
      <td className="font-mono text-xs">{redeemer.account_number ?? '—'}</td>
      <td className="font-mono text-xs">{redeemer.ifsc ?? '—'}</td>
    </>
  );
}

function RedeemerPayoutBlock({ redeemer }: { redeemer: Redeemer }) {
  const hasBank = hasRedeemerBankDetails(redeemer);

  return (
    <div className="mt-4 pt-4 border-t border-violet-100 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">UPI VPA</p>
        <p className="font-mono text-violet-800">{redeemer.upi_vpa ?? '—'}</p>
      </div>
      {hasBank ? (
        <>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Account holder</p>
            <p className="text-slate-800">{redeemer.account_holder_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Bank</p>
            <p className="text-slate-800">{redeemer.bank_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Account number</p>
            <p className="font-mono text-slate-800">{redeemer.account_number ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">IFSC</p>
            <p className="font-mono text-slate-800">{redeemer.ifsc ?? '—'}</p>
          </div>
        </>
      ) : (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Bank account</p>
          <p className="text-slate-500">—</p>
        </div>
      )}
    </div>
  );
}

export default function RedeemersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const phoneQuery = searchParams.get('phone') ?? '';
  const [phone, setPhone] = useState(phoneQuery);
  const [redeemer, setRedeemer] = useState<Redeemer | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [allRedeemers, setAllRedeemers] = useState<Redeemer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    setListLoading(true);
    couponsAPI.getAllRedeemers(page, 50).then((r) => {
      setAllRedeemers(r.rows);
      setTotal(r.total);
    }).finally(() => setListLoading(false));
  }, [page]);

  useEffect(() => {
    if (!phoneQuery) {
      setRedeemer(null);
      setRedemptions([]);
      return;
    }
    setPhone(phoneQuery);
    setLoading(true);
    couponsAPI
      .getRedeemerByPhone(phoneQuery)
      .then((r) => {
        setRedeemer(r.redeemer);
        setRedemptions(r.redemptions);
      })
      .catch(() => {
        setRedeemer(null);
        setRedemptions([]);
      })
      .finally(() => setLoading(false));
  }, [phoneQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) setSearchParams({ phone: phone.trim() });
  };

  return (
    <div className="coupon-page">
      <CouponPageHeader
        title="Redeemers"
        subtitle="Search customers by phone and view redemption history"
        badge="Customers"
      />

      <form onSubmit={handleSearch} className="coupon-card p-4 mb-4 flex gap-3">
        <input
          className="coupon-input max-w-xs"
          placeholder="10-digit phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="submit" className="coupon-btn-primary">Search</button>
      </form>

      {loading ? (
        <CouponLoading />
      ) : redeemer ? (
        <div className="space-y-6">
          <div className="coupon-card p-5">
            <h3 className="font-bold text-violet-800 text-lg">{redeemer.phone}</h3>
            {redeemer.name && <p className="text-violet-500">{redeemer.name}</p>}
            <div className="flex flex-wrap gap-6 mt-3 text-sm">
              <span><strong>{redeemer.total_redemptions}</strong> redemptions</span>
              <span><strong>{formatRupees(redeemer.lifetime_earned_paise)}</strong> lifetime earned</span>
              {redeemer.first_redeemed_at && (
                <span className="text-slate-500">First redeem {formatDateTime(redeemer.first_redeemed_at)}</span>
              )}
            </div>
            <RedeemerPayoutBlock redeemer={redeemer} />
          </div>

          <div className="coupon-card overflow-hidden">
            <table className="coupon-table w-full">
              <thead>
                <tr><th>Reference</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.redemption_id}>
                    <td>
                      <Link to={`/coupons/redemptions/${r.redemption_id}`} className="text-violet-700 font-semibold hover:underline">
                        {r.public_ref}
                      </Link>
                    </td>
                    <td>{formatRupees(r.total_amount_paise)}</td>
                    <td><PayoutStatusBadge status={r.payout_status} /></td>
                    <td className="text-violet-400 text-xs">{formatDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : phoneQuery ? (
        <CouponEmpty message="No redeemer found for this phone" />
      ) : null}

      <div className="mt-8">
        <h3 className="font-bold text-violet-800 mb-3">All redeemers</h3>
        <div className="coupon-card overflow-hidden">
          {listLoading ? (
            <CouponLoading />
          ) : (
            <>
              <table className="coupon-table w-full">
                <thead>
                  <tr>
                    <th>Phone</th>
                    <th>Name</th>
                    <th>UPI VPA</th>
                    <th>Account holder</th>
                    <th>Bank</th>
                    <th>Account no.</th>
                    <th>IFSC</th>
                    <th>Redemptions</th>
                    <th>Lifetime earned</th>
                    <th>Last redeemed</th>
                  </tr>
                </thead>
                <tbody>
                  {allRedeemers.map((r) => (
                    <tr key={r.redeemer_id ?? r.phone}>
                      <td>
                        <Link to={`/coupons/redeemers?phone=${r.phone}`} className="text-violet-700 font-semibold hover:underline">
                          {r.phone}
                        </Link>
                      </td>
                      <td>{r.name ?? '—'}</td>
                      <td className="font-mono text-xs text-violet-700">{r.upi_vpa ?? '—'}</td>
                      <RedeemerBankCells redeemer={r} />
                      <td>{r.total_redemptions}</td>
                      <td>{formatRupees(r.lifetime_earned_paise)}</td>
                      <td className="text-violet-400 text-xs whitespace-nowrap">{formatDateTime(r.last_redeemed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <CouponPagination page={page} total={total} limit={50} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
