/**
 * Utility to fetch data from the Codeforces API.
 */

const API_URL_PREFIX = 'https://codeforces.com/api/';

async function apiFetch(path, queryParams) {
  let url = new URL(API_URL_PREFIX + path);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value != null) {
      url.searchParams.append(key, value);
    }
  }
  const resp = await fetch(url);
  const json = await resp.json();
  if (json.status === 'OK') {
    return json.result;
  }
  throw new Error(json.comment);
}

export const contest = {
  async list(gym) {
    return await apiFetch('contest.list', { gym: gym });
  },

  async standings(contestId, from, count, handles, room, showUnofficial) {
    return await apiFetch('contest.standings', {
      contestId: contestId,
      from: from,
      count: count,
      handles: handles && handles.length ? handles.join(';') : undefined,
      room: room,
      showUnofficial: showUnofficial,
    });
  },

  async ratingChanges(contestId) {
    return await apiFetch('contest.ratingChanges', { contestId: contestId });
  },
};

export const user = {
  async ratedList(activeOnly) {
    return await apiFetch('user.ratedList', { activeOnly: activeOnly });
  },
};
