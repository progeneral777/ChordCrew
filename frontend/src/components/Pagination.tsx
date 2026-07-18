interface PaginationProps {
  page: number // 0-based
  pageCount: number
  onChange: (page: number) => void
}

/** 簡單的上一頁/下一頁分頁列;只有一頁時不顯示。 */
export default function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-center gap-4 mt-4 text-sm">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 0}
        className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
      >
        上一頁
      </button>
      <span className="text-gray-500">
        第 {page + 1} / {pageCount} 頁
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount - 1}
        className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
      >
        下一頁
      </button>
    </div>
  )
}
