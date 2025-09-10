/* Date and Time Utility Functions */

// === DATE FORMATTING === */
export function formatDate(date, options = {}) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  try {
    return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
  } catch (error) {
    return dateObj.toLocaleDateString();
  }
}

export function formatTime(date, options = {}) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid Time';
  
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit'
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  try {
    return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
  } catch (error) {
    return dateObj.toLocaleTimeString();
  }
}

export function formatDateTime(date, options = {}) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid DateTime';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  try {
    return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
  } catch (error) {
    return dateObj.toLocaleString();
  }
}

// === RELATIVE TIME FORMATTING === */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  // Future dates
  if (diffInSeconds < 0) {
    return formatFutureTime(Math.abs(diffInSeconds));
  }
  
  // Past dates
  return formatPastTime(diffInSeconds);
}

function formatPastTime(seconds) {
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'just now';
}

function formatFutureTime(seconds) {
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `in ${count} ${interval.label}${count > 1 ? 's' : ''}`;
    }
  }
  
  return 'in a moment';
}

// === HUMAN READABLE DURATION === */
export function formatDuration(startDate, endDate = new Date()) {
  if (!startDate) return '';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid Duration';
  }
  
  const diffInSeconds = Math.floor(Math.abs(end - start) / 1000);
  
  const days = Math.floor(diffInSeconds / 86400);
  const hours = Math.floor((diffInSeconds % 86400) / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  const seconds = diffInSeconds % 60;
  
  const parts = [];
  
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
  
  if (parts.length === 0) return '0 seconds';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts.join(' and ');
  
  return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
}

// === DATE CALCULATIONS === */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addHours(date, hours) {
  const result = new Date(date);
  result.setTime(result.getTime() + (hours * 60 * 60 * 1000));
  return result;
}

export function addMinutes(date, minutes) {
  const result = new Date(date);
  result.setTime(result.getTime() + (minutes * 60 * 1000));
  return result;
}

export function subtractDays(date, days) {
  return addDays(date, -days);
}

export function subtractHours(date, hours) {
  return addHours(date, -hours);
}

export function subtractMinutes(date, minutes) {
  return addMinutes(date, -minutes);
}

// === DATE COMPARISONS === */
export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export function isBefore(date1, date2) {
  return new Date(date1) < new Date(date2);
}

export function isAfter(date1, date2) {
  return new Date(date1) > new Date(date2);
}

export function isBetween(date, startDate, endDate) {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return d >= start && d <= end;
}

export function isToday(date) {
  return isSameDay(date, new Date());
}

export function isYesterday(date) {
  const yesterday = subtractDays(new Date(), 1);
  return isSameDay(date, yesterday);
}

export function isTomorrow(date) {
  const tomorrow = addDays(new Date(), 1);
  return isSameDay(date, tomorrow);
}

export function isThisWeek(date) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return isBetween(date, startOfWeek, endOfWeek);
}

export function isThisMonth(date) {
  const now = new Date();
  const d = new Date(date);
  
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth();
}

export function isThisYear(date) {
  const now = new Date();
  const d = new Date(date);
  
  return d.getFullYear() === now.getFullYear();
}

// === DATE RANGES === */
export function getStartOfDay(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getEndOfDay(date = new Date()) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function getStartOfWeek(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day;
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getEndOfWeek(date = new Date()) {
  const result = getStartOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function getStartOfMonth(date = new Date()) {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getEndOfMonth(date = new Date()) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function getStartOfYear(date = new Date()) {
  const result = new Date(date);
  result.setMonth(0, 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getEndOfYear(date = new Date()) {
  const result = new Date(date);
  result.setMonth(11, 31);
  result.setHours(23, 59, 59, 999);
  return result;
}

// === DATE VALIDATION === */
export function isValidDate(date) {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

export function isWeekend(date) {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export function isWeekday(date) {
  return !isWeekend(date);
}

// === ISO STRING UTILITIES === */
export function toISODateString(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toISOString().split('T')[0];
}

export function toISOTimeString(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toISOString().split('T')[1].split('.')[0];
}

export function toISOString(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toISOString();
}

export function fromISOString(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
}

// === TIMEZONE UTILITIES === */
export function getTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getTimezoneOffset(date = new Date()) {
  return new Date(date).getTimezoneOffset();
}

export function convertToTimezone(date, timezone) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  } catch (error) {
    return formatDateTime(date);
  }
}

// === SMART DATE FORMATTING === */
export function smartFormatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  if (isToday(d)) {
    return `Today at ${formatTime(d)}`;
  }
  
  if (isYesterday(d)) {
    return `Yesterday at ${formatTime(d)}`;
  }
  
  if (isTomorrow(d)) {
    return `Tomorrow at ${formatTime(d)}`;
  }
  
  if (isThisWeek(d)) {
    return formatDateTime(d, {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  if (isThisYear(d)) {
    return formatDateTime(d, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return formatDateTime(d);
}

export function smartFormatDateShort(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid';
  
  if (isToday(d)) {
    return formatTime(d);
  }
  
  if (isYesterday(d)) {
    return 'Yesterday';
  }
  
  if (isThisWeek(d)) {
    return formatDate(d, { weekday: 'short' });
  }
  
  if (isThisYear(d)) {
    return formatDate(d, { month: 'short', day: 'numeric' });
  }
  
  return formatDate(d, { year: '2-digit', month: 'short' });
}

// === DATE PARSING === */
export function parseDate(input) {
  if (!input) return null;
  
  // Handle various input formats
  const formats = [
    // ISO formats
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    /^\d{4}-\d{2}-\d{2}/,
    
    // US formats
    /^\d{1,2}\/\d{1,2}\/\d{4}/,
    /^\d{1,2}-\d{1,2}-\d{4}/,
    
    // Natural language (basic)
    /^(today|tomorrow|yesterday)$/i
  ];
  
  // Try direct Date parsing first
  let date = new Date(input);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Handle natural language
  const lowerInput = input.toLowerCase().trim();
  if (lowerInput === 'today') return new Date();
  if (lowerInput === 'tomorrow') return addDays(new Date(), 1);
  if (lowerInput === 'yesterday') return subtractDays(new Date(), 1);
  
  return null;
}

// === TASK-SPECIFIC DATE UTILITIES === */
export function getTaskAge(createdAt) {
  if (!createdAt) return null;
  
  const created = new Date(createdAt);
  const now = new Date();
  
  if (isNaN(created.getTime())) return null;
  
  const diffInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Created today';
  if (diffInDays === 1) return 'Created yesterday';
  if (diffInDays < 7) return `Created ${diffInDays} days ago`;
  if (diffInDays < 30) return `Created ${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `Created ${Math.floor(diffInDays / 30)} months ago`;
  
  return `Created ${Math.floor(diffInDays / 365)} years ago`;
}

export function getTaskCompletionTime(createdAt, completedAt) {
  if (!createdAt || !completedAt) return null;
  
  const created = new Date(createdAt);
  const completed = new Date(completedAt);
  
  if (isNaN(created.getTime()) || isNaN(completed.getTime())) return null;
  
  return formatDuration(created, completed);
}

export function sortTasksByDate(tasks, field = 'createdAt', direction = 'desc') {
  return [...tasks].sort((a, b) => {
    const dateA = new Date(a[field]);
    const dateB = new Date(b[field]);
    
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;
    
    const comparison = dateA - dateB;
    return direction === 'desc' ? -comparison : comparison;
  });
}