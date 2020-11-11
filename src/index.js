// Defaults

const defaultInstanceSettings = {}

const defaultTweenSettings = {
  duration: 1000,
  round: 0
}

const validTransforms = ['translateX', 'translateY', 'translateZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'skew', 'skewX', 'skewY', 'perspective'];

// Caching

const cache = {
  CSS: {}
}

// Utils

function minMax(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function stringContains(str, text) {
  return str.indexOf(text) > -1;
}

const is = {
  arr: a => Array.isArray(a),
  obj: a => stringContains(Object.prototype.toString.call(a), 'Object'),
  pth: a => is.obj(a) && a.hasOwnProperty('totalLength'),
  svg: a => a instanceof SVGElement,
  inp: a => a instanceof HTMLInputElement,
  dom: a => a.nodeType || is.svg(a),
  str: a => typeof a === 'string',
  fnc: a => typeof a === 'function',
  und: a => typeof a === 'undefined',
  hex: a => /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(a),
  rgb: a => /^rgb/.test(a),
  hsl: a => /^hsl/.test(a),
  col: a => (is.hex(a) || is.rgb(a) || is.hsl(a)),
  key: a => !defaultInstanceSettings.hasOwnProperty(a) && !defaultTweenSettings.hasOwnProperty(a) && a !== 'targets' && a !== 'keyframes'
}

const penner = (() => {

  // Based on jQuery UI's implemenation of easing equations from Robert Penner (http://www.robertpenner.com/easing)

  const eases = { linear: () => t => t };
  return eases;

})();


// Strings

function selectString(str) {
  try {
    let nodes = document.querySelectorAll(str);
    return nodes;
  }
  catch (e) {
    return;
  }
}

// Arrays

function filterArray(arr, callback) {
  const len = arr.length;
  const thisArg = arguments.length >= 2 ? arguments[1] : void 0;
  const result = [];
  for (let i = 0; i < len; i++) {
    if (i in arr) {
      const val = arr[i];
      if (callback.call(thisArg, val, i, arr)) {
        result.push(val);
      }
    }
  }
  return result;
}

function flattenArray(arr) {
  return arr.reduce((a, b) => a.concat(is.arr(b) ? flattenArray(b) : b), []);
}

function toArray(o) {
  if (is.arr(o)) return o;
  if (is.str(o)) o = selectString(o) || o;
  if (o instanceof NodeList || o instanceof HTMLCollection) return [].slice.call(o);
  return [o];
}

function arrayContains(arr, val) {
  return arr.some(a => a === val);
}

// Objects

function cloneObject(o) {
  const clone = {};
  for (let p in o) clone[p] = o[p];
  return clone;
}

function replaceObjectProps(o1, o2) {
  const o = cloneObject(o1);
  for (let p in o1) o[p] = o2.hasOwnProperty(p) ? o2[p] : o1[p];
  return o;
}

function mergeObjects(o1, o2) {
  const o = cloneObject(o1);
  for (let p in o2) o[p] = is.und(o1[p]) ? o2[p] : o1[p];
  return o;
}

// Colors

function rgbToRgba(rgbValue) {
  const rgb = /rgb\((\d+,\s*[\d]+,\s*[\d]+)\)/g.exec(rgbValue);
  return rgb ? `rgba(${rgb[1]},1)` : rgbValue;
}

function hexToRgba(hexValue) {
  const rgx = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const hex = hexValue.replace(rgx, (m, r, g, b) => r + r + g + g + b + b);
  const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  const r = parseInt(rgb[1], 16);
  const g = parseInt(rgb[2], 16);
  const b = parseInt(rgb[3], 16);
  return `rgba(${r},${g},${b},1)`;
}

function hslToRgba(hslValue) {
  const hsl = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hslValue) || /hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/g.exec(hslValue);
  const h = parseInt(hsl[1], 10) / 360;
  const s = parseInt(hsl[2], 10) / 100;
  const l = parseInt(hsl[3], 10) / 100;
  const a = hsl[4] || 1;

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  let r, g, b;
  if (s == 0) {
    r = g = b = l;
  }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return `rgba(${r * 255},${g * 255},${b * 255},${a})`;
}

function colorToRgb(val) {
  if (is.rgb(val)) return rgbToRgba(val);
  if (is.hex(val)) return hexToRgba(val);
  if (is.hsl(val)) return hslToRgba(val);
}

// Units

function getUnit(val) {
  const split = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(val);
  if (split) return split[1];
}

function getTransformUnit(propName) {
  if (stringContains(propName, 'translate') || propName === 'perspective') return 'px';
  if (stringContains(propName, 'rotate') || stringContains(propName, 'skew')) return 'deg';
}

// Values

function getFunctionValue(val, animatable) {
  if (!is.fnc(val)) return val;
  return val(animatable.target, animatable.id, animatable.total);
}

function getAttribute(el, prop) {
  return el.getAttribute(prop);
}

function convertPxToUnit(el, value, unit) {
  const valueUnit = getUnit(value);
  if (arrayContains([unit, 'deg', 'rad', 'turn'], valueUnit)) return value;
  const cached = cache.CSS[value + unit];
  if (!is.und(cached)) return cached;
  const baseline = 100;
  const tempEl = document.createElement(el.tagName);
  const parentEl = (el.parentNode && (el.parentNode !== document)) ? el.parentNode : document.body;
  parentEl.appendChild(tempEl);
  tempEl.style.position = 'absolute';
  tempEl.style.width = baseline + unit;
  const factor = baseline / tempEl.offsetWidth;
  parentEl.removeChild(tempEl);
  const convertedUnit = factor * parseFloat(value);
  cache.CSS[value + unit] = convertedUnit;
  return convertedUnit;
}

function getCSSValue(el, prop, unit) {
  if (prop in el.style) {
    const uppercasePropName = prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const value = el.style[prop] || getComputedStyle(el).getPropertyValue(uppercasePropName) || '0';
    return unit ? convertPxToUnit(el, value, unit) : value;
  }
}

function getAnimationType(el, prop) {
  if (is.dom(el) && !is.inp(el) && (getAttribute(el, prop) || (is.svg(el) && el[prop]))) return 'attribute';
  if (is.dom(el) && arrayContains(validTransforms, prop)) return 'transform';
  if (is.dom(el) && (prop !== 'transform' && getCSSValue(el, prop))) return 'css';
  if (el[prop] != null) return 'object';
}

function getElementTransforms(el) {
  if (!is.dom(el)) return;
  const str = el.style.transform || '';
  const reg = /(\w+)\(([^)]*)\)/g;
  const transforms = new Map();
  let m;
  while (m = reg.exec(str)) transforms.set(m[1], m[2]);
  return transforms;
}

