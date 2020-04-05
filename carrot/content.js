const CONTEST_ID = location.pathname.match(/contest\/(\d+)\/standings/)[1];

const GREEK_CAPITAL_DELTA = '\u0394';
const DELTA_SPAN_CLASS = 'delta-span';

let PREDICT_TEXT;

function setupDeltaColumn() {
  const rows = Array.from(document.querySelectorAll('table.standings tbody tr'));
  for (const [idx, row] of rows.entries()) {
    row.querySelector('th:last-child, td:last-child').classList.remove('right');
    let newCell;
    if (idx == 0) {
      newCell = document.createElement('th');
      newCell.classList.add('top', 'right');
      newCell.style.width = '5em';
      newCell.appendChild(document.createTextNode(GREEK_CAPITAL_DELTA));
      newCell.appendChild(document.createElement('br'));
      const span = document.createElement('span');
      span.classList.add('small');
      span.id = 'predict-text';
      newCell.appendChild(span);
    } else if (idx == rows.length - 1) {
      newCell = document.createElement('td');
      newCell.classList.add('bottom', 'right');
    } else {
      newCell = document.createElement('td');
      newCell.classList.add('right');
      const span = document.createElement('span');
      span.classList.add(DELTA_SPAN_CLASS);
      span.style.fontWeight = 'bold';
      newCell.appendChild(span);
    }
    if (idx % 2) {
      newCell.classList.add('dark');
    }
    row.appendChild(newCell);
  }

  PREDICT_TEXT = document.querySelector('#predict-text');
}

function updateStandings(deltas) {
  const rows = document.querySelectorAll('table.standings tbody tr');
  for (const row of rows) {
    const span = row.querySelector('.' + DELTA_SPAN_CLASS);
    if (!span) {
      continue;
    }
    const handle = row.querySelector('td.contestant-cell').textContent.trim();
    if (handle in deltas) {
      const delta = deltas[handle];
      if (delta > 0) {
        span.style.color = 'green';
        span.textContent = '+' + delta;
      } else {
        span.style.color = 'gray';
        span.textContent = delta;
      }
    } else {
      span.style.color = 'lightgrey';
      span.textContent = 'N/A';
      span.classList.add('small');
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

async function predict() {
  try {
    const resp = await browser.runtime.sendMessage({ contestId: CONTEST_ID });
    setupDeltaColumn();
    updateStandings(resp.deltas);
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
      default:
        console.error('Error when predicting deltas: ' + err);
    }
  }
}

function main() {
  if (document.querySelector('table.standings')) {
    predict();
  }
}

main();
