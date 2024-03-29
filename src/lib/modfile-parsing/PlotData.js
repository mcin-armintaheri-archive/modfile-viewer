import Heap from 'collections/heap';

const DEFAULT_FREQUENCY_PLOT_OPTIONS = {
  axes: [
    { orientation: 'bottom' },
    { orientation: 'left' }
  ],
  categoryIntervals: {
    'Delta': [0.5, 4],
    'Theta': [4, 7.5],
    'Alpha': [7.5, 12.5],
    'Beta': [12.5, 20]
  }
}

export class FreqPlotData {
  static extent = { x: [Infinity, -Infinity], y: [Infinity, -Infinity] }
  constructor(startFrequency, stepSize, steps, label, options=DEFAULT_FREQUENCY_PLOT_OPTIONS) {
    this.startFrequency = startFrequency;
    this.stepSize = stepSize;
    this.steps = steps;
    this.label = label;
    this.domain = new Float32Array(steps);
    let freq = startFrequency;
    this.domain.forEach((_, i) => {
      this.domain[i] = freq;
      freq += stepSize;
    });
    this.traces = [];
    this.extent = {
      x: [0, this.domain[steps - 1]],
      y: [Infinity, -Infinity]
    };
    this.options = options;
  }
  // Use an external reference as the extent of the plot.
  setExtent(extent) {
    this.extent = extent;
    return this;
  }
  addTrace(buffer) {
    const bufmin = buffer.reduce((x, y) => Math.min(x, y), Infinity);
    const bufmax = buffer.reduce((x, y) => Math.max(x, y), -Infinity);
    this.extent.y[0] = Math.floor(Math.min(this.extent.y[0], bufmin));
    this.extent.y[1] = Math.ceil(Math.max(this.extent.y[1], bufmax));
    this.traces.push(buffer);
    return this;
  }
}

function project(theta, phi) {
  return [
    Math.sin(phi) * Math.cos(theta),
    -Math.sin(phi) * Math.sin(theta)
  ];
}

const PI = Math.PI;
const positions1020 = [
  project(-0.4 * PI, -0.5 * PI),
  project(0.4 * PI, 0.5 * PI),
  project(-0.25 * PI, -0.25 * PI),
  project(0.25 * PI, 0.25 * PI),
  project(0, -0.25 * PI),
  project(0, 0.25 * PI),
  project(0.25 * PI, -0.25 * PI),
  project(-0.25 * PI, 0.25 * PI),
  project(0.4 * PI, -0.5 * PI),
  project(-0.4 * PI, 0.5 * PI),
  project(-0.2 * PI, -0.5 * PI),
  project(0.2 * PI, 0.5 * PI),
  project(0, -0.5 * PI),
  project(0, 0.5 * PI),
  project(0.2 * PI, -0.5 * PI),
  project(-0.2 * PI, 0.5 * PI),
  project(0.5 * PI, 0.2 * PI),
  project(0, 0),
  project(-0.5 * PI, 0.2 * PI),
]

function distance(v1, v2) {
  const x = (v2[0] - v1[0]);
  const y = (v2[1] - v1[1]);
  return x*x + y*y;
}


export class CorrelationPlotData {
  constructor(electrodes, correlations, startFreq, stepSize, name='', units='uV^2/Hz') {
    this.name = name;
    this.electrodes = electrodes.map(l => l.replace(/ /g, ''));
    this.units = units;
    this.labelIndices = this.electrodes.map((_, i) => i);
    this.correlations = correlations;
    this.weights = new Float32Array(this.electrodes.length);
    this.startFreq = startFreq;
    this.stepSize = stepSize;
    this.extent = [Infinity, -Infinity];
    this.correlations.forEach(correlation => {
      correlation.forEach(freq => {
        this.extent[0] = this.extent[0] > freq ? freq : this.extent[0];
        this.extent[1] = this.extent[1] < freq ? freq : this.extent[1];
      });
    });
    this.compareWeightOfIndices = this.compareWeightOfIndices.bind(this);
  }
  compareWeightOfIndices(a, b) {
    return this.weights[a] - this.weights[b];
  }
  setExtent(min, max) {
    this.extent[0] = min;
    this.extent[1] = max;
    return this;
  }
  interpolate(k, frequency, point) {
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = 1 / distance(point, positions1020[this.labelIndices[i]]);
    }
    let intensity = 0;
    let wsum = 0;
    const indexHeap = new Heap(this.labelIndices, null, this.compareWeightOfIndices);
    const clampedK = Math.min(k, this.weights.length);
    for (let i = 0; i < clampedK; i++) {
      const nearestIndex = indexHeap.pop();
      let freqIndex = 0;
      if (this.correlations.length > 1) {
        freqIndex = Math.floor(Math.max((frequency - this.startFreq)/ this.stepSize, 0));
      }
      if (freqIndex < 0 || freqIndex >= this.correlations.length) {
        continue;
      }
      const absp = this.correlations[freqIndex][nearestIndex];
      const midpoint = (this.extent[1] + this.extent[0]) / 2;
      intensity +=  2 * this.weights[nearestIndex] * (absp - midpoint) / (this.extent[1] - this.extent[0]);
      wsum += this.weights[nearestIndex];
    }
    return intensity / wsum;
  }
}
