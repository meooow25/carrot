class Complex {
  constructor(re = 0, im = 0) {
    this.re = re;
    this.im = im;
  }
  conj() { return new Complex(this.re, -this.im); }
  add(x) { return new Complex(this.re + x.re, this.im + x.im); }
  sub(x) { return new Complex(this.re - x.re, this.im - x.im); }
  mul(x) {
    return x instanceof Complex ?
      new Complex(this.re * x.re - this.im * x.im, this.re * x.im + this.im * x.re) :
      new Complex(this.re * x, this.im * x);
  }
  div(x) { return new Complex(this.re / x, this.im / x); }
}

Complex.I = new Complex(0, 1);

class FFTConv {
  constructor(n) {
    let k = 1;
    while ((1 << k) < n) {
      k++;
    }
    this.n = 1 << k;
    this.w = [];
    this.invw = [];
    const ang = 2 * Math.PI / this.n;
    const n2 = this.n >> 1;
    for (let i = 0; i < n2; i++) {
      this.w.push(new Complex(Math.cos(i * ang), Math.sin(i * ang)))
      this.invw.push(this.w[i].conj());
    }
    this.rev = [0];
    for (let i = 1; i < this.n; i++) {
      this.rev.push(this.rev[i >> 1] >> 1 | ((i & 1) << (k - 1)));
    }
  }

  transform(a, inv = false) {
    if (a.length != this.n) {
      throw new Error('Length must be n');
    }

    for (let i = 1; i < this.n; i++) {
      if (i < this.rev[i]) {
        const tmp = a[i];
        a[i] = a[this.rev[i]];
        a[this.rev[i]] = tmp;
      }
    }

    const twiddle = inv ? this.invw : this.w;
    for (let len = 2; len <= this.n; len <<= 1) {
      const half = len >> 1;
      const diff = this.n / len;
      for (let i = 0; i < this.n; i += len) {
        let pw = 0;
        for (let j = i; j < i + half; j++) {
          const v = a[j + half].mul(twiddle[pw]);
          a[j + half] = a[j].sub(v);
          a[j] = a[j].add(v);
          pw += diff;
        }
      }
    }

    if (inv) {
      for (let i = 0; i < this.n; i++) {
        a[i] = a[i].div(this.n);
      }
    }
  }

  convolve(a, b) {
    let c = [];
    for (let i = 0; i < this.n; i++) {
      c[i] = new Complex();
    }
    for (let i = 0; i < a.length; i++) {
      c[i].re = a[i];
    }
    for (let i = 0; i < b.length; i++) {
      c[i].im = b[i];
    }
    this.transform(c);
    let tmpa = c[0].add(c[0].conj()).div(2);
    let tmpb = c[0].sub(c[0].conj()).div(-2).mul(Complex.I);
    let res = [tmpa.mul(tmpb)];
    for (let i = 1; i < this.n; i++) {
      tmpa = c[i].add(c[this.n - i].conj()).div(2);
      tmpb = c[i].sub(c[this.n - i].conj()).div(-2).mul(Complex.I);
      res.push(tmpa.mul(tmpb));
    }
    this.transform(res, true);
    for (let i = 0; i < this.n; i++) {
      res[i] = res[i].re;
    }
    return res;
  }
}

export { FFTConv };
