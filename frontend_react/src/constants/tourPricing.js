export const STANDARD_AGE_PRICING_RULES = [
  {
    label: 'Em bé dưới 2 tuổi',
    min_age: 0,
    max_age: 1,
    pricing_type: 'percentage',
    price_value: 0,
    sort_order: 0,
    is_active: true,
  },
  {
    label: 'Trẻ em 2-11',
    min_age: 2,
    max_age: 11,
    pricing_type: 'percentage',
    price_value: 70,
    sort_order: 1,
    is_active: true,
  },
  {
    label: 'Người lớn từ 12 tuổi',
    min_age: 12,
    max_age: 120,
    pricing_type: 'percentage',
    price_value: 100,
    sort_order: 2,
    is_active: true,
  },
]
