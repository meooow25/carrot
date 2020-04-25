const PING_INTERVAL = 3 * 60 * 1000;  // 3 minutes
const DELTA_SPAN_CLASS = 'delta-span';
const RANK_UP_TD_CLASS = 'rank-up-td';

const Unicode = {
  BLACK_CURVED_RIGHTWARDS_AND_UPWARDS_ARROW: '\u2BAD',
  GREEK_CAPITAL_DELTA: '\u0394',
  SLANTED_NORTH_ARROW_WITH_HORIZONTAL_TAIL: '\u2B5C',
  BACKSLANTED_SOUTH_ARROW_WITH_HORIZONTAL_TAIL: '\u2B5D',
};

let PREDICT_TEXT;

function setupDeltaColumn(resp) {
  let deltaColTitle, rankUpColWidth, rankUpColTitle;
  switch (resp.type) {
    case 'FINAL':
      deltaColTitle = 'Final rating change';
      rankUpColWidth = '7em';
      rankUpColTitle = 'Rank change';
      break;
    case 'PREDICTED':
      deltaColTitle = 'Predicted rating change';
      rankUpColWidth = '8em';
      rankUpColTitle = 'Rating change for rank up';
      break;
    default:
      console.error('Unknown prediction type ' + resp.type);
  }

  const rows = Array.from(document.querySelectorAll('table.standings tbody tr'));
  for (const [idx, row] of rows.entries()) {
    row.querySelector('th:last-child, td:last-child').classList.remove('right');
    let deltaCell, rankUpCell;
    if (idx == 0) {
      deltaCell = document.createElement('th');
      deltaCell.classList.add('top');
      deltaCell.style.width = '5em';
      {
        const span = document.createElement('span');
        span.textContent = Unicode.GREEK_CAPITAL_DELTA;
        span.title = deltaColTitle;
        deltaCell.appendChild(span);
      }
      deltaCell.appendChild(document.createElement('br'));
      {
        const span = document.createElement('span');
        span.classList.add('small');
        span.id = 'predict-text';
        deltaCell.appendChild(span);
      }
      rankUpCell = document.createElement('th');
      rankUpCell.classList.add('top', 'right');
      rankUpCell.style.width = rankUpColWidth;
      {
        const span = document.createElement('span');
        span.textContent = Unicode.BLACK_CURVED_RIGHTWARDS_AND_UPWARDS_ARROW;
        span.title = rankUpColTitle;
        rankUpCell.appendChild(span);
      }
    } else if (idx == rows.length - 1) {
      deltaCell = document.createElement('td');
      deltaCell.classList.add('bottom');
      rankUpCell = document.createElement('td');
      rankUpCell.classList.add('bottom', 'right');
    } else {
      deltaCell = document.createElement('td');
      {
        const span = document.createElement('span');
        span.classList.add(DELTA_SPAN_CLASS);
        span.style.fontWeight = 'bold';
        deltaCell.appendChild(span);
      }
      rankUpCell = document.createElement('td');
      rankUpCell.classList.add('right', RANK_UP_TD_CLASS);
    }

    if (idx % 2) {
      deltaCell.classList.add('dark');
      rankUpCell.classList.add('dark');
    }

    row.appendChild(deltaCell);
    row.appendChild(rankUpCell);
  }

  PREDICT_TEXT = document.querySelector('#predict-text');
}

function getNaSpan() {
  const span = document.createElement('span');
  span.style.fontWeight = 'bold';
  span.style.color = 'lightgrey';
  span.textContent = 'N/A';
  span.classList.add('small');
  return span;
}

function getRankSpan(rank) {
  const span = document.createElement('span');
  if (rank.colorClass) {
    span.classList.add(rank.colorClass);
  }
  span.style.verticalAlign = 'middle';
  span.textContent = rank.abbr;
  span.title = rank.name;
  span.style.display = 'inline-block';  // Allows CSS black ::first-letter for LGM.
  return span;
}

function getArrowSpan(arrow) {
  const span = document.createElement('span');
  span.classList.add('small');
  span.style.verticalAlign = 'middle';
  span.style.paddingLeft = '0.5em';
  span.style.paddingRight = '0.5em';
  span.textContent = arrow;
  return span;
}

function getFinalRankUpSpan(rank, newRank, arrow) {
  const span = document.createElement('span');
  span.style.fontWeight = 'bold';
  span.appendChild(getRankSpan(rank));
  span.appendChild(getArrowSpan(arrow));
  span.appendChild(getRankSpan(newRank));
  return span;
}

