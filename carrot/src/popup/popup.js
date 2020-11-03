import * as settings from '../util/settings.js';
import UserPrefs from '../util/user-prefs.js';

async function makeList(cols, changeCallback) {
  const ul = document.createElement('ul');
  for (const col of cols) {
    const setterGetter = settings[col.setting];

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = col.id;
    input.checked = await setterGetter();

    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = `Show ${col.text}`;

    const li = document.createElement('li');
    li.appendChild(input);
    li.appendChild(label);
    ul.appendChild(li);

    input.addEventListener('input', async () => {
      await setterGetter(input.checked);
      changeCallback();
    });
  }

  const options = document.querySelector('#options');
  options.appendChild(ul);
  options.style.display = null;  // Make visible
}

async function informAllTabs() {
  const prefs = await UserPrefs.create(settings);
  for (const tab of await browser.tabs.query({})) {
    try {
      await browser.tabs.sendMessage(tab.id, {
        type: 'UPDATE_COLS',
        prefs,
      });
    } catch (e) {
      // No listener on this tab
    }
  }
}

async function setup() {
  const manifest = browser.runtime.getManifest();

  document.querySelector('#version').textContent = 'v' + manifest.version;
  document.querySelector('#title').textContent = manifest.name;
  document.querySelector('#icon').src =
    browser.runtime.getURL(manifest.browser_action.default_icon);

  const settings = document.querySelector('#settings');
  settings.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
    window.close();
  });

  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  let tabColumns;
  try {
    tabColumns = await browser.tabs.sendMessage(tab.id, { type: 'LIST_COLS' });
  } catch (e) {
    // No listener on the tab
    return;
  }
  if (tabColumns) {
    await makeList(tabColumns, informAllTabs);
  }
}

document.addEventListener('DOMContentLoaded', setup);
