# Carrot

A browser extension for [Codeforces](https://codeforces.com) that can
- Calculate rating changes for a contest while it is running, based on the current standings.
- Show the final rating changes for finished contests.

## FAQ

#### How does it work?
Carrot runs in the browser and fetches all the data it needs from the [Codeforces API](https://codeforces.com/apiHelp).  
It then calculates the rating changes following the algorithm published by Mike Mirzayanov [here](https://codeforces.com/blog/entry/20762), slightly modified so that it matches the current CF algorithm. This updated algorithm is adapted from [TLE](https://github.com/cheran-senthil/TLE/blob/master/tle/util/ranklist/rating_calculator.py).

#### Is this better than [CF-Predictor](https://codeforces.com/blog/entry/50411)?
Not necessarily. The CF-Predictor extension communicates with a server, while Carrot fetches data and performs all calculations in the browser. So the network usage is significantly lower for CF-Predictor. However, Carrot is 100% accurate and it works in real time.

#### How is Carrot fast enough to calculate rating changes of every contestant in real time?
FFT. The answer is always FFT.

#### Cool, how do I install it?
Carrot is available for [Firefox](https://addons.mozilla.org/en-US/firefox/addon/carrot/) and [Chrome](https://chrome.google.com/webstore/detail/carrot/gakohpplicjdhhfllilcjpfildodfnnn).

#### Your code sucks
Suggestions and ideas for improvements are most welcome.
