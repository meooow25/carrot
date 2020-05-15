/**
 * Represents complex numbers.
 */
class Complex {
  constructor(re = 0, im = 0) {
    this.re = re;
    this.im = im;
  }
  conj() { return new Complex(this.re, -this.im); }
  add(x) { return new Complex(this.re + x.re, this.im + x.im); }
  sub(x) { return new Complex(this.re - x.re, this.im - x.im); }
  mul(x) { return new Complex(this.re * x.re - this.im * x.im, this.re * x.im + this.im * x.re) }
}

Complex.I = new Complex(0, 1);

/**
 * Performs convolution of real sequences using Cooley-Tukey FFT in O(n log n).
 * 
 * >> const fftConv = new FFTConv(8);  // Initialized with n = 8
 * >> const a = [0.125, 0.25, 0.5];
 * >> const b = [4, 3, 2, 1];
 * >> const res = fftConv.convolve(a, b);  // a.length + b.length - 1 must be <= n
 * >> // expected result [0.5, 1.375, 3, 2.125, 1.25, 0.5]
 */
class FFTConv {
  constructor(n) {
    let k = 1;
    while ((1 << k) < n) {
      k++;
    }
    this.n = 1 << k;
    this.w = new Array(this.n >> 1);
    const ang = 2 * Math.PI / this.n;
    for (let i = 0; i < this.w.length; i++) {
      this.w[i] = new Complex(Math.cos(i * ang), Math.sin(i * ang));
    }
    this.rev = new Array(this.n);
    this.rev[0] = 0;
    for (let i = 1; i < this.n; i++) {
      this.rev[i] = this.rev[i >> 1] >> 1 | ((i & 1) << (k - 1));
    }
  }

  transform(a) {
    if (a.length != this.n) {
      throw new Error(`a.length is ${a.length}, expected ${this.n}`);
    }

    for (let i = 1; i < this.n; i++) {
      if (i < this.rev[i]) {
        const tmp = a[i];
        a[i] = a[this.rev[i]];
        a[this.rev[i]] = tmp;
      }
    }

    for (let len = 2; len <= this.n; len <<= 1) {
      const half = len >> 1;
      const diff = this.n / len;
      for (let i = 0; i < this.n; i += len) {
        let pw = 0;
        for (let j = i; j < i + half; j++) {
          const v = a[j + half].mul(this.w[pw]);
          a[j + half] = a[j].sub(v);
          a[j] = a[j].add(v);
          pw += diff;
        }
      }
    }
  }

  convolve(a, b) {
    if (a.length == 0 || b.length == 0) {
      return [];
    }
    const n = this.n;
    const resLen = a.length + b.length - 1;
    if (resLen > n) {
      throw new Error(
        `a.length + b.length - 1 is ${a.length} + ${b.length} - 1 = ${resLen}, ` +
        `expected <= ${n}`);
    }
    let c = new Array(n);
    for (let i = 0; i < n; i++) {
      c[i] = new Complex();
    }
    for (let i = 0; i < a.length; i++) {
      c[i].re = a[i];
    }
    for (let i = 0; i < b.length; i++) {
      c[i].im = b[i];
    }
    this.transform(c);
    let res = new Array(n);
    let tmpa = c[0].add(c[0].conj());
    let tmpb = c[0].conj().sub(c[0]).mul(Complex.I);
    res[0] = tmpa.mul(tmpb);
    for (let i = 1; i < n; i++) {
      tmpa = c[i].add(c[n - i].conj());
      tmpb = c[n - i].conj().sub(c[i]).mul(Complex.I);
      res[i] = tmpa.mul(tmpb);
    }
    this.transform(res);
    res[0] = res[0].re / (4 * n);
    for (let i = 1, j = n - 1; i <= j; i++, j--) {
      const tmp = res[i].re;
      res[i] = res[j].re / (4 * n);
      res[j] = tmp / (4 * n);
    }
    res.splice(resLen);
    return res;
  }
}

export { FFTConv };
