const PING_INTERVAL = 3 * 60 * 1000;  // 3 minutes

const PREDICT_TEXT_ID = 'carrot-predict-text';
const DISPLAY_NONE_CLS = 'carrot-display-none';

const Unicode = {
  BLACK_CURVED_RIGHTWARDS_AND_UPWARDS_ARROW: '\u2BAD',
  GREEK_CAPITAL_DELTA: '\u0394',
  GREEK_CAPITAL_PI: '\u03A0',
  INFINITY: '\u221E',
  SLANTED_NORTH_ARROW_WITH_HORIZONTAL_TAIL: '\u2B5C',
  BACKSLANTED_SOUTH_ARROW_WITH_HORIZONTAL_TAIL: '\u2B5D',
};

const PREDICT_COLUMNS = [
  {
    text: 'current performance',
    id: 'carrot-current-performance',
    setting: 'showColCurrentPerformance',
  },
  {
    text: 'predicted delta',
    id: 'carrot-predicted-delta',
    setting: 'showColPredictedDelta',
  },
  {
    text: 'delta required to rank up',
    id: 'carrot-rank-up-delta',
    setting: 'showColRankUpDelta',
  },
];
const FINAL_COLUMNS = [
  {
    text: 'final performance',
    id: 'carrot-final-performance',
    setting: 'showColFinalPerformance',
  },
  {
    text: 'final delta',
    id: 'carrot-final-delta',
    setting: 'showColFinalDelta',
  },
  {
    text: 'rank change',
    id: 'carrot-rank-change',
    setting: 'showColRankChange',
  },
];
const ALL_COLUMNS = PREDICT_COLUMNS.concat(FINAL_COLUMNS);

function makeGreySpan(text, title) {
  const span = document.createElement('span');
  span.style.fontWeight = 'bold';
  span.style.color = 'lightgrey';
  span.textContent = text;
  if (title) {
    span.title = title;
  }
  span.classList.add('small');
  return span;
}

function makePerformanceSpan(performance) {
  const span = document.createElement('span');
  if (performance.value === 'Infinity') {
    span.textContent = Unicode.INFINITY;
    // ::first-letter does not match the inf symbol on Firefox, just don't set the LGM color class
    // and it defaults to black.
  } else {
    span.textContent = performance.value;
    span.classList.add(performance.colorClass);
  }
  span.style.fontWeight = 'bold';
  span.style.display = 'inline-block';  // Allows CSS black ::first-letter for LGM
  return span;
}

