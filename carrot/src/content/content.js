const PING_INTERVAL = 3 * 60 * 1000;  // 3 minutes
const PREDICT_TEXT_ID = 'predict_text';

const Unicode = {
  BLACK_CURVED_RIGHTWARDS_AND_UPWARDS_ARROW: '\u2BAD',
  GREEK_CAPITAL_DELTA: '\u0394',
  GREEK_CAPITAL_PI: '\u03A0',
  INFINITY: '\u221E',
  SLANTED_NORTH_ARROW_WITH_HORIZONTAL_TAIL: '\u2B5C',
  BACKSLANTED_SOUTH_ARROW_WITH_HORIZONTAL_TAIL: '\u2B5D',
};

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
  cell.style.width = '4.5em';
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

function makeDataCell(bottom=false, right=false) {
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
      throw new Error('Unknown prediction type: ' + type);
  }
}

function updateStandings(resp) {
  let deltaColTitle, rankUpColWidth, rankUpColTitle;
  switch (resp.type) {
    case 'FINAL':
      deltaColTitle = 'Final rating change';
      rankUpColWidth = '6.5em';
      rankUpColTitle = 'Rank change';
      break;
    case 'PREDICTED':
      deltaColTitle = 'Predicted rating change';
      rankUpColWidth = '7.5em';
      rankUpColTitle = 'Rating change for rank up';
      break;
    default:
      throw new Error('Unknown prediction type: ' + resp.type);
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

    if (idx % 2) {
      perfCell.classList.add('dark');
      deltaCell.classList.add('dark');
      rankUpCell.classList.add('dark');
    }

    tableRow.appendChild(perfCell);
    tableRow.appendChild(deltaCell);
    tableRow.appendChild(rankUpCell);
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
  let resp;
  try {
    resp = await browser.runtime.sendMessage({ type: 'PREDICT', contestId: contestId });
  } catch (er) {
    switch (er.message) {
      case 'UNRATED_CONTEST':
        console.info('Unrated contest, not displaying delta column.');
        break;
      case 'DISABLED':
        console.info('Deltas for this contest are disabled according to user settings.');
        break;
      default:
        throw er;
    }
    return;
  }

  updateStandings(resp);
  switch (resp.type) {
    case 'FINAL':
      showFinal();
      break;
    case 'PREDICTED':
      showTimer(resp.fetchTime);
      break;
    default:
      throw new Error('Unknown prediction type: ' + resp.type);
  }
}

function main() {
  // On any Codeforces ranklist page.
  const matches = location.pathname.match(/contest\/(\d+)\/standings/);
  const contestId = matches ? matches[1] : null;
  if (contestId && document.querySelector('table.standings')) {
    predict(contestId)
      .catch(er => console.error(er));
  }

  // On any Codeforces page.
  const ping = () => { browser.runtime.sendMessage({ type: 'PING' }); };
  ping();
  setInterval(ping, PING_INTERVAL);
}

main();
