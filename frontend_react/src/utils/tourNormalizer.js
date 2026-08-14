import { mediaUrl } from "./mediaUrl";

const domesticDestinationTerms = [
  "đà nẵng",
  "hội an",
  "phú quốc",
  "sa pa",
  "sapa",
  "hà nội",
  "hạ long",
  "nha trang",
  "đà lạt",
  "mũi né",
  "huế",
  "quảng ninh",
  "việt nam",
];

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getAvailableSlots(departure) {
  if (!departure) return 0;

  if (
    departure.available_slots !== undefined &&
    departure.available_slots !== null
  ) {
    return Math.max(0, toNumber(departure.available_slots));
  }

  return Math.max(
    0,
    toNumber(departure.total_slots) - toNumber(departure.booked_slots),
  );
}

export function getNextDeparture(tour) {
  const departures = Array.isArray(tour.departures) ? tour.departures : [];

  const availableDepartures = departures
    .filter((departure) => {
      const isOpen = !departure.status || ["open", "confirmed"].includes(departure.status);

      return isOpen && getAvailableSlots(departure) > 0;
    })
    .sort((a, b) => {
      const dateA = new Date(a.departure_date || 0).getTime();
      const dateB = new Date(b.departure_date || 0).getTime();

      return dateA - dateB;
    });

  return availableDepartures[0] || departures[0] || null;
}

export function getTourImage(tour, fallbackImage = "") {
  const itineraryImage = Array.isArray(tour.itineraries)
    ? tour.itineraries
      .flatMap((itinerary) =>
        Array.isArray(itinerary.images) ? itinerary.images : [],
      )
      .find(Boolean)
    : null;

  const imagePath =
    tour.thumbnail_url ||
    tour.image ||
    tour.thumbnail?.image_url ||
    tour.thumbnail?.url ||
    itineraryImage?.image_url ||
    itineraryImage?.url ||
    fallbackImage;

  return mediaUrl(imagePath);
}

export function isDomesticTour(tour) {
  const destinations = Array.isArray(tour.destinations)
    ? tour.destinations
    : [];

  const countries = [
    tour.destinationInfo?.country,
    tour.destination_info?.country,
    ...destinations.map((destination) => destination?.country),
  ]
    .filter(Boolean)
    .map((country) => String(country).trim().toLowerCase());

  const destinationText = [
    typeof tour.destination === "string" ? tour.destination : "",
    tour.destinationInfo?.name,
    tour.destination_info?.name,
    ...destinations.map((destination) => destination?.name),
    tour.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchesLegacyTerms = domesticDestinationTerms.some((term) =>
    destinationText.includes(term),
  );

  return (
    countries.includes("việt nam") ||
    countries.includes("viet nam") ||
    matchesLegacyTerms
  );
}

export function normalizeTour(tour) {
  const nextDeparture = getNextDeparture(tour);

  const destinations = Array.isArray(tour.destinations)
    ? tour.destinations
    : [];

  const rawDestination =
    tour.destination_info ||
    tour.destinationInfo ||
    (typeof tour.destination === "object" ? tour.destination : null) ||
    destinations[0] ||
    null;

  const destinationNames = destinations
    .map((destination) => destination?.name)
    .filter(Boolean);

  const categoryName =
    tour.category_name ||
    (typeof tour.category === "string" ? tour.category : null) ||
    tour.category_info?.name ||
    tour.category?.name ||
    "Chưa phân loại";

  const destinationName =
    tour.destination_name ||
    (typeof tour.destination === "string" ? tour.destination : null) ||
    (destinationNames.length ? destinationNames.join(" - ") : null) ||
    rawDestination?.name ||
    "Chưa cập nhật";

  const basePrice = toNumber(
    nextDeparture?.base_price ??
    tour.base_price ??
    tour.price?.base,
    0,
  );

  const discountValue =
    nextDeparture?.discount_price ?? tour.discount_price ?? tour.price?.discount ?? null;

  const discountPrice =
    discountValue !== null && discountValue !== undefined
      ? toNumber(discountValue)
      : null;

  const maxSlots = nextDeparture
    ? toNumber(nextDeparture.total_slots)
    : toNumber(tour.max_slots ?? tour.slots?.max);

  const availableSlots = nextDeparture
    ? getAvailableSlots(nextDeparture)
    : toNumber(tour.available_slots ?? tour.slots?.available);

  const duration =
    tour.duration ||
    (tour.duration_days
      ? `${tour.duration_days} ngày ${tour.duration_nights ?? 0} đêm`
      : "Đang cập nhật");

  return {
    ...tour,

    id: tour.id,
    title: tour.title || "Tour chưa có tên",
    slug: tour.slug || String(tour.id),
    summary: tour.summary || tour.description || "",
    image: getTourImage(tour),

    category: categoryName,
    travelStyle: tour.travel_style || tour.travelStyle,
    destination: destinationName,
    duration,

    price: {
      base: basePrice,
      discount: discountPrice,
    },

    slots: {
      max: maxSlots,
      available: availableSlots,
    },

    rating: {
      average: toNumber(
        tour.average_rating ?? tour.rating?.average,
        0,
      ),
      count: toNumber(
        tour.review_count ?? tour.rating?.count,
        0,
      ),
    },

    nextDeparture: nextDeparture
      ? {
        id: nextDeparture.id,
        departure_date: nextDeparture.departure_date,
        return_date: nextDeparture.return_date,
        price: toNumber(nextDeparture.price),
        base_price: toNumber(nextDeparture.base_price),
        discount_price:
          nextDeparture.discount_price !== null && nextDeparture.discount_price !== undefined
            ? toNumber(nextDeparture.discount_price)
            : null,
        total_slots: toNumber(nextDeparture.total_slots),
        booked_slots: toNumber(nextDeparture.booked_slots),
        available_slots: getAvailableSlots(nextDeparture),
        status: nextDeparture.status,
      }
      : null,

    nextDepartureDate:
      tour.next_departure_date ??
      nextDeparture?.departure_date ??
      null,

    minDeparturePrice:
      tour.min_departure_price !== undefined &&
        tour.min_departure_price !== null
        ? toNumber(tour.min_departure_price)
        : null,

    destinations,

    destinationInfo: {
      id: rawDestination?.id ?? null,
      name: destinationName,
      slug: rawDestination?.slug ?? "",
      province_city: rawDestination?.province_city ?? "",
      country: rawDestination?.country ?? "",
      description: rawDestination?.description ?? "",
      thumbnail_url: rawDestination?.thumbnail_url ?? "",
      status: rawDestination?.status ?? "",
    },
  };
}
