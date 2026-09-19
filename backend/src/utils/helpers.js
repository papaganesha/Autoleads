/**
 * Generate a WhatsApp click-to-chat link with a cleaned Brazilian phone number.
 * Strips all non-digit characters, ensures the country code 55 prefix is present,
 * and URI-encodes the message.
 */
function generateWhatsAppLink(phone, message) {
  if (!phone) return null;

  let cleaned = phone.replace(/\D/g, '');

  // If the number doesn't start with 55 (Brazil country code), prepend it
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }

  const encodedMessage = encodeURIComponent(message || '');
  return `https://wa.me/${cleaned}?text=${encodedMessage}`;
}

/**
 * Promise-based delay utility.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  generateWhatsAppLink,
  sleep,
};