function makeRankSpan(rank) {
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

function makeArrowSpan(arrow) {
  const span = document.createElement('span');
  span.classList.add('small');
  span.style.verticalAlign = 'middle';
  span.style.paddingLeft = '0.5em';
  span.style.paddingRight = '0.5em';
  span.textContent = arrow;
  return span;
}

function makeDeltaSpan(delta) {
  const span = document.createElement('span');
  span.style.fontWeight = 'bold';
  span.style.verticalAlign = 'middle';
  if (delta > 0) {
    span.style.color = 'green';
    span.textContent = `+${delta}`;
  } else {
    span.style.color = 'gray';
    span.textContent = delta;
  }
  return span;
}

function makeFinalRankUpSpan(rank, newRank, arrow) {
  const span = document.createElement('span');
  span.style.fontWeight = 'bold';
  span.appendChild(makeRankSpan(rank));
  span.appendChild(makeArrowSpan(arrow));
  span.appendChild(makeRankSpan(newRank));
  return span;
}

function makePredictedRankUpSpan(rank, deltaReqForRankUp, nextRank) {
  const span = document.createElement('span');
  span.style.fontWeight = 'bold';

  if (nextRank === null) {  // LGM
    span.appendChild(makeRankSpan(rank));
    return span;
  }

  span.appendChild(makeDeltaSpan(deltaReqForRankUp));
  span.appendChild(makeArrowSpan(Unicode.SLANTED_NORTH_ARROW_WITH_HORIZONTAL_TAIL));
  span.appendChild(makeRankSpan(nextRank));
  return span;
}

function makePerfHeaderCell() {
  const cell = document.createElement('th');
  cell.classList.add('top');
  cell.style.width = '4em';
  {
    const span = document.createElement('span');
    span.textContent = Unicode.GREEK_CAPITAL_PI;
    span.title = 'Performance';
    cell.appendChild(span);
  }
  return cell;
}

function makeDeltaHeaderCell(deltaColTitle) {
  const cell = document.createElement('th');
  cell.classList.add('top');
  cell.style.width = '4.5em';
  {
    const span = document.createElement('span');
    span.textContent = Unicode.GREEK_CAPITAL_DELTA;
    span.title = deltaColTitle;
    cell.appendChild(span);
  }
  cell.appendChild(document.createElement('br'));
  {
    const span = document.createElement('span');
    span.classList.add('small');
    span.id = PREDICT_TEXT_ID;
    cell.appendChild(span);
  }
  return cell;
}

function makeRankUpHeaderCell(rankUpColWidth, rankUpColTitle) {
  const cell = document.createElement('th');
  cell.classList.add('top', 'right');
  cell.style.width = rankUpColWidth;
  {
    const span = document.createElement('span');
    span.textContent = Unicode.BLACK_CURVED_RIGHTWARDS_AND_UPWARDS_ARROW;
    span.title = rankUpColTitle;
    cell.appendChild(span);
  }
  return cell;
}

function makeDataCell(bottom = false, right = false) {
  const cell = document.createElement('td');
  if (bottom) {
    cell.classList.add('bottom');
  }
  if (right) {
    cell.classList.add('right');
  }
  return cell;
}

function populateCells(row, type, rankUpTint, perfCell, deltaCell, rankUpCell) {
  if (row === undefined) {
    perfCell.appendChild(makeGreySpan('N/A', 'Not applicable'));
    deltaCell.appendChild(makeGreySpan('N/A', 'Not applicable'));
    rankUpCell.appendChild(makeGreySpan('N/A', 'Not applicable'));
    return;
  }

  perfCell.appendChild(makePerformanceSpan(row.performance));
  deltaCell.appendChild(makeDeltaSpan(row.delta));
  switch (type) {
    case 'FINAL':
      if (row.rank.abbr === row.newRank.abbr) {  // No rank change
        rankUpCell.appendChild(makeGreySpan('N/C', 'No change'));
      } else {
        const arrow =
          row.delta > 0
            ? Unicode.SLANTED_NORTH_ARROW_WITH_HORIZONTAL_TAIL
            : Unicode.BACKSLANTED_SOUTH_ARROW_WITH_HORIZONTAL_TAIL;
        rankUpCell.appendChild(makeFinalRankUpSpan(row.rank, row.newRank, arrow));
      }
      break;
    case 'PREDICTED':
      rankUpCell.appendChild(
        makePredictedRankUpSpan(row.rank, row.deltaReqForRankUp, row.nextRank));
      if (row.delta >= row.deltaReqForRankUp) {
        const [color, priority] = rankUpTint;
        rankUpCell.style.setProperty('background-color', color, priority);
      }
      break;
    default:
      throw new Error('Unknown prediction type'); // Unexpected
  }
}

function updateStandings(resp) {
  let deltaColTitle, rankUpColWidth, rankUpColTitle, columns;
  switch (resp.type) {
    case 'FINAL':
      deltaColTitle = 'Final rating change';
      rankUpColWidth = '6.5em';
      rankUpColTitle = 'Rank change';
      columns = FINAL_COLUMNS;
      break;
    case 'PREDICTED':
      deltaColTitle = 'Predicted rating change';
      rankUpColWidth = '7.5em';
      rankUpColTitle = 'Rating change for rank up';
      columns = PREDICT_COLUMNS;
      break;
    default:
      throw new Error('Unknown prediction type'); // Unexpected
  }

  const rows = Array.from(document.querySelectorAll('table.standings tbody tr'));
  for (const [idx, tableRow] of rows.entries()) {
    tableRow.querySelector('th:last-child, td:last-child').classList.remove('right');

    let perfCell, deltaCell, rankUpCell;
    if (idx === 0) {
      perfCell = makePerfHeaderCell();
      deltaCell = makeDeltaHeaderCell(deltaColTitle);
      rankUpCell = makeRankUpHeaderCell(rankUpColWidth, rankUpColTitle);
    } else if (idx === rows.length - 1) {
      perfCell = makeDataCell(true);
      deltaCell = makeDataCell(true);
      rankUpCell = makeDataCell(true, true);
    } else {
      perfCell = makeDataCell();
      deltaCell = makeDataCell();
      rankUpCell = makeDataCell(false, true);
      const handle = tableRow.querySelector('td.contestant-cell').textContent.trim();
      let rankUpTint;
      if (tableRow.classList.contains('highlighted-row')) {
        rankUpTint = ['#d1eef2', 'important'];  // Need !important to override !important.
      } else {
        rankUpTint = [idx % 2 ? '#ebf8eb' : '#f2fff2', undefined];
      }
      populateCells(resp.rowMap[handle], resp.type, rankUpTint, perfCell, deltaCell, rankUpCell);
    }

    const cells = [perfCell, deltaCell, rankUpCell];
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (idx % 2) {
        cell.classList.add('dark');
      }
      cell.classList.add(columns[i].id, DISPLAY_NONE_CLS);
      tableRow.appendChild(cell);
    }
  }

  return columns;
}