function getTransformValue(el, propName, animatable, unit) {
  const defaultVal = stringContains(propName, 'scale') ? 1 : 0 + getTransformUnit(propName);
  const value = getElementTransforms(el).get(propName) || defaultVal;
  if (animatable) {
    animatable.transforms.list.set(propName, value);
    animatable.transforms['last'] = propName;
  }
  return unit ? convertPxToUnit(el, value, unit) : value;
}

function getOriginalTargetValue(target, propName, unit, animatable) {
  switch (getAnimationType(target, propName)) {
    case 'transform':
      return getTransformValue(target, propName, animatable, unit);
    case 'css':
      return getCSSValue(target, propName, unit);
    case 'attribute':
      return getAttribute(target, propName);
    default:
      return target[propName] || 0;
  }
}

function getRelativeValue(to, from) {
  const operator = /^(\*=|\+=|-=)/.exec(to);
  if (!operator) return to;
  const u = getUnit(to) || 0;
  const x = parseFloat(from);
  const y = parseFloat(to.replace(operator[0], ''));
  switch (operator[0][0]) {
    case '+':
      return x + y + u;
    case '-':
      return x - y + u;
    case '*':
      return x * y + u;
  }
}

function validateValue(val, unit) {
  if (is.col(val)) return colorToRgb(val);
  if (/\s/g.test(val)) return val;
  const originalUnit = getUnit(val);
  const unitLess = originalUnit ? val.substr(0, val.length - originalUnit.length) : val;
  if (unit) return unitLess + unit;
  return unitLess;
}

// Decompose value

function decomposeValue(val, unit) {
  // const rgx = /-?\d*\.?\d+/g; // handles basic numbers
  // const rgx = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
  const rgx = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
  const value = validateValue((is.pth(val) ? val.totalLength : val), unit) + '';
  return {
    original: value,
    numbers: value.match(rgx) ? value.match(rgx).map(Number) : [0],
    strings: (is.str(val) || unit) ? value.split(rgx) : []
  }
}

// Animatables

