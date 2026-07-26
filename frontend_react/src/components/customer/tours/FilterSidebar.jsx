import { useState } from "react";
import { useLocale } from "../../../contexts/LocaleContext";

const RATING_LEVELS = [5, 4, 3, 2];

/**
 * Thanh trượt giá 2 đầu kéo: hai input range chồng lên nhau,
 * track tô màu đoạn được chọn. Giá trị draft do cha giữ (debounce ở cha).
 */
function PriceRangeSlider({ bounds, value, onChange }) {
  const { formatCurrency } = useLocale();

  const min = bounds.min;
  const max = bounds.max;
  const step = Math.max(100000, Math.round((max - min) / 100 / 100000) * 100000);

  const currentMin = value.min ?? min;
  const currentMax = value.max ?? max;

  const percent = (v) => (max === min ? 0 : ((v - min) / (max - min)) * 100);

  const handleMin = (raw) => {
    const next = Math.min(Number(raw), currentMax - step);
    onChange({ min: Math.max(min, next), max: currentMax });
  };

  const handleMax = (raw) => {
    const next = Math.max(Number(raw), currentMin + step);
    onChange({ min: currentMin, max: Math.min(max, next) });
  };

  return (
    <div className="vg-price-slider">
      <div className="vg-price-slider-track">
        <div
          className="vg-price-slider-fill"
          style={{
            left: `${percent(currentMin)}%`,
            width: `${percent(currentMax) - percent(currentMin)}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentMin}
          aria-label="Giá tối thiểu"
          onChange={(event) => handleMin(event.target.value)}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentMax}
          aria-label="Giá tối đa"
          onChange={(event) => handleMax(event.target.value)}
        />
      </div>
      <div className="vg-price-slider-values">
        <span>{formatCurrency(currentMin)}</span>
        <span>{formatCurrency(currentMax)}</span>
      </div>
    </div>
  );
}

function CheckboxList({ items, selectedIds, onToggle, searchable }) {
  const [search, setSearch] = useState("");

  const visibleItems = searchable
    ? items.filter((item) =>
      item.name.toLowerCase().includes(search.trim().toLowerCase()),
    )
    : items;

  return (
    <div className="vg-filter-check-list">
      {searchable ? (
        <input
          className="vg-filter-search"
          type="search"
          value={search}
          placeholder="Tìm nhanh..."
          onChange={(event) => setSearch(event.target.value)}
        />
      ) : null}

      {visibleItems.map((item) => (
        <label
          key={item.id}
          className={`vg-filter-check${item.tours_count === 0 ? " muted" : ""}`}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(String(item.id))}
            onChange={() => onToggle(String(item.id))}
          />
          <span>{item.name}</span>
          <em>{item.tours_count}</em>
        </label>
      ))}

      {visibleItems.length === 0 ? (
        <p className="vg-filter-empty">Không có lựa chọn phù hợp.</p>
      ) : null}
    </div>
  );
}

/**
 * Sidebar bộ lọc tour nâng cao.
 * - options: dữ liệu từ GET /api/tours/filter-options
 * - params: trạng thái lọc hiện tại (đã parse từ URL)
 * - priceDraft + onPriceDraftChange: giá trị slider đang kéo (cha debounce rồi mới ghi URL)
 * - onChange(patch): ghi các thay đổi còn lại vào URL ngay lập tức
 */
function FilterSidebar({
  options,
  params,
  priceDraft,
  onPriceDraftChange,
  onChange,
  onClearAll,
  activeCount,
  onClose,
}) {
  const priceBounds = {
    min: Math.floor((options?.price?.min ?? 0) / 100000) * 100000,
    max: Math.ceil((options?.price?.max ?? 50000000) / 100000) * 100000 || 50000000,
  };

  const toggleInList = (key, id) => {
    const current = params[key];
    const next = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];

    onChange({ [key]: next });
  };

  return (
    <aside className="vg-filter vg-filter-advanced">
      <div className="vg-filter-head">
        <h2>Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ""}</h2>
        {activeCount > 0 ? (
          <button type="button" className="vg-filter-clear" onClick={onClearAll}>
            Xóa tất cả
          </button>
        ) : null}
      </div>

      <h3>Khoảng giá</h3>
      <PriceRangeSlider
        bounds={priceBounds}
        value={priceDraft}
        onChange={onPriceDraftChange}
      />

      {options?.destinations?.length ? (
        <>
          <h3>Điểm đến</h3>
          <CheckboxList
            items={options.destinations}
            selectedIds={params.destinations}
            searchable={options.destinations.length > 10}
            onToggle={(id) => toggleInList("destinations", id)}
          />
        </>
      ) : null}

      <h3>Thời lượng</h3>
      <div className="vg-filter-check-list">
        {(options?.durations || [
          { value: "1-3", label: "1–3 ngày" },
          { value: "4-7", label: "4–7 ngày" },
          { value: "8+", label: "8+ ngày" },
        ]).map((bucket) => (
          <label
            key={bucket.value}
            className={`vg-filter-check${bucket.tours_count === 0 ? " muted" : ""}`}
          >
            <input
              type="checkbox"
              checked={params.duration.includes(bucket.value)}
              onChange={() => toggleInList("duration", bucket.value)}
            />
            <span>{bucket.label}</span>
            {bucket.tours_count !== undefined ? <em>{bucket.tours_count}</em> : null}
          </label>
        ))}
      </div>

      <h3>Ngày khởi hành</h3>
      <div className="vg-filter-dates">
        <label>
          Từ
          <input
            type="date"
            value={params.date_from}
            onChange={(event) => {
              const value = event.target.value;
              const patch = { date_from: value };

              if (value && params.date_to && params.date_to < value) {
                patch.date_to = "";
              }

              onChange(patch);
            }}
          />
        </label>
        <label>
          Đến
          <input
            type="date"
            value={params.date_to}
            min={params.date_from || undefined}
            onChange={(event) => onChange({ date_to: event.target.value })}
          />
        </label>
      </div>

      {options?.categories?.length ? (
        <>
          <h3>Loại tour</h3>
          <CheckboxList
            items={options.categories}
            selectedIds={params.categories}
            searchable={options.categories.length > 10}
            onToggle={(id) => toggleInList("categories", id)}
          />
        </>
      ) : null}

      <h3>Đánh giá</h3>
      <div className="vg-filter-check-list">
        {RATING_LEVELS.map((level) => (
          <label key={level} className="vg-filter-check">
            <input
              type="radio"
              name="rating_min"
              checked={params.rating_min === String(level)}
              onChange={() =>
                onChange({
                  rating_min: params.rating_min === String(level) ? "" : String(level),
                })
              }
              onClick={() => {
                if (params.rating_min === String(level)) {
                  onChange({ rating_min: "" });
                }
              }}
            />
            <span>
              {"★".repeat(level)}
              {" trở lên"}
            </span>
          </label>
        ))}
      </div>

      {onClose ? (
        <button type="button" className="vg-filter-apply" onClick={onClose}>
          Xem kết quả
        </button>
      ) : null}
    </aside>
  );
}

export default FilterSidebar;
