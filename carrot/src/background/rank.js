/**
 * Encapsulates a Codeforces rank.
 */
export class Rank {
  constructor(name, abbr, low, high, colorClass) {
    this.name = name;
    this.abbr = abbr;
    this.low = low;
    this.high = high;
    this.colorClass = colorClass;
  }

  static forRating(rating) {
    if (rating == null) {
      return Rank.UNRATED;
    }
    for (const rank of Rank.RATED) {
      if (rating < rank.high) {
        return rank;
      }
    }
    return Rank.RATED[Rank.RATED.length - 1];
  }
}

Rank.UNRATED = new Rank('Unrated', 'U', -Infinity, null);
Rank.RATED = [
  new Rank('Newbie', 'N', -Infinity, 1200, 'user-gray'),
  new Rank('Pupil', 'P', 1200, 1400, 'user-green'),
  new Rank('Specialist', 'S', 1400, 1600, 'user-cyan'),
  new Rank('Expert', 'E', 1600, 1900, 'user-blue'),
  new Rank('Candidate Master', 'CM', 1900, 2100, 'user-violet'),
  new Rank('Master', 'M', 2100, 2300, 'user-orange'),
  new Rank('International Master', 'IM', 2300, 2400, 'user-orange'),
  new Rank('Grandmaster', 'GM', 2400, 2600, 'user-red'),
  new Rank('International Grandmaster', 'IGM', 2600, 3000, 'user-red'),
  new Rank('Legendary Grandmaster', 'LGM', 3000, 4000, 'user-legendary'),
  new Rank('Tourist', 'T', 4000, Infinity, 'user-4000'),
];
