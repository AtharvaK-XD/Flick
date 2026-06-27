export interface SM2Result {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: Date;
}

/**
 * SM-2 Spaced Repetition Algorithm
 * 
 * @param quality Rating of retrieval quality (0: Again, 1: Hard, 2: Good, 3: Easy)
 * @param repetitions Number of times the card has been successfully reviewed in a row
 * @param easeFactor The difficulty multiplier for the card interval
 * @param interval Current review interval in days
 */
export function sm2(
  quality: 0 | 1 | 2 | 3,
  repetitions: number,
  easeFactor: number,
  interval: number
): SM2Result {
  let newInterval: number;
  
  // Calculate new Ease Factor:
  // Since quality is 0..3, we subtract from 3 (max score)
  let newEaseFactor = easeFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
  newEaseFactor = Math.max(1.3, newEaseFactor);

  if (quality < 1) {
    // If quality is 0 (Again), reset intervals and repetitions
    newInterval = 1;
    repetitions = 0;
  } else if (repetitions === 0) {
    newInterval = 1;
    repetitions = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
    repetitions = 2;
  } else {
    newInterval = Math.round(interval * newEaseFactor);
    repetitions += 1;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions,
    nextReview,
  };
}
