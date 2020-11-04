/**
 * Performs convolution of real sequences using Cooley-Tukey FFT in O(n log n).
 *
 * >> const fftConv = new FFTConv(8);  // Initialized with n = 8
 * >> const a = [0.125, 0.25, 0.5];
 * >> const b = [4, 3, 2, 1];
 * >> const res = fftConv.convolve(a, b);  // a.length + b.length - 1 must be <= n
 * >> // expected result [0.5, 1.375, 3, 2.125, 1.25, 0.5]
 */
export default class FFTConv {
  constructor(n) {
    let k = 1;
    while ((1 << k) < n) {
      k++;
    }
    this.n = 1 << k;
    const n2 = this.n >> 1;
    this.wr = [];
    this.wi = [];
    const ang = 2 * Math.PI / this.n;
    for (let i = 0; i < n2; i++) {
      this.wr[i] = Math.cos(i * ang);
      this.wi[i] = Math.sin(i * ang);
    }
    this.rev = [0];
    for (let i = 1; i < this.n; i++) {
      this.rev[i] = (this.rev[i >> 1] >> 1) | ((i & 1) << (k - 1));
    }
  }

  reverse(a) {
    for (let i = 1; i < this.n; i++) {
      if (i < this.rev[i]) {
        const tmp = a[i];
        a[i] = a[this.rev[i]];
        a[this.rev[i]] = tmp;
      }
    }
  }

  transform(ar, ai) {
    this.reverse(ar);
    this.reverse(ai);
    const wr = this.wr;
    const wi = this.wi;
    for (let len = 2; len <= this.n; len <<= 1) {
      const half = len >> 1;
      const diff = this.n / len;
      for (let i = 0; i < this.n; i += len) {
        let pw = 0;
        for (let j = i; j < i + half; j++) {
          const k = j + half;
          const vr = ar[k] * wr[pw] - ai[k] * wi[pw];
          const vi = ar[k] * wi[pw] + ai[k] * wr[pw];
          ar[k] = ar[j] - vr;
          ai[k] = ai[j] - vi;
          ar[j] += vr;
          ai[j] += vi;
          pw += diff;
        }
      }
    }
  }

  convolve(a, b) {
    if (a.length === 0 || b.length === 0) {
      return [];
    }
    const n = this.n;
    const resLen = a.length + b.length - 1;
    if (resLen > n) {
      throw new Error(
        `a.length + b.length - 1 is ${a.length} + ${b.length} - 1 = ${resLen}, ` +
        `expected <= ${n}`);
    }
    const cr = new Array(n).fill(0);
    const ci = new Array(n).fill(0);
    cr.splice(0, a.length, ...a);
    ci.splice(0, b.length, ...b);
    this.transform(cr, ci);

    cr[0] = 4 * cr[0] * ci[0];
    ci[0] = 0;
    for (let i = 1, j = n - 1; i <= j; i++, j--) {
      const ar = cr[i] + cr[j];
      const ai = ci[i] - ci[j];
      const br = ci[j] + ci[i];
      const bi = cr[j] - cr[i];
      cr[i] = ar * br - ai * bi;
      ci[i] = ar * bi + ai * br;
      cr[j] = cr[i];
      ci[j] = -ci[i];
    }

    this.transform(cr, ci);
    const res = [];
    res[0] = cr[0] / (4 * n);
    for (let i = 1, j = n - 1; i <= j; i++, j--) {
      res[i] = cr[j] / (4 * n);
      res[j] = cr[i] / (4 * n);
    }
    res.splice(resLen);
    return res;
  }
}
