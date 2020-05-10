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
  if (json.status == 'OK') {
    return json.result;
  }
  // If the API responds with an error, the comment field would contain the reason.
  // But the API server is not setting the CORS header Access-Control-Allow-Origin on failure,
  // and the fetch() call fails with a NetworkError.
  // Keeping the code below for the sake of correctness.
  // A workaround would be to make the contest script make the call as it is same origin.
  throw new Error(json.comment);
}

const contest = {
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
      showUnofficial: showUnofficial
    });
  },

  async ratingChanges(contestId) {
    return await apiFetch('contest.ratingChanges', { contestId: contestId });
  },
}

const user = {
  async ratedList(activeOnly) {
    return await apiFetch('user.ratedList', { activeOnly: activeOnly });
  },
};

export { contest, user };
