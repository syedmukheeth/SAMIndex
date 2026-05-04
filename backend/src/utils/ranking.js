/**
 * Calculates the SamIndex score for a user
 * Formula: score = (followers * 2) + (repoStars * 1.5)
 * 
 * @param {number} followers - Number of followers
 * @param {number} repoStars - Total stars across all public repositories
 * @returns {number} The calculated score
 */
exports.calculateUserScore = (followers = 0, repoStars = 0) => {
  return (followers * 2) + (repoStars * 1.5);
};
