<h1>
  <sub>
    <img src="https://raw.githubusercontent.com/meooow25/carrot/master/carrot/icons/icon.svg" alt="Carrot logo" height="38">
  </sub>
  Carrot
</h1>

<a href="https://addons.mozilla.org/en-US/firefox/addon/carrot/" alt="Mozilla Addons"><img src="https://ffp4g1ylyit3jdyti1hqcvtb-wpengine.netdna-ssl.com/addons/files/2015/11/get-the-addon.png" height="48"></a>&emsp;<a href="https://chrome.google.com/webstore/detail/carrot/gakohpplicjdhhfllilcjpfildodfnnn" alt="Chrome Web Store"><img src="https://developer.chrome.com/webstore/images/ChromeWebStore_BadgeWBorder_v2_340x96.png" height="48"></a>


A browser extension to enhance [Codeforces](https://codeforces.com) ranklists

**For an active contest**  
Carrot calculates rating changes according the current standings when you open the ranklist, and displays them in a new column. Carrot also adds a column showing the delta required to rank up. The delta calculation is done in real time.

**For a finished contest**  
Carrot displays the final deltas of each contestant in a new column and shows their rank change, if any, in an adjacent column.

For both active and finished contests, Carrot displays a column for performance, the rating at which the delta would be zero.

## FAQ

#### How does it work?
Carrot runs in the browser and fetches all the data it needs from the [Codeforces API](https://codeforces.com/apiHelp).  
It then calculates the rating changes following the algorithm published by Mike Mirzayanov [here](https://codeforces.com/blog/entry/20762), slightly modified so that it matches the current CF algorithm. This updated algorithm is adapted from [TLE](https://github.com/cheran-senthil/TLE/blob/master/tle/util/ranklist/rating_calculator.py).  

#### Is this better than [CF-Predictor](https://codeforces.com/blog/entry/50411)?
Not necessarily. The CF-Predictor extension communicates with a server, while Carrot fetches data and performs all calculations in the browser. So the network usage is significantly lower for CF-Predictor. However, Carrot is ~~100% accurate~~ (see [#18](https://github.com/meooow25/carrot/pull/18)), it works in real time, and it shows performance values.

#### How is Carrot fast enough to calculate rating changes of every contestant in real time?
FFT. The answer is always FFT.

#### I found a bug or would like to request a feature.
Reports are welcome, please [open an issue](https://github.com/meooow25/carrot/issues).
