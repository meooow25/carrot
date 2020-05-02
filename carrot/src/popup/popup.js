function setup() {
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
}

document.addEventListener('DOMContentLoaded', setup);
