const COLORMAPS = ['BrBG', 'PiYG', 'PRGn', 'PuOr', 'RdBu', 'RdGy', 'RdYlBu', 'RdYlGn'];
const REDS = ['brown', 'pink', 'purple', 'brown', 'red', 'red', 'red', 'red'];
const GREENS = ['blue', 'green', 'green', 'purple', 'blue', 'grey', 'blue', 'green'];
const SCALES = ['10', '11', '12.5', '15', '17.5', '20', '25', '33', '40', '50', '67', '75', '80', '90', '100', '110', '125', '150', '175', '200', '250', '300', '400', '500'];
const PAIRS = ['btc-usd', 'btc-xau', 'xau-usd'];
const PAIR_LABELS = ['BTC/USD', 'BTC/XAU', 'XAU/USD'];
const ASSET_LABELS = ['bitcoin', 'bitcoin', 'gold'];
const DOMAIN = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.625, 0.725, 0.85, 1.0];
const LINE = 'line.png';
const DOT = 'dot.png';
const SEGMENT = 1024;

var bitcoinPrices;
var goldPrices;
var halvings;
var size;
var buy, sell;
var mouseX, mouseY;
var pinned = false;

var scaleSpanClearTimeout;
var paletteSpanClearTimeout;
var showHelp = false;

async function onLoad() {
  bitcoinPrices = await fetch('/api/bitcoin/prices').then(res => res.json())
  halvings = await fetch('/api/bitcoin/halvings').then(res => res.json())

  size = bitcoinPrices.prices.length - 1;

  const borderDiv = document.getElementById('border')

  const blocks = Math.floor(size / SEGMENT) + 1
  for (var y = 0; y < blocks; y++) {
    for (var x = y; x < blocks; x++) {
      const canvas = document.createElement('canvas')
      canvas.classList.add('hodl')
      canvas.id = `hodl-${x}-${y}`
      canvas.setAttribute('data-x', x)
      canvas.setAttribute('data-y', y)
      canvas.style.setProperty('--x-offset', `${x * SEGMENT}px`)
      canvas.style.setProperty('--y-offset', `${y * SEGMENT}px`)
      canvas.addEventListener('mousemove', onMouseMove)
      canvas.addEventListener('mouseleave', onMouseLeave)
      canvas.addEventListener('touchend', onTouchEnd)
      canvas.addEventListener('click', onClick)
      canvas.width = x < blocks - 1 ? SEGMENT : size - ((blocks - 1) * SEGMENT)
      canvas.height = y < blocks - 1 ? SEGMENT : size - ((blocks - 1) * SEGMENT)

      borderDiv.append(canvas)
    }
  }

  init();
}

async function init() {
  var hashParameters = getHashParameters();
  
  if (localStorage.getItem('pair') === null) {
    localStorage.pair = 0;
  }
  var pair = PAIRS.indexOf(hashParameters.get('pair'));
  if (pair != -1) {
    localStorage.pair = pair;
  }
  await setPair();

  if (localStorage.getItem('palette') === null) {
    localStorage.palette = 7;
  }
  var palette = COLORMAPS.indexOf(hashParameters.get('palette'));
  if (palette != -1) {
    localStorage.palette = palette;
    setColorSpans();
  }

  if (localStorage.getItem('scaleIndex') === null) {
    localStorage.scaleIndex = 7;
  }
  var scaleIndex = SCALES.indexOf(hashParameters.get('scale'));
  if (scaleIndex != -1) {
    localStorage.scaleIndex = scaleIndex;
  }

  var pin = hashParameters.get('pin');
  if (pin) {
    var dates = pin.split('_');
    for (var index = 0; index <= size; index++) {
      var date = formatDate(getIndexDate(index));
      if (date == dates[0]) {
        buy = index;
      }
      if (date == dates[1]) {
        sell = index;
      }
    }
    pinned = buy && sell;
    updateMarker();
  }

  var wrapperDiv =  document.getElementById('wrapper');
  var scrollbarWidth = wrapperDiv.offsetWidth - wrapperDiv.clientWidth;
  setProperty('--scrollbar-width', `${scrollbarWidth}px`);

  setInnerHTML('start-date', formatDate(getIndexDate(0)));
  setInnerHTML('updated-date', formatDate(getIndexDate(bitcoinPrices.prices.length - 1)));

  createLabels();

  setScale();

  var colorMap = getColorMap();
  drawIndex(colorMap);
  drawHodl(colorMap);

  if (getPalette() != 7) {
    setPaletteSpan();
  }
  if (getScaleIndex() != 7) {
    setScaleSpan();
  }
}

