import { useState } from "react";
import { useLocale } from "../../../contexts/LocaleContext";
import Icon from "../Icon";

const RATING_LEVELS = [5, 4, 3, 2];

/**
 * Thanh trượt giá 2 đầu kéo + Dải mô phỏng mật độ giá (Histogram visual track)
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

  // 8 cột histogram mô phỏng dải phân bổ giá
  const histogramBars = [30, 65, 90, 100, 75, 50, 35, 20];

  return (
    <div className="vg-price-slider">
      {/* Histogram visual */}
      <div className="vg-price-histogram">
        {histogramBars.map((heightPercent, idx) => {
          const barMinPercent = (idx / histogramBars.length) * 100;
          const barMaxPercent = ((idx + 1) / histogramBars.length) * 100;
          const isSelected =
            barMaxPercent >= percent(currentMin) && barMinPercent <= percent(currentMax);

          return (
            <div
              key={idx}
              className={`vg-histogram-bar ${isSelected ? "is-selected" : ""}`}
              style={{ height: `${heightPercent}%` }}
            />
          );
        })}
      </div>

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
        <div className="vg-price-badge min">
          <small>Từ</small>
          <strong>{formatCurrency(currentMin)}</strong>
        </div>
        <div className="vg-price-badge max">
          <small>Đến</small>
          <strong>{formatCurrency(currentMax)}</strong>
        </div>
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
        <div className="vg-filter-search-box">
          <Icon name="search" size={14} />
          <input
            className="vg-filter-search"
            type="search"
            value={search}
            placeholder="Tìm nhanh..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      ) : null}

      <div className="vg-filter-check-scroll">
        {visibleItems.map((item) => {
          const checked = selectedIds.includes(String(item.id));
          return (
            <label
              key={item.id}
              className={`vg-filter-check${item.tours_count === 0 ? " muted" : ""}${
                checked ? " is-checked" : ""
              }`}
            >
              <input
                type="checkbox"
                hidden
                checked={checked}
                onChange={() => onToggle(String(item.id))}
              />
              <span className="vg-filter-checkbox-custom" />
              <span className="vg-filter-check-label">{item.name}</span>
              {item.tours_count !== undefined ? (
                <em className="vg-filter-count-badge">{item.tours_count}</em>
              ) : null}
            </label>
          );
        })}

        {visibleItems.length === 0 ? (
          <p className="vg-filter-empty">Không có lựa chọn phù hợp.</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Khối Accordion xếp chồng với nút đóng/mở mượt mà
 */
function FilterAccordion({ title, icon, activeBadgeCount, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`vg-filter-accordion ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="vg-filter-accordion-header"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="vg-filter-accordion-title">
          {icon ? <Icon name={icon} size={15} /> : null}
          <span>{title}</span>
          {activeBadgeCount > 0 ? (
            <span className="vg-filter-active-dot">{activeBadgeCount}</span>
          ) : null}
        </span>
        <span className={`vg-filter-accordion-chevron ${isOpen ? "open" : ""}`}>
          ›
        </span>
      </button>
      {isOpen ? <div className="vg-filter-accordion-body">{children}</div> : null}
    </div>
  );
}

/**
 * Sidebar bộ lọc tour nâng cao.
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
        <div className="vg-filter-head-title">
          <h2>Bộ lọc tour</h2>
          {activeCount > 0 ? (
            <span className="vg-filter-count-chip">{activeCount} đang chọn</span>
          ) : null}
        </div>
        {activeCount > 0 ? (
          <button type="button" className="vg-filter-clear" onClick={onClearAll}>
            Xóa tất cả
          </button>
        ) : null}
      </div>

      {/* Khoảng giá */}
      <FilterAccordion
        title="Khoảng giá"
        icon="wallet"
        activeBadgeCount={params.price_min || params.price_max ? 1 : 0}
        defaultOpen={true}
      >
        <PriceRangeSlider
          bounds={priceBounds}
          value={priceDraft}
          onChange={onPriceDraftChange}
        />
      </FilterAccordion>

      {/* Điểm đến */}
      {options?.destinations?.length ? (
        <FilterAccordion
          title="Điểm đến"
          icon="mapPin"
          activeBadgeCount={params.destinations.length}
          defaultOpen={true}
        >
          <CheckboxList
            items={options.destinations}
            selectedIds={params.destinations}
            searchable={options.destinations.length > 8}
            onToggle={(id) => toggleInList("destinations", id)}
          />
        </FilterAccordion>
      ) : null}

      {/* Thời lượng */}
      <FilterAccordion
        title="Thời lượng chuyến đi"
        icon="clock"
        activeBadgeCount={params.duration.length}
        defaultOpen={true}
      >
        <div className="vg-filter-check-list">
          {(options?.durations || [
            { value: "1-3", label: "1–3 ngày" },
            { value: "4-7", label: "4–7 ngày" },
            { value: "8+", label: "8+ ngày" },
          ]).map((bucket) => {
            const checked = params.duration.includes(bucket.value);
            return (
              <label
                key={bucket.value}
                className={`vg-filter-check${
                  bucket.tours_count === 0 ? " muted" : ""
                }${checked ? " is-checked" : ""}`}
              >
                <input
                  type="checkbox"
                  hidden
                  checked={checked}
                  onChange={() => toggleInList("duration", bucket.value)}
                />
                <span className="vg-filter-checkbox-custom" />
                <span className="vg-filter-check-label">{bucket.label}</span>
                {bucket.tours_count !== undefined ? (
                  <em className="vg-filter-count-badge">{bucket.tours_count}</em>
                ) : null}
              </label>
            );
          })}
        </div>
      </FilterAccordion>

      {/* Ngày khởi hành */}
      <FilterAccordion
        title="Ngày khởi hành"
        icon="calendar"
        activeBadgeCount={params.date_from || params.date_to ? 1 : 0}
        defaultOpen={false}
      >
        <div className="vg-filter-dates">
          <label>
            <span>Từ ngày</span>
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
            <span>Đến ngày</span>
            <input
              type="date"
              value={params.date_to}
              min={params.date_from || undefined}
              onChange={(event) => onChange({ date_to: event.target.value })}
            />
          </label>
        </div>
      </FilterAccordion>

      {/* Loại tour */}
      {options?.categories?.length ? (
        <FilterAccordion
          title="Loại tour & Chủ đề"
          icon="layers"
          activeBadgeCount={params.categories.length}
          defaultOpen={false}
        >
          <CheckboxList
            items={options.categories}
            selectedIds={params.categories}
            searchable={options.categories.length > 8}
            onToggle={(id) => toggleInList("categories", id)}
          />
        </FilterAccordion>
      ) : null}

      {/* Đánh giá sao */}
      <FilterAccordion
        title="Đánh giá từ khách hàng"
        icon="star"
        activeBadgeCount={params.rating_min ? 1 : 0}
        defaultOpen={false}
      >
        <div className="vg-filter-rating-list">
          {RATING_LEVELS.map((level) => {
            const isSelected = params.rating_min === String(level);
            return (
              <button
                key={level}
                type="button"
                className={`vg-filter-rating-btn ${isSelected ? "is-selected" : ""}`}
                onClick={() =>
                  onChange({
                    rating_min: isSelected ? "" : String(level),
                  })
                }
              >
                <div className="vg-rating-stars">
                  {"★".repeat(level)}
                  {"☆".repeat(5 - level)}
                </div>
                <span>từ {level} sao trở lên</span>
              </button>
            );
          })}
        </div>
      </FilterAccordion>

      {onClose ? (
        <div className="vg-filter-drawer-actions">
          <button type="button" className="vg-filter-apply" onClick={onClose}>
            Xem kết quả tour ({activeCount ? `${activeCount} bộ lọc` : "tất cả"})
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export default FilterSidebar;
