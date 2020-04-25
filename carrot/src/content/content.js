const PING_INTERVAL = 3 * 60 * 1000;  // 3 minutes
const PREDICT_TEXT_ID = 'predict_text';

const Unicode = {
  BLACK_CURVED_RIGHTWARDS_AND_UPWARDS_ARROW: '\u2BAD',
  GREEK_CAPITAL_DELTA: '\u0394',
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

  if (nextRank == null) {  // LGM
    span.appendChild(makeRankSpan(rank));
    return span;
  }

  span.appendChild(makeDeltaSpan(deltaReqForRankUp));
  span.appendChild(makeArrowSpan(Unicode.SLANTED_NORTH_ARROW_WITH_HORIZONTAL_TAIL));
  span.appendChild(makeRankSpan(nextRank));
  return span;
}

function makeDeltaHeaderCell(deltaColTitle) {
  const cell = document.createElement('th');
  cell.classList.add('top');
  cell.style.width = '5em';
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

function makeDeltaFooterCell() {
  const cell = document.createElement('td');
  cell.classList.add('bottom');
  return cell;
}

function makeRankUpFooterCell() {
  const cell = document.createElement('td');
  cell.classList.add('bottom', 'right');
  return cell;
}

function populateDeltaAndRankUpCells(row, type, greenTint, deltaCell, rankUpCell) {
  if (row == null) {
    deltaCell.appendChild(makeGreySpan('N/A', 'Not applicable'));
    rankUpCell.appendChild(makeGreySpan('N/A', 'Not applicable'));
    return;
  }

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
        rankUpCell.style.backgroundColor = greenTint;
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
      rankUpColWidth = '7em';
      rankUpColTitle = 'Rank change';
      break;
    case 'PREDICTED':
      deltaColTitle = 'Predicted rating change';
      rankUpColWidth = '8em';
      rankUpColTitle = 'Rating change for rank up';
      break;
    default:
      throw new Error('Unknown prediction type: ' + resp.type);
  }

  const rows = Array.from(document.querySelectorAll('table.standings tbody tr'));
  for (const [idx, tableRow] of rows.entries()) {
    tableRow.querySelector('th:last-child, td:last-child').classList.remove('right');

    let deltaCell, rankUpCell;
    if (idx == 0) {
      deltaCell = makeDeltaHeaderCell(deltaColTitle);
      rankUpCell = makeRankUpHeaderCell(rankUpColWidth, rankUpColTitle);
    } else if (idx == rows.length - 1) {
      deltaCell = makeDeltaFooterCell();
      rankUpCell = makeDeltaFooterCell();
      rankUpCell.classList.add('bottom', 'right');
    } else {
      deltaCell = document.createElement('td');
      rankUpCell = document.createElement('td');
      rankUpCell.classList.add('right');
      const handle = tableRow.querySelector('td.contestant-cell').textContent.trim();
      const greenTint = idx % 2 ? '#ebf7eb' : '#f2fff2';
      populateDeltaAndRankUpCells(resp.rowMap[handle], resp.type, greenTint, deltaCell, rankUpCell);
    }

    if (idx % 2) {
      deltaCell.classList.add('dark');
      rankUpCell.classList.add('dark');
    }

    tableRow.appendChild(deltaCell);
    tableRow.appendChild(rankUpCell);
  }
}

function showFinal() {
  document.querySelector(`#${PREDICT_TEXT_ID}`).textContent = 'Final';
}

function showTimer() {
  const predictTextSpan = document.querySelector(`#${PREDICT_TEXT_ID}`);
  const predictedAt = Date.now();
  function update() {
    const secSinceLastPredict = Math.floor((Date.now() - predictedAt) / 1000);
    if (secSinceLastPredict < 20) {
      predictTextSpan.textContent = 'Just now';
    } else if (secSinceLastPredict < 60) {
      predictTextSpan.textContent = '<1m old';
    } else {
      predictTextSpan.textContent = Math.floor(secSinceLastPredict / 60) + 'm old';
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
        console.info('Possibly unrated contest, not displaying delta column.');
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
      showTimer();
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
