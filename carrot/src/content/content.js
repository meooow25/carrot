const PING_INTERVAL = 3 * 60 * 1000;  // 3 minutes
const EXTENSION_RELOAD_DELAY = 1000; // 1 second delay before reload
const MAX_RECONNECT_ATTEMPTS = 3;
const CONNECTION_CHECK_KEY = 'carrot_connection_check';
const MAX_RELOADS_PER_SESSION = 2;
let reconnectAttempts = 0;

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

let port = null;
let isConnected = false;

async function checkExtensionConnection() {
  try {
    // Check if we've exceeded reload attempts
    const reloadCount = parseInt(sessionStorage.getItem(CONNECTION_CHECK_KEY) || '0');
    if (reloadCount >= MAX_RELOADS_PER_SESSION) {
      console.error('[Carrot] Maximum reload attempts reached. Extension may be disabled or broken.');
      return false;
    }

    // Check if extension is available
    if (!chrome?.runtime?.id) {
      console.warn('[Carrot] Extension context unavailable');
      if (reloadCount < MAX_RELOADS_PER_SESSION) {
        sessionStorage.setItem(CONNECTION_CHECK_KEY, (reloadCount + 1).toString());
        setTimeout(() => window.location.reload(), EXTENSION_RELOAD_DELAY);
      }
      return false;
    }

    // If we already have a connection, verify it's still working
    if (port && isConnected) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'CHECK_CONNECTION' });
        if (response?.connected) {
          return true;
        }
      } catch (e) {
        console.warn('[Carrot] Existing connection check failed:', e);
      }
    }

    // Try to establish new connection
    return new Promise((resolve) => {
      try {
        port = chrome.runtime.connect({ name: 'carrot-connection' });
        
        port.onMessage.addListener((msg) => {
          if (msg.type === 'CONNECTED') {
            isConnected = true;
          }
        });

        port.onDisconnect.addListener(() => {
          isConnected = false;
          port = null;
          if (chrome.runtime.lastError) {
            console.warn('[Carrot] Port disconnected:', chrome.runtime.lastError);
          }
        });

        // Set a timeout for the initial connection
        const timeout = setTimeout(() => {
          if (!isConnected) {
            console.warn('[Carrot] Connection timeout');
            resolve(false);
          }
        }, 5000);

        // Wait for the CONNECTED message
        port.onMessage.addListener(function connectionListener(msg) {
          if (msg.type === 'CONNECTED') {
            clearTimeout(timeout);
            port.onMessage.removeListener(connectionListener);
            resolve(true);
          }
        });
      } catch (e) {
        console.error('[Carrot] Connection attempt failed:', e);
        resolve(false);
      }
    });
  } catch (e) {
    console.error('[Carrot] Connection check error:', e);
    return false;
  }
}

async function handleConnectionError() {
  const reloadCount = parseInt(sessionStorage.getItem(CONNECTION_CHECK_KEY) || '0');
  if (reloadCount < MAX_RELOADS_PER_SESSION) {
    reconnectAttempts++;
    if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
      console.warn(`[Carrot] Connection attempt ${reconnectAttempts} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, EXTENSION_RELOAD_DELAY));
      return checkExtensionConnection();
    }
  }
  console.error('[Carrot] Connection failed permanently. Please reload the extension.');
  return false;
}

async function predict(contestId) {
  try {
    if (!await checkExtensionConnection()) {
      return;
    }

    const response = await chrome.runtime.sendMessage({ type: 'PREDICT', contestId });
    if (!response) {
      throw new Error("No response from background script");
    }
    if (response.error) {
      console.error("Error from background script:", response.error);
      return;
    }
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
  } catch (e) {
    console.error("Error during predict:", e);
  }
}

// Mutable state, set once.
// If predict succeeds, columns will be set to either PREDICT_COLUMNS or FINAL_COLUMNS.
// If it fails, error will be set to the received error .toString().
const state = {
  columns: null,
  error: null,
};

/* ----------------------------------------------- */
/*   API stuff                                     */
/* ----------------------------------------------- */

const API_PATH = '/api/';

async function apiFetch(path, queryParamList) {
  const url = new URL(location.origin + API_PATH + path);
  for (const [key, value] of queryParamList) {
    url.searchParams.append(key, value);
  }
  const resp = await fetch(url);
  const text = await resp.text();
  if (resp.status !== 200) {
    throw new Error(`CF API: HTTP error ${resp.status}: ${text}`)
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    throw new Error(`CF API: Invalid JSON: ${text}`);
  }
  if (json.status !== 'OK' || json.result === undefined) {
    throw new Error(`CF API: Error: ${text}`);
  }
  return json.result;
}

/* ----------------------------------------------- */
/*   main                                          */
/* ----------------------------------------------- */

function main() {
  // Reset connection check counter on initial page load
  if (!document.hidden) {
    sessionStorage.setItem(CONNECTION_CHECK_KEY, '0');
  }

  // Only proceed if we're on a relevant page
  const matches = location.pathname.match(/contest\/(\d+)\/standings/);
  const contestId = matches ? matches[1] : null;
  if (!contestId || !document.querySelector('table.standings')) {
    return;
  }

  // Initial connection check
  checkExtensionConnection().then(connected => {
    if (!connected) {
      return;
    }

    predict(contestId)
      .then(columns => {
        if (columns) {
          state.columns = columns;
        }
      })
      .catch(er => {
        console.error('[Carrot] Predict error: %o', er);
        state.error = er.toString();
        checkExtensionConnection().then(connected => {
          if (connected && chrome?.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ type: 'SET_ERROR_BADGE' })
              .catch(e => console.warn('[Carrot] Failed to set error badge:', e));
          }
        });
      });

    // Set up ping with error handling
    const ping = async () => {
      if (await checkExtensionConnection() && chrome?.runtime?.sendMessage) {
        try {
          await chrome.runtime.sendMessage({ type: 'PING' });
        } catch (e) {
          console.warn('[Carrot] Ping failed:', e);
        }
      }
    };
    ping();
    setInterval(ping, PING_INTERVAL);
  });
}

// Update message listener with better error handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!chrome?.runtime?.id) {
    sendResponse({ error: 'Extension unavailable' });
    return false;
  }

  (async () => {
    try {
      if (!await checkExtensionConnection()) {
        sendResponse({ error: 'Extension connection lost' });
        return;
      }

      switch (message.type) {
        case 'LIST_COLS':
          sendResponse(state);
          break;
        case 'UPDATE_COLS':
          updateColumnVisibility(message.prefs);
          sendResponse({});
          break;
        case 'API_FETCH':
          try {
            const result = await apiFetch(message.path, message.queryParamList);
            sendResponse(result);
          } catch (error) {
            sendResponse({ error: error.message });
          }
          break;
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (e) {
      console.error('[Carrot] Message handler error:', e);
      sendResponse({ error: e.message });
    }
  })();
  return true;
});

main();