async function setPair() {
  if (!goldPrices && PAIRS[localStorage.pair].indexOf('xau') != -1) {
    goldPrices = await fetch(`api/gold/prices?since=${bitcoinPrices.since}`).then(res => res.json())
  }
  getPrice = getPriceFunction();
  formatPrice = formatPriceFunction();
  setInnerHTML('pair', PAIR_LABELS[localStorage.pair]);
  setInnerHTML('asset', ASSET_LABELS[localStorage.pair]);
}

function getPriceFunction() {
  switch (PAIRS[localStorage.pair]) {
    case 'btc-usd': return function(index) { return bitcoinPrices.prices[index] };
    case 'btc-xau': return function(index) { return bitcoinPrices.prices[index] / goldPrices.prices[index] };
    case 'xau-usd': return function(index) { return goldPrices.prices[index] };
  }
}

function formatPriceFunction() {
  switch (PAIRS[localStorage.pair].split('-')[1]) {
    case 'usd': return function(index) { return '$' + getPrice(index).toFixed(2) };
    case 'xau': return function(index) { return getPrice(index).toFixed(4) + ' t oz' };
  }
}

function drawIndex(colorMap) {
  var colorMapCanvas = document.getElementById('colormap');
  var colorMapContext = colorMapCanvas.getContext('2d');

  var imageData = colorMapContext.createImageData(1, 401);
  imageData.data.set(new Uint8ClampedArray(colorMap.buffer));
  for (var i = 0; i < 25; i++) {
    colorMapContext.putImageData(imageData, i, 0);
  }
}

function drawHodl(colorMap) {
  var hodlLine = 0;
  var hodlBuy;
  var hodlSell;

  const blocks = Math.floor(size / SEGMENT) + 1
  for (var blocky = 0; blocky < blocks; blocky++) {
    for (var blockx = blocky; blockx < blocks; blockx++) {
      var hodlCanvas = document.getElementById(`hodl-${blockx}-${blocky}`);
    
      var hodlContext = hodlCanvas.getContext('2d');

      var imageData = hodlContext.createImageData(hodlCanvas.width, hodlCanvas.height);
      var buffer = new ArrayBuffer(imageData.data.length);
      var pixels = new Uint32Array(buffer);
      pixels.fill(colorMap[200]);

      var offset = 0;
      for (var y = 0; y < hodlCanvas.height; y++) {
        for (var x = 0; x < hodlCanvas.width; x++) {
          var buydate = y + (blocky * SEGMENT)
          var selldate = x + (blockx * SEGMENT) + 1

          if (buydate < selldate) {
            var profit = getProfit(buydate, selldate);
            var duration = selldate - buydate;
            if (profit < 0 && hodlLine < duration) {
              hodlLine = duration;
              hodlBuy = buydate;
              hodlSell = selldate;
            }
            pixels[offset + x] = colorMap[getColorIndex(profit)]
          }
        }
        offset += hodlCanvas.width
      }   

      imageData.data.set(new Uint8ClampedArray(buffer));
      hodlContext.putImageData(imageData, 0, 0);    
    }
  }

  setProperty('--hodl-line', `${hodlLine}px`);
  setProperty('--hodl-line-length', `${(size - hodlLine) * Math.sqrt(2)}px`);
  setInnerHTML('hodl-line', `hodl line: ${formatDuration(hodlBuy, hodlSell)}`);

  setProperty('--background-color', getColorScale().colors()[5]);
  setProperty('--display-about', 'block');
}

