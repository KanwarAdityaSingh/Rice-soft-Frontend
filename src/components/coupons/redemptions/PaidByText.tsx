export function PaidByText({
  userId,
  name,
  paymentReference,
  paidAt,
}: {
  userId?: string | null;
  name?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
}) {
  if (!userId && !name) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  return (
    <div className="min-w-0">
      <p className="text-sm text-violet-800 font-medium truncate" title={name ?? userId ?? undefined}>
        {name ?? (userId ? '…' : '—')}
      </p>
      {paymentReference?.trim() && (
        <p className="text-[10px] font-mono text-violet-400 truncate" title={paymentReference}>
          Ref: {paymentReference}
        </p>
      )}
      {paidAt && !paymentReference?.trim() && (
        <p className="text-[10px] text-violet-400">{paidAt}</p>
      )}
    </div>
  );
}
