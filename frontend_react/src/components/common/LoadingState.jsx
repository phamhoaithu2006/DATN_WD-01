/** Trạng thái tải dữ liệu dùng thống nhất cho các màn hình và khu vực nội dung. */
export default function LoadingState({
  label = 'Đang tải dữ liệu...',
  compact = false,
  className = '',
}) {
  return (
    <div
      className={`vg-loading-state${compact ? ' vg-loading-state--compact' : ''} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className="vg-loading-state__spinner" aria-hidden="true" />
      <span className="vg-loading-state__label">{label}</span>
      {!compact && (
        <span className="vg-loading-state__lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  );
}
