// Date validation and formatting utilities

export const isValidDate = (date: any): boolean => {
  if (!date) return false;
  
  try {
    const d = new Date(date);
    return !isNaN(d.getTime());
  } catch {
    return false;
  }
};

export const safeFormatTime = (date: string | number | Date): string => {
  if (!isValidDate(date)) {
    console.warn('Invalid date provided to safeFormatTime:', date);
    return '--:--';
  }
  
  try {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    console.warn('Error formatting time:', error, 'Input:', date);
    return '--:--';
  }
};

export const safeFormatDate = (date: string | number | Date): string => {
  if (!isValidDate(date)) {
    console.warn('Invalid date provided to safeFormatDate:', date);
    return 'Invalid Date';
  }
  
  try {
    const d = new Date(date);
    const now = new Date();

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    if (isYesterday) {
      return "Yesterday";
    }

    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    }

    return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch (error) {
    console.warn('Error formatting date:', error, 'Input:', date);
    return 'Invalid Date';
  }
};

export const safeFormatDateHeader = (dateString: string): string => {
  if (!isValidDate(dateString)) {
    console.warn('Invalid date provided to safeFormatDateHeader:', dateString);
    return 'Invalid Date';
  }
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    const isToday = 
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = 
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
    
    if (isToday) {
      return 'Today';
    }
    
    if (isYesterday) {
      return 'Yesterday';
    }
    
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }
    
    return date.toLocaleDateString([], { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  } catch (error) {
    console.warn('Error formatting date for header:', error, 'Input:', dateString);
    return 'Invalid Date';
  }
};