function createLabels() {
  var ath = 0;
  var athPrice = 0;
  var atl = 0;
  var atlPrice = Number.MAX_VALUE;
  var labelsDiv = document.getElementById('labels');
  for (var index = 0; index <= size; index++) {
    var price = bitcoinPrices.prices[index];
    if (price > athPrice) {
      ath = index;
      athPrice = price;
      atlPrice = Number.MAX_VALUE;
    }
    if (price < atlPrice) {
      atl = index;
      atlPrice = price;
    }
    var date = getIndexDate(index);
    if (date.getDate() == 1) {
      if (date.getMonth() == 0) {
        var yearLabelDiv = createLabelDiv(index, date.getFullYear());
        labelsDiv.appendChild(yearLabelDiv);
      }

      var monthDotImg = createDotImg(index, date.getMonth() == 0 ? LINE : DOT);
      labelsDiv.appendChild(monthDotImg);
    }

    var halvingIndex = halvings.indexOf(formatDate(date));
    if (halvingIndex != -1) {

      var labelDiv = createGridDiv(index, halvingIndex);
      labelsDiv.appendChild(labelDiv);

      if (halvingIndex % 4 == 0) {
        var halving = ordinal(halvingIndex / 4);
        var halvingLabelDiv = createLabelDiv(index, `&puncsp;${halving} halving`);
        labelsDiv.appendChild(halvingLabelDiv);

        var halvingDotImg = createDotImg(index, LINE);
        labelsDiv.appendChild(halvingDotImg);

        var athLabelDiv = createLabelDiv(ath, formatPrice(ath));
        athLabelDiv.classList.add('grid-price');
        labelsDiv.append(athLabelDiv);
        athPrice = 0;

        var atlLabelDiv = createLabelDiv(atl, formatPrice(atl));
        atlLabelDiv.classList.add('grid-price');
        labelsDiv.append(atlLabelDiv);
        atlPrice = Number.MAX_VALUE;
      }
    }
  }
  var athLabelDiv = createLabelDiv(ath, formatPrice(ath));
  athLabelDiv.classList.add('grid-price');
  labelsDiv.append(athLabelDiv);
  var atlLabelDiv = createLabelDiv(atl, formatPrice(atl));
  atlLabelDiv.classList.add('grid-price');
  labelsDiv.append(atlLabelDiv);
}

function createLabelDiv(index, innerHTML) {
  var labelDiv = document.createElement('div');
  labelDiv.classList.add('index', 'label');
  labelDiv.innerHTML = innerHTML;
  labelDiv.style.setProperty('--index', `${index}px`);
  return labelDiv;
}

function createDotImg(index, src) {
  var dotImg = document.createElement('img');
  dotImg.classList.add('index', 'dot');
  dotImg.src = src;
  dotImg.style.setProperty('--index', `${index}px`);
  return dotImg;
}

function createGridDiv(index, halvingIndex) {
  var gridDiv = document.createElement('div');
  gridDiv.classList.add('index', 'grid');
  if (halvingIndex % 4 != 0) {
    gridDiv.classList.add('minor');
  }
  gridDiv.style.setProperty('--index', `${index}px`);
  return gridDiv;
}

function ordinal(i) {
  var ending = i % 10;
  var tens = i % 100;
  if (ending == 1 && tens != 11) {
      return i + 'st';
  }
  if (ending == 2 && tens != 12) {
      return i + 'nd';
  }
  if (ending == 3 && tens != 13) {
      return i + 'rd';
  }
  return i + 'th';
}

function getColorMap() {
  var colorScale = getColorScale();
  var colors = colorScale.mode('lab').domain(DOMAIN).colors(401, 'rgb');
  var buffer = colors.reverse().map(rgb => (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]);
  return new Uint32Array(buffer);
}

function getColorScale() {
  return chroma.scale(COLORMAPS[getPalette()]);
}

function onMouseMove(event) {
  mouseX = (event.srcElement.getAttribute('data-x') * SEGMENT) + event.offsetX
  mouseY = (event.srcElement.getAttribute('data-y') * SEGMENT) + event.offsetY
  
  setProperty('--cursor', mouseX >= mouseY ? 'crosshair' : 'default');

  updateMarker();
}

function onMouseLeave(event) {
  if (!pinned) {
    mouseX = -1;
    mouseY = -1;
  }

  updateMarker();
}

function onClick(event) {
  if (mouseX >= mouseY) {
    pinned = !pinned;
    
    updateMarker();
  }  
}

