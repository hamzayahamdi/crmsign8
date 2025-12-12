/**
 * Utility functions for cleaning and formatting file names
 */

/**
 * Cleans a filename by removing URL parameters, tokens, timestamps, and formatting it for display
 * @param fileName - The raw filename to clean
 * @param useTitle - Optional title to use instead of filename
 * @returns Clean, readable filename
 */
export function cleanFileName(fileName: string, useTitle?: string): string {
  // If a title is provided and it's meaningful, prefer it
  if (useTitle && useTitle.trim() && useTitle.trim() !== fileName) {
    return formatReadableName(useTitle)
  }

  if (!fileName) return 'devis.pdf'

  // Remove URL query parameters (everything after ?)
  let cleaned = fileName.split('?')[0]

  // Extract just the filename from path
  cleaned = cleaned.split('/').pop() || cleaned

  // Remove timestamp prefixes (e.g., "1765469105927_", "1234567890-")
  cleaned = cleaned.replace(/^\d+[-_]/, '')

  // Extract file extension (handle cases like .xlsx, .pdf, etc.)
  const lastDotIndex = cleaned.lastIndexOf('.')
  let extension = ''
  let nameWithoutExt = cleaned
  
  if (lastDotIndex > 0 && lastDotIndex < cleaned.length - 1) {
    extension = cleaned.substring(lastDotIndex + 1).toLowerCase()
    nameWithoutExt = cleaned.substring(0, lastDotIndex)
    
    // Remove query parameters from extension if present
    extension = extension.split('?')[0].split('&')[0]
  }

  // Format the name
  let formatted = formatReadableName(nameWithoutExt)

  // Add extension back if it exists and is valid (common file extensions)
  const validExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'dwg', 'dxf']
  if (extension && validExtensions.includes(extension)) {
    formatted = `${formatted}.${extension}`
  } else if (!extension || !validExtensions.includes(extension)) {
    // Try to detect extension from common patterns in the name
    const nameLower = formatted.toLowerCase()
    if (nameLower.includes('excel') || nameLower.includes('xls')) {
      formatted = `${formatted}.xlsx`
    } else if (nameLower.includes('word') || nameLower.includes('doc')) {
      formatted = `${formatted}.docx`
    } else if (!formatted.toLowerCase().endsWith('.pdf')) {
      // Default to .pdf if no extension found
      formatted = `${formatted}.pdf`
    }
  }

  // If empty after cleaning, use default
  if (!formatted || formatted.trim().length === 0 || formatted === '.') {
    return 'devis.pdf'
  }

  return formatted
}

/**
 * Formats a name string to be more readable
 * - Replaces underscores and multiple hyphens with spaces
 * - Capitalizes words properly
 * - Formats dates (DD-MM-YYYY or YYYY-MM-DD to readable format)
 * - Removes redundant spaces
 */
function formatReadableName(name: string): string {
  if (!name) return 'devis'

  // Replace underscores with spaces
  let formatted = name.replace(/_/g, ' ')

  // Replace multiple hyphens with single space (but preserve single hyphens in dates)
  formatted = formatted.replace(/-{2,}/g, ' ')

  // Format dates: DD-MM-YYYY or YYYY-MM-DD to "DD MMM YYYY"
  formatted = formatted.replace(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/g, (match, day, month, year) => {
    const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
    const monthIndex = parseInt(month) - 1
    const monthName = monthIndex >= 0 && monthIndex < 12 ? monthNames[monthIndex] : month
    return `${day} ${monthName} ${year}`
  })

  // Format dates: YYYY-MM-DD
  formatted = formatted.replace(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/g, (match, year, month, day) => {
    const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
    const monthIndex = parseInt(month) - 1
    const monthName = monthIndex >= 0 && monthIndex < 12 ? monthNames[monthIndex] : month
    return `${day} ${monthName} ${year}`
  })

  // Capitalize first letter of each word, but preserve common abbreviations and proper names
  formatted = formatted.split(' ').map((word, index) => {
    if (!word) return ''
    
    // Don't capitalize common abbreviations
    const abbreviations = ['mr', 'mme', 'm', 'excel', 'pdf', 'word', 'devis', 'vlM']
    const lowerWord = word.toLowerCase()
    
    // Preserve abbreviations as lowercase (except at start)
    if (abbreviations.includes(lowerWord) && index > 0) {
      return word.toLowerCase()
    }
    
    // If word looks like a name (starts with capital), preserve it
    if (word.length > 1 && word[0] === word[0].toUpperCase() && word.slice(1).toLowerCase() === word.slice(1)) {
      return word
    }
    
    // Capitalize first letter, lowercase the rest
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }).join(' ')

  // Remove multiple spaces
  formatted = formatted.replace(/\s+/g, ' ').trim()

  // Remove trailing incomplete characters, parentheses, or truncated text
  formatted = formatted.replace(/[(\[].*$/, '').trim()
  formatted = formatted.replace(/\s*-\s*$/, '').trim() // Remove trailing dashes
  formatted = formatted.replace(/\s+$/, '').trim() // Remove trailing spaces

  // If empty after cleaning, use default
  if (!formatted || formatted.length === 0) {
    return 'devis'
  }

  return formatted
}

/**
 * Gets a display name for a devis file
 * Prioritizes title, then cleaned filename
 */
export function getDevisDisplayName(devis: { title?: string; fichier?: string }): string {
  if (devis.title && devis.title.trim()) {
    return formatReadableName(devis.title)
  }
  
  if (devis.fichier) {
    return cleanFileName(devis.fichier)
  }
  
  return 'devis.pdf'
}

