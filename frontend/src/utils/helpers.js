export function generateWhatsAppLink(phone, message = '') {
  if (!phone) return null;

  let cleaned = phone.replace(/\D/g, '');

  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }

  const encodedMessage = encodeURIComponent(message || '');
  return `https://wa.me/${cleaned}?text=${encodedMessage}`;
}

export function isValidWebsite(url) {
  if (!url) return false;

  const lowerUrl = url.toLowerCase();

  // Exclude social media links
  if (
    lowerUrl.includes('instagram.com') ||
    lowerUrl.includes('facebook.com') ||
    lowerUrl.includes('whatsapp.com') ||
    lowerUrl.includes('wa.me') ||
    lowerUrl.includes('fb.me') ||
    lowerUrl.includes('fbme') ||
    lowerUrl.includes('m.facebook') ||
    lowerUrl.includes('messenger.com')
  ) {
    return false;
  }

  return true;
}