function onTouchEnd(event) {
  // cancelable event is a click, not a drag
  if (event.cancelable) {
    pinned = false;
    
    updateMarker();
  }
}

function onKeyDown(event) {
  var step = event.shiftKey ? 10 : 1;
  switch (event.code) {
    case 'KeyW':
      pinned = true;
      buy = Math.max(0, buy - step);
      break;
    case 'KeyS':
      pinned = true;
      buy = Math.min(sell - 1, buy + step);
      break;
    case 'KeyA':
      pinned = true;
      sell = Math.max(buy + 1, sell - step);
      break;
    case 'KeyD':
      pinned = true;
      sell = Math.min(size, sell + step);
      break;
    case 'Space':
      pinned = !pinned;
      break;
    default:
      return;
  }
  updateMarker();
}

function updateMarker() {
  setProperty('--display-pinned', pinned ? 'block' : 'none');

  if (!pinned) {
    sell = mouseX;
    buy = mouseY + 1;
  }

  if (sell > 0 && sell <= size &&
      buy >= 0 && buy <= size &&
      buy < sell) {
    
    var buyDate = formatDate(getIndexDate(buy));
    var buyPrice = formatPrice(buy);
    var sellDate = formatDate(getIndexDate(sell));
    var sellPrice = formatPrice(sell);
    var duration = formatDuration(buy, sell);
    var profitValue = getProfit(buy, sell);
    var profit = Math.abs(profitValue).toFixed(2);

    setInnerHTML('tip',
      `entry on ${buyDate} for ${buyPrice}<br>`+
      `&nbsp;exit on ${sellDate} for ${sellPrice}<br>` +
      `&nbsp;&nbsp;&nbsp;&nbsp;hodl ${duration}<br>` +
      `&nbsp;&nbsp;${profitValue < 0 ? '&nbsp;&nbsp;loss' : 'profit'} ${profit}%`);

    var colorIndex = getColorIndex(profitValue);
    setProperty('--color-index', `${colorIndex}px`);
    setProperty('--display-marker', 'block');
    setProperty('--x-position', `${sell - 1}px`);
    setProperty('--y-position', `${buy}px`);

    setInnerHTML('y-label', `entry on ${buyDate}`);
    setInnerHTML('x-label', `exit on ${sellDate}`);
    setInnerHTML('x-price', `for ${sellPrice}`)
    setInnerHTML('y-price', `for ${buyPrice}`)
    setInnerHTML('profit', `${profitValue < 0 ? 'loss' : 'profit'} ${profit}%`);
    setInnerHTML('duration', `hodl ${duration}`);

    var hashParameters = getHashParameters();
    if (pinned) {
      hashParameters.set('pin', buyDate+'_'+sellDate);
    } else {
      hashParameters.delete('pin');
    }
    setHashParameters(hashParameters);
  } else {
    setProperty('--display-marker', 'none');
    setProperty('--cursor', 'default');
    var hashParameters = getHashParameters();
    hashParameters.delete('pin');
    setHashParameters(hashParameters);
  }
}

function getColorIndex(profit) {
  if (profit <= 0) {
    i = profit;
  } else {
    i = Math.log10(profit) * 10;
  }
  return 200 - ((i * 2) | 0);
}

function getProfit(buy, sell) {
  var buyPrice = getPrice(buy);
  var sellPrice = getPrice(sell);
  return (sellPrice - buyPrice) / buyPrice * 100;
}

function getIndexDate(index) {
  var date = new Date(bitcoinPrices.since);
  date.setDate(date.getDate() + index);
  return date;
}

function formatDate(date) {
  return date.getFullYear().toString() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0');
}

function formatDuration(buyEpoch, sellEpoch) {
  var buyDate = getIndexDate(buyEpoch);
  var sellDate = getIndexDate(sellEpoch);
  var year = sellDate.getYear() - buyDate.getYear();
  var month = sellDate.getMonth() - buyDate.getMonth();
  var day = sellDate.getDate() - buyDate.getDate();
  if (day < 0) {
    month--;
    day += new Date(sellDate.getYear(), sellDate.getMonth(), 0).getDate();
  }
  if (month < 0) {
    year--;
    month += 12;
  }
  var y = plural(year, 'year');
  var m = plural(month, 'month');
  var d = plural(day, 'day');

  if (year != 0) {
    if (month != 0) {
      if (day != 0) {
        return y + ', ' + m + ' and ' + d;
      }
      return y + ' and ' + m;
    }
    if (day != 0) {
      return y + ' and ' + d;
    }
    return y;
  }
  if (month != 0) {
    if (day != 0) {
      return m + ' and ' + d;
    }
    return m;
  }
  return d;
}