function parseTargets(targets) {
  const targetsArray = targets ? (flattenArray(is.arr(targets) ? targets.map(toArray) : toArray(targets))) : [];
  return filterArray(targetsArray, (item, pos, self) => self.indexOf(item) === pos);
}

function getAnimatables(targets) {
  const parsed = parseTargets(targets);
  return parsed.map((t, i) => {
    return { target: t, id: i, total: parsed.length, transforms: { list: getElementTransforms(t) } };
  });
}

// Properties

function normalizePropertyTweens(prop, tweenSettings) {
  let settings = cloneObject(tweenSettings);
  if (is.arr(prop)) {
    const l = prop.length;
    const isFromTo = (l === 2 && !is.obj(prop[0]));
    if (!isFromTo) {
      // Duration divided by the number of tweens
      if (!is.fnc(tweenSettings.duration)) settings.duration = tweenSettings.duration / l;
    }
    else {
      // Transform [from, to] values shorthand to a valid tween value
      prop = { value: prop };
    }
  }
  const propArray = is.arr(prop) ? prop : [prop];
  return propArray.map((v, i) => {
    const obj = (is.obj(v) && !is.pth(v)) ? v : { value: v };
    return obj;
  }).map(k => mergeObjects(k, settings));
}

function getProperties(tweenSettings, params) {
  const properties = [];
  for (let p in params) {
    if (is.key(p)) {
      properties.push({
        name: p,
        tweens: normalizePropertyTweens(params[p], tweenSettings)
      });
    }
  }
  return properties;
}

// Tweens

function normalizeTweenValues(tween, animatable) {
  const t = {};
  for (let p in tween) {
    let value = getFunctionValue(tween[p], animatable);
    if (is.arr(value)) {
      value = value.map(v => getFunctionValue(v, animatable));
      if (value.length === 1) value = value[0];
    }
    t[p] = value;
  }
  t.duration = parseFloat(t.duration);
  return t;
}

function normalizeTweens(prop, animatable) {
  let previousTween;
  return prop.tweens.map(t => {
    const tween = normalizeTweenValues(t, animatable);
    const tweenValue = tween.value;
    let to = is.arr(tweenValue) ? tweenValue[1] : tweenValue;
    const toUnit = getUnit(to);
    const originalValue = getOriginalTargetValue(animatable.target, prop.name, toUnit, animatable);
    const previousValue = previousTween ? previousTween.to.original : originalValue;
    const from = is.arr(tweenValue) ? tweenValue[0] : previousValue;
    const fromUnit = getUnit(from) || getUnit(originalValue);
    const unit = toUnit || fromUnit;
    if (is.und(to)) to = previousValue;
    tween.from = decomposeValue(from, unit);
    tween.to = decomposeValue(getRelativeValue(to, from), unit);
    tween.start = previousTween ? previousTween.end : 0;
    tween.end = tween.start + tween.duration;
    tween.isPath = false;
    tween.isColor = is.col(tween.from.original);
    if (tween.isColor) tween.round = 1;
    previousTween = tween;
    return tween;
  });
}

// Tween progress

const setProgressValue = {
  css: (t, p, v) => t.style[p] = v,
  attribute: (t, p, v) => t.setAttribute(p, v),
  object: (t, p, v) => t[p] = v,
  transform: (t, p, v, transforms, manual) => {
    transforms.list.set(p, v);
    if (p === transforms.last || manual) {
      let str = '';
      transforms.list.forEach((value, prop) => { str += `${prop}(${value}) `; });
      t.style.transform = str;
    }
  }
}

// Set Value helper

function setTargetsValue(targets, properties) {
  const animatables = getAnimatables(targets);
  animatables.forEach(animatable => {
    for (let property in properties) {
      const value = getFunctionValue(properties[property], animatable);
      const target = animatable.target;
      const valueUnit = getUnit(value);
      const originalValue = getOriginalTargetValue(target, property, valueUnit, animatable);
      const unit = valueUnit || getUnit(originalValue);
      const to = getRelativeValue(validateValue(value, unit), originalValue);
      const animType = getAnimationType(target, property);
      setProgressValue[animType](target, property, to, animatable.transforms, true);
    }
  });
}

// Animations

function createAnimation(animatable, prop) {
  const animType = getAnimationType(animatable.target, prop.name);
  if (animType) {
    const tweens = normalizeTweens(prop, animatable);
    const lastTween = tweens[tweens.length - 1];
    return {
      type: animType,
      property: prop.name,
      animatable: animatable,
      tweens: tweens,
      duration: lastTween.end
    }
  }
}

