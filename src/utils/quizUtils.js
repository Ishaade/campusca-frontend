// Utility functions for quiz scheduling and availability

/**
 * Check if a quiz is currently available based on its schedule
 * @param {Object} quiz - The quiz object
 * @returns {Object} - { isAvailable: boolean, status: string, message: string }
 */
export const checkQuizAvailability = (quiz) => {
  const now = new Date();
  
  // If no schedule is set, quiz is always available
  if (!quiz.scheduledStart && !quiz.scheduledEnd) {
    return {
      isAvailable: true,
      status: 'available',
      message: 'Available now'
    };
  }
  
  const startDate = quiz.scheduledStart ? new Date(quiz.scheduledStart) : null;
  const endDate = quiz.scheduledEnd ? new Date(quiz.scheduledEnd) : null;
  
  // Quiz hasn't started yet
  if (startDate && now < startDate) {
    const timeUntilStart = Math.floor((startDate - now) / 1000 / 60); // minutes
    const hoursUntilStart = Math.floor(timeUntilStart / 60);
    const minutesUntilStart = timeUntilStart % 60;
    
    return {
      isAvailable: false,
      status: 'not_started',
      message: `Quiz will start on ${startDate.toLocaleString()}`,
      timeUntilStart: timeUntilStart,
      hoursUntilStart: hoursUntilStart,
      minutesUntilStart: minutesUntilStart
    };
  }
  
  // Quiz has ended
  if (endDate && now > endDate) {
    return {
      isAvailable: false,
      status: 'ended',
      message: `Quiz ended on ${endDate.toLocaleString()}`
    };
  }
  
  // Quiz is currently available
  if ((!startDate || now >= startDate) && (!endDate || now <= endDate)) {
    if (endDate) {
      const timeUntilEnd = Math.floor((endDate - now) / 1000 / 60); // minutes
      const hoursUntilEnd = Math.floor(timeUntilEnd / 60);
      const minutesUntilEnd = timeUntilEnd % 60;
      
      return {
        isAvailable: true,
        status: 'available',
        message: `Available until ${endDate.toLocaleString()}`,
        timeUntilEnd: timeUntilEnd,
        hoursUntilEnd: hoursUntilEnd,
        minutesUntilEnd: minutesUntilEnd
      };
    }
    
    return {
      isAvailable: true,
      status: 'available',
      message: 'Available now'
    };
  }
  
  return {
    isAvailable: false,
    status: 'unavailable',
    message: 'Quiz is not available'
  };
};

/**
 * Check if a quiz has ended
 * @param {Object} quiz - The quiz object
 * @returns {boolean}
 */
export const isQuizEnded = (quiz) => {
  if (!quiz.scheduledEnd) return false;
  return new Date() > new Date(quiz.scheduledEnd);
};

/**
 * Check if a quiz has started
 * @param {Object} quiz - The quiz object
 * @returns {boolean}
 */
export const isQuizStarted = (quiz) => {
  if (!quiz.scheduledStart) return true;
  return new Date() >= new Date(quiz.scheduledStart);
};





