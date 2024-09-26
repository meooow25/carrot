/**
 * Utility to fetch data from the Codeforces API.
 */
export class Api {
  constructor(fetchFromContentScript) {
    // We fetch from the content script as a workaround for CF putting API
    // endpoints behind a Cloudflare human check. The content script should
    // have the necessary cookies to get through and receive a response.
    this.fetchFromContentScript = fetchFromContentScript;
  }

  async fetch(path, queryParams) {
    let queryParamList = [];
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        queryParamList.push([key, value]);
      }
    }
    return await this.fetchFromContentScript(path, queryParamList);
  }

  async contestList(gym = undefined) {
    return await this.fetch('contest.list', { gym });
  }

  async contestStandings(
    contestId, from = undefined, count = undefined, handles = undefined, room = undefined,
    showUnofficial = undefined) {
    return await this.fetch('contest.standings', {
      contestId,
      from,
      count,
      handles: handles && handles.length ? handles.join(';') : undefined,
      room,
      showUnofficial,
    });
  }

  async contestRatingChanges(contestId) {
    return await this.fetch('contest.ratingChanges', { contestId });
  }

  async userRatedList(activeOnly = undefined) {
    return await this.fetch('user.ratedList', { activeOnly });
  }
}
