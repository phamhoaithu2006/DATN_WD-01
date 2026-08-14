export const TOUR_ACTIVITY_OPTIONS = [
  { value: 'departure', label: 'Điểm xuất phát' },
  { value: 'transport', label: 'Di chuyển' },
  { value: 'sightseeing', label: 'Điểm tham quan' },
  { value: 'meal', label: 'Ăn uống' },
  { value: 'free_time', label: 'Thời gian tự do' },
  { value: 'return', label: 'Điểm trở về' },
]

export const TOUR_ACTIVITY_TYPE_LABELS = Object.fromEntries(
  TOUR_ACTIVITY_OPTIONS.map((option) => [option.value, option.label]),
)
