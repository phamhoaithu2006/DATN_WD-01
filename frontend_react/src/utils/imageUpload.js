export const DESTINATION_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

const DESTINATION_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const DESTINATION_IMAGE_MAX_SIZE = 5 * 1024 * 1024

export const validateDestinationImage = (file) => {
  if (!file) return ''

  if (!DESTINATION_IMAGE_TYPES.has(file.type)) {
    return 'Ảnh phải có định dạng JPG, JPEG, PNG hoặc WebP.'
  }

  if (file.size > DESTINATION_IMAGE_MAX_SIZE) {
    return 'Ảnh không được vượt quá 5 MB.'
  }

  return ''
}