function getAnimations(animatables, properties) {
  return filterArray(flattenArray(animatables.map(animatable => {
    return properties.map(prop => {
      return createAnimation(animatable, prop);
    });
  })), a => !is.und(a));
}

// Create Instance

function getInstanceTimings(animations, tweenSettings) {
  const animLength = animations.length;
  const timings = {};
  timings.duration = animLength ? Math.max.apply(Math, animations.map(anim => anim.duration)) : tweenSettings.duration;
  return timings;
}

let instanceID = 0;

function createNewInstance(params) {
  const instanceSettings = replaceObjectProps(defaultInstanceSettings, params);
  const tweenSettings = replaceObjectProps(defaultTweenSettings, params);
  const properties = getProperties(tweenSettings, params);
  const animatables = getAnimatables(params.targets);
  const animations = getAnimations(animatables, properties);
  const timings = getInstanceTimings(animations, tweenSettings);
  const id = instanceID;
  instanceID++;
  return mergeObjects(instanceSettings, {
    id: id,
    children: [],
    animatables: animatables,
    animations: animations,
    duration: timings.duration
  });
}

// Public Instance

function anime(params = {}) {
  let children, childrenLength = 0;
  let resolve = null;

  function makePromise(instance) {
    const promise = window.Promise && new Promise(_resolve => resolve = _resolve);
    instance.finished = promise;
    return promise;
  }

  let instance = createNewInstance(params);
  let promise = makePromise(instance);

  function seekChild(time, child) {
    if (child) child.seek(time);
  }

  function syncInstanceChildren(time) {
    if (!instance.reversePlayback) {
      for (let i = 0; i < childrenLength; i++) seekChild(time, children[i]);
    }
    else {
      for (let i = childrenLength; i--;) seekChild(time, children[i]);
    }
  }

  function setAnimationsProgress(insTime) {
    let i = 0;
    const animations = instance.animations;
    const animationsLength = animations.length;
    while (i < animationsLength) {
      const anim = animations[i];
      const animatable = anim.animatable;
      const tweens = anim.tweens;
      const tweenLength = tweens.length - 1;
      let tween = tweens[tweenLength];
      // Only check for keyframes if there is more than one tween
      if (tweenLength) tween = filterArray(tweens, t => (insTime < t.end))[0] || tween;
      const elapsed = minMax(insTime - tween.start, 0, tween.duration) / tween.duration;
      const strings = tween.to.strings;
      const round = tween.round;
      const numbers = [];
      const toNumbersLength = tween.to.numbers.length;
      let progress;
      for (let n = 0; n < toNumbersLength; n++) {
        let value;
        const toNumber = tween.to.numbers[n];
        const fromNumber = tween.from.numbers[n] || 0;
        value = fromNumber + (elapsed * (toNumber - fromNumber));

        if (round) {
          if (!(tween.isColor && n > 2)) {
            value = Math.round(value * round) / round;
          }
        }
        numbers.push(value);
      }
      // Manual Array.reduce for better performances
      const stringsLength = strings.length;
      if (!stringsLength) {
        progress = numbers[0];
      }
      else {
        progress = strings[0];
        for (let s = 0; s < stringsLength; s++) {
          const a = strings[s];
          const b = strings[s + 1];
          const n = numbers[s];
          if (!isNaN(n)) {
            if (!b) {
              progress += n + ' ';
            }
            else {
              progress += n + b;
            }
          }
        }
      }
      setProgressValue[anim.type](animatable.target, anim.property, progress, animatable.transforms);
      anim.currentValue = progress;
      i++;
    }
  }

  function setInstanceProgress(engineTime) {
    const insDuration = instance.duration;
    const insTime = engineTime;
    instance.progress = minMax((insTime / insDuration) * 100, 0, 100);
    instance.reversePlayback = insTime < instance.currentTime;
    if (children) { syncInstanceChildren(insTime); }
    if (!instance.began && instance.currentTime > 0) {
      instance.began = true;
    }

    setAnimationsProgress(insTime);

    instance.currentTime = minMax(insTime, 0, insDuration);
    if (engineTime >= insDuration) {
      instance.paused = true;
      if (!instance.completed) {
        instance.completed = true;
        if (!instance.passThrough && 'Promise' in window) {
          resolve();
          promise = makePromise(instance);
        }
      }
    }
  }

  instance.reset = function() {
    instance.passThrough = false;
    instance.currentTime = 0;
    instance.progress = 0;
    instance.paused = true;
    instance.began = false;
    instance.completed = false;
    instance.reversePlayback = false;
    children = instance.children;
    childrenLength = children.length;
    for (let i = childrenLength; i--;) instance.children[i].reset();
  }

  // Set Value helper

  instance.set = function(targets, properties) {
    setTargetsValue(targets, properties);
    return instance;
  }

  instance.seek = function(time) {
    setInstanceProgress(time);
  }

  instance.reset();

  return instance;
}

