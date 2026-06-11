/**
 * Tableau responsive : vraie <table> sur desktop, cartes empilées sur mobile.
 * columns: [{ key, label, render?(row), className?, hideOnMobile? }]
 */
export default function DataTable({ columns, data, rowKey = "id", actions, onRowClick }) {
  const cell = (col, row) => (col.render ? col.render(row) : row[col.key] ?? "—");

  return (
    <div className="card overflow-hidden">
      {/* Desktop : tableau */}
      <div className="hidden sm:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right" />}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row[rowKey]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.03] ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 align-middle text-gray-200 ${col.className || ""}`}>
                    {cell(col, row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1.5 justify-end">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes */}
      <div className="sm:hidden divide-y divide-white/5">
        {data.map((row) => (
          <div
            key={row[rowKey]}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`p-4 space-y-2 ${onRowClick ? "active:bg-white/5" : ""}`}
          >
            {columns.filter((c) => !c.hideOnMobile).map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 shrink-0">{col.label}</span>
                <span className="text-sm text-gray-200 text-right min-w-0 break-words">{cell(col, row)}</span>
              </div>
            ))}
            {actions && (
              <div className="flex items-center justify-end gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