function plural(n, word) {
  return n + ' ' + word + (n > 1 ? 's' : '');
}

async function onPairClick(event) {
  var pair = PAIR_LABELS.indexOf(event.target.text);
  localStorage.pair = pair;
  await setPair();

  var hashParameters = getHashParameters();
  hashParameters.set('pair', PAIRS[pair]);
  setHashParameters(hashParameters);

  var colorMap = getColorMap();
  drawHodl(colorMap);
  updateMarker();

  event.preventDefault();
}

function onHelpClick(event) {
  showHelp = !showHelp;
  setProperty('--display-help', showHelp ? 'block' : 'none');
  event.preventDefault();
}

function onChangePaletteClick(event) {
  var palette = (getPalette() + 1) % COLORMAPS.length;
  localStorage.palette = palette;

  var colorMap = getColorMap();
  drawIndex(colorMap);
  drawHodl(colorMap);
  setPaletteSpan();
  setPaletteHash();
  setColorSpans();
  event.preventDefault();
}

function setColorSpans() {
  setInnerHTML('red', REDS[localStorage.palette]);
  setInnerHTML('green', GREENS[localStorage.palette]);
}

function onZoomInClick(event) {
  var scaleIndex = getScaleIndex();
  if (scaleIndex < SCALES.length - 1) {
    localStorage.scaleIndex = scaleIndex + 1;
    setScale();
  }
  setScaleSpan();
  setScaleHash();
  event.preventDefault();
}

function onZoomOutClick(event) {
  var scaleIndex = getScaleIndex();
  if (scaleIndex > 0) {
    localStorage.scaleIndex = scaleIndex - 1;
    setScale();
  }
  setScaleSpan();
  setScaleHash();
  event.preventDefault();
}

function getScaleIndex() {
  return Number(localStorage.scaleIndex);
}

function getPalette() {
  return Number(localStorage.palette);
}

function setScale() {
  var scale = SCALES[getScaleIndex()] / 100;

  setProperty('--scale', scale);
  setProperty('--size', `${size * scale}px`);
}

function setScaleSpan() {
  var scale = SCALES[getScaleIndex()];
  setInnerHTML('scale', `${scale}%`);
  setProperty('--visibility-scale', 'visible')

  clearTimeout(scaleSpanClearTimeout);
  scaleSpanClearTimeout = setTimeout(function(){ setProperty('--visibility-scale', 'hidden') }, 2000);
}

function setScaleHash() {
  var hashParameters = getHashParameters();
  hashParameters.set('scale', SCALES[localStorage.scaleIndex]);
  setHashParameters(hashParameters);
}

function setPaletteSpan() {
  setInnerHTML('palette', COLORMAPS[getPalette()]);
  setProperty('--visibility-palette', 'visible')

  clearTimeout(paletteSpanClearTimeout);
  paletteSpanClearTimeout = setTimeout(function(){ setProperty('--visibility-palette', 'hidden') }, 2000);
}

function setPaletteHash() {
  var hashParameters = getHashParameters();
  hashParameters.set('palette', COLORMAPS[getPalette()]);
  setHashParameters(hashParameters);
}

function getHashParameters() {
  return new URLSearchParams(window.location.hash.substr(1));
}

function setHashParameters(hashParameters) {
  var parameters = hashParameters.toString();
  if (parameters.length > 0) {
    window.location.hash = '#' + parameters;
  } else {
    window.location.hash = '';
  }
}

function setInnerHTML(id, innerHTML) {
  var element = document.getElementById(id)
  if (element) {
    element.innerHTML = innerHTML;
  }
  var elements = document.getElementsByClassName(id);
  for (var i = 0; i < elements.length; i++) {
    elements[i].innerHTML = innerHTML;
  }
}

function setProperty(key, value) {
  document.documentElement.style.setProperty(key, value);
}
