export function formatDestinationPlace(place) {
  if (!place?.name) return ''

  const district = place.district?.name || place.district_name
  const province = place.district?.province?.name || place.province_city || place.destination?.province_city
  const area = [district, province].filter(Boolean).join(', ')

  return area ? `${place.name} — ${area}` : place.name
}

export function formatDestinationPlaceAddress(place) {
  return String(place?.address || '').trim()
}