function updateColumnVisibility(prefs) {
  for (const col of ALL_COLUMNS) {
    const showCol = prefs[col.setting];
    const func =
        showCol ?
        (cell) => cell.classList.remove(DISPLAY_NONE_CLS) :
        (cell) => cell.classList.add(DISPLAY_NONE_CLS);
    document.querySelectorAll(`.${col.id}`).forEach(func);
  }
}

function showFinal() {
  const predictTextSpan = document.getElementById(PREDICT_TEXT_ID);
  predictTextSpan.textContent = 'Final';
}

function showTimer(fetchTime) {
  const predictTextSpan = document.getElementById(PREDICT_TEXT_ID);
  function update() {
    const secSincePredict = Math.floor((Date.now() - fetchTime) / 1000);
    if (secSincePredict < 30) {
      predictTextSpan.textContent = 'Just now';
    } else if (secSincePredict < 60) {
      predictTextSpan.textContent = '<1m old';
    } else {
      predictTextSpan.textContent = Math.floor(secSincePredict / 60) + 'm old';
    }
  }
  update();
  setInterval(update, 1000);
}

async function predict(contestId) {
  const response = await browser.runtime.sendMessage({ type: 'PREDICT', contestId });
  switch (response.result) {
    case 'OK':
      // Continue below
      break;
    case 'UNRATED_CONTEST':
      console.info('[Carrot] Unrated contest, not displaying delta column.');
      return;
    case 'DISABLED':
      console.info('[Carrot] Deltas for this contest are disabled according to user settings.');
      return;
    default:
      throw new Error('Unknown result'); // Unexpected
  }

  const columns = updateStandings(response.predictResponse);
  switch (response.predictResponse.type) {
    case 'FINAL':
      showFinal();
      break;
    case 'PREDICTED':
      showTimer(response.predictResponse.fetchTime);
      break;
    default:
      throw new Error('Unknown prediction type'); // Unexpected
  }
  updateColumnVisibility(response.prefs);
  return columns;
}

// Mutable state, set once.
// If predict succeeds, columns will be set to either PREDICT_COLUMNS or FINAL_COLUMNS.
// If it fails, error will be set to the received error .toString().
const state = {
  columns: null,
  error: null,
};

function main() {
  // On any Codeforces ranklist page.
  const matches = location.pathname.match(/contest\/(\d+)\/standings/);
  const contestId = matches ? matches[1] : null;
  if (contestId && document.querySelector('table.standings')) {
    predict(contestId)
      .then(columns => {
        state.columns = columns;
      })
      .catch(er => {
        console.error('[Carrot] Predict error: %o', er);
        state.error = er.toString();
        browser.runtime.sendMessage({ type: 'SET_ERROR_BADGE' });
      });
  }

  // On any Codeforces page.
  const ping = () => { browser.runtime.sendMessage({ type: 'PING' }); };
  ping();
  setInterval(ping, PING_INTERVAL);
}

main();

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'LIST_COLS') {
    return Promise.resolve(state);
  } else if (message.type == 'UPDATE_COLS') {
    updateColumnVisibility(message.prefs);
    return Promise.resolve();
  }
});