function getPredictedRankupSpan(rank, deltaReqForRankUp, nextRank) {
  const span = document.createElement('span');
  span.style.fontWeight = 'bold';

  if (nextRank == null) {  // LGM
    span.appendChild(getRankSpan(rank));
    return span;
  }

  const deltaSpan = document.createElement('span');
  deltaSpan.style.color = 'green';
  deltaSpan.style.verticalAlign = 'middle';
  deltaSpan.textContent = `+${deltaReqForRankUp}`;

  span.appendChild(deltaSpan);
  span.appendChild(getArrowSpan(Unicode.SLANTED_NORTH_ARROW_WITH_HORIZONTAL_TAIL));
  span.appendChild(getRankSpan(nextRank));
  return span;
}

function updateStandings(resp) {
  const rows = Array.from(document.querySelectorAll('table.standings tbody tr'));
  for (const [idx, tableRow] of rows.entries()) {
    const deltaSpan = tableRow.querySelector('.' + DELTA_SPAN_CLASS);
    const rankUpCell = tableRow.querySelector('.' + RANK_UP_TD_CLASS);
    if (!deltaSpan) {
      continue;
    }

    const handle = tableRow.querySelector('td.contestant-cell').textContent.trim();
    if (!(handle in resp.rowMap)) {
      deltaSpan.style.color = 'lightgrey';
      deltaSpan.textContent = 'N/A';
      deltaSpan.classList.add('small');
      continue;
    }

    const row = resp.rowMap[handle];
    if (row.delta > 0) {
      deltaSpan.style.color = 'green';
      deltaSpan.textContent = '+' + row.delta;
    } else {
      deltaSpan.style.color = 'gray';
      deltaSpan.textContent = row.delta;
    }

    switch (resp.type) {
      case 'FINAL':
        if (row.rank.abbr === row.newRank.abbr) {  // No rank change
          rankUpCell.appendChild(getNaSpan());
        } else {
          const arrow =
            row.delta > 0
              ? Unicode.SLANTED_NORTH_ARROW_WITH_HORIZONTAL_TAIL
              : Unicode.BACKSLANTED_SOUTH_ARROW_WITH_HORIZONTAL_TAIL;
          rankUpCell.appendChild(getFinalRankUpSpan(row.rank, row.newRank, arrow));
        }
        break;
      case 'PREDICTED':
        rankUpCell.appendChild(
          getPredictedRankupSpan(row.rank, row.deltaReqForRankUp, row.nextRank));
        if (row.delta >= row.deltaReqForRankUp) {
          const greenTint = idx % 2 ? '#ebf7eb' : '#f2fff2';
          rankUpCell.style.backgroundColor = greenTint;
        }
        break;
      default:
        console.error('Unknown prediction type ' + resp.type);
    }
  }
}

function showFinal() {
  PREDICT_TEXT.textContent = 'Final';
}

function showTimer() {
  const predictedAt = Date.now();
  function update() {
    const secSinceLastPredict = Math.floor((Date.now() - predictedAt) / 1000);
    if (secSinceLastPredict < 20) {
      PREDICT_TEXT.textContent = 'Just now';
    } else if (secSinceLastPredict < 60) {
      PREDICT_TEXT.textContent = '<1m old';
    } else {
      PREDICT_TEXT.textContent = Math.floor(secSinceLastPredict / 60) + 'm old';
    }
  }
  update();
  setInterval(update, 1000);
}

async function predict(contestId) {
  try {
    const resp = await browser.runtime.sendMessage({ type: 'PREDICT', contestId: contestId });
    setupDeltaColumn(resp);
    updateStandings(resp);
    switch (resp.type) {
      case 'FINAL':
        showFinal();
        break;
      case 'PREDICTED':
        showTimer();
        break;
      default:
        console.error('Unknown prediction type ' + resp.type);
    }
  } catch (err) {
    switch (err.message) {
      case 'UNRATED_CONTEST':
        console.info('Possibly unrated contest, not displaying delta column.');
        break;
      case 'DISABLED':
        console.info('Deltas for this contest are disabled according to user settings.');
        break;
      default:
        console.error('Error when predicting deltas: ' + err);
    }
  }
}

function main() {
  // On any Codeforces ranklist page.
  const matches = location.pathname.match(/contest\/(\d+)\/standings/);
  const contestId = matches ? matches[1] : null;
  if (contestId && document.querySelector('table.standings')) {
    predict(contestId);
  }

  // On any Codeforces page.
  const ping = () => { browser.runtime.sendMessage({ type: 'PING' }); };
  ping();
  setInterval(ping, PING_INTERVAL);
}

main();
