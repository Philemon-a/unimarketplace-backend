/**
 * Validates if an email address ends with .edu domain
 * @param email - The email address to validate
 * @returns boolean - true if email ends with .edu, false otherwise
 */
export const isEduEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Convert to lowercase for case-insensitive comparison
  const emailLower = email.toLowerCase().trim();
  
  // Check if email ends with .edu
  return emailLower.endsWith('.edu');
};

/**
 * Extracts the college/university name from an .edu email address
 * @param email - The .edu email address
 * @returns string - The college name or empty string if invalid
 */
export const extractCollegeName = (email: string): string => {
  if (!isEduEmail(email)) {
    return '';
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split('@')[1];
  
  if (!domain) {
    return '';
  }

  // Extract university name from domain
  // Example: john@caldwell.edu -> caldwell
  const collegeName = domain.replace('.edu', '').split('.').pop() || '';
  
  // Capitalize first letter
  return collegeName.charAt(0).toUpperCase() + collegeName.slice(1);
};

/**
 * Validates email format using regex
 * @param email - The email address to validate
 * @returns boolean - true if email format is valid
 */
export const isValidEmailFormat = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
