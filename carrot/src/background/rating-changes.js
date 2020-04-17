const MAX_CONTESTS = 15;

/**
 * In memory cache of rating changes that holds rating changes for at most MAX_CONTESTS contests.
 */
class RatingChanges {
  constructor(api) {
    this.api = api;
    this.contestIds = [];
    this.ratingChangesMap = {};
  }

  hasCached(contestId) {
    return contestId in this.ratingChangesMap;
  }

  async fetch(contestId) {
    if (this.hasCached(contestId)) {
      return this.ratingChangesMap[contestId];
    }
    try {
      const ratingChanges = await this.api.contest.ratingChanges(contestId);
      // Rating changes are empty for some unrated contests or contests in hack phase.
      // Ideally there would be a specific error response.
      if (ratingChanges.length) {
        this.contestIds.push(contestId);
        this.ratingChangesMap[contestId] = ratingChanges;
        if (this.contestIds.length > MAX_CONTESTS) {
          delete this.ratingChangesMap[this.contestIds.shift()];
        }
      }
      return ratingChanges;
    } catch (er) {
      // There is no way to determine if the contest is running or unrated or some other error
      // occured, because the error is always a CORS network error. See cf-api.js for details.
      // TODO: Fix this when CF API is fixed.
      throw er;
    }
  }
}

export { RatingChanges };