// getTotalLength() equivalent for circle, rect, polyline, polygon and line shapes
// adapted from https://gist.github.com/SebLambla/3e0550c496c236709744

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getCircleLength(el) {
  return Math.PI * 2 * getAttribute(el, 'r');
}

function getRectLength(el) {
  return (getAttribute(el, 'width') * 2) + (getAttribute(el, 'height') * 2);
}

function getLineLength(el) {
  return getDistance({ x: getAttribute(el, 'x1'), y: getAttribute(el, 'y1') }, { x: getAttribute(el, 'x2'), y: getAttribute(el, 'y2') });
}

function getPolylineLength(el) {
  const points = el.points;
  let totalLength = 0;
  let previousPos;
  for (let i = 0; i < points.numberOfItems; i++) {
    const currentPos = points.getItem(i);
    if (i > 0) totalLength += getDistance(previousPos, currentPos);
    previousPos = currentPos;
  }
  return totalLength;
}

function getPolygonLength(el) {
  const points = el.points;
  return getPolylineLength(el) + getDistance(points.getItem(points.numberOfItems - 1), points.getItem(0));
}

// Path animation
function getTotalLength(el) {
  if (el.getTotalLength) return el.getTotalLength();
  switch (el.tagName.toLowerCase()) {
    case 'circle':
      return getCircleLength(el);
    case 'rect':
      return getRectLength(el);
    case 'line':
      return getLineLength(el);
    case 'polyline':
      return getPolylineLength(el);
    case 'polygon':
      return getPolygonLength(el);
  }
}

function setDashoffset(el) {
  const pathLength = getTotalLength(el);
  el.setAttribute('stroke-dasharray', pathLength);
  return pathLength;
}

// Motion path

function getParentSvgEl(el) {
  let parentEl = el.parentNode;
  while (is.svg(parentEl)) {
    if (!is.svg(parentEl.parentNode)) break;
    parentEl = parentEl.parentNode;
  }
  return parentEl;
}

function getParentSvg(pathEl, svgData) {
  const svg = svgData || {};
  const parentSvgEl = svg.el || getParentSvgEl(pathEl);
  const rect = parentSvgEl.getBoundingClientRect();
  const viewBoxAttr = getAttribute(parentSvgEl, 'viewBox');
  const width = rect.width;
  const height = rect.height;
  const viewBox = svg.viewBox || (viewBoxAttr ? viewBoxAttr.split(' ') : [0, 0, width, height]);
  return {
    el: parentSvgEl,
    viewBox: viewBox,
    x: viewBox[0] / 1,
    y: viewBox[1] / 1,
    w: width,
    h: height,
    vW: viewBox[2],
    vH: viewBox[3]
  }
}

function getPath(path, percent) {
  const pathEl = is.str(path) ? selectString(path)[0] : path;
  const p = percent || 100;
  return function() {
    return {
      el: pathEl,
      svg: getParentSvg(pathEl),
      totalLength: getTotalLength(pathEl) * (p / 100)
    }
  }
}

function getPathProgress(path, progress, isPathTargetInsideSVG) {
  function point(offset = 0) {
    const l = progress + offset >= 1 ? progress + offset : 0;
    return path.el.getPointAtLength(l);
  }
  const svg = getParentSvg(path.el, path.svg)
  const p = point();
  const p0 = point(-1);
  const p1 = point(+1);
  const scaleX = isPathTargetInsideSVG ? 1 : svg.w / svg.vW;
  const scaleY = isPathTargetInsideSVG ? 1 : svg.h / svg.vH;
  return {
    x: (p.x - svg.x) * scaleX,
    y: (p.y - svg.y) * scaleY,
    angle: Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI
  }
}


anime.version = '3.1.0';
anime.get = getOriginalTargetValue;
anime.set = setTargetsValue;
anime.convertPx = convertPxToUnit;
anime.penner = penner;
anime.path = getPath;
anime.getPathProgress = getPathProgress;

export default anime;
