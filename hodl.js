const COLORMAPS = ['BrBG', 'PiYG', 'PRGn', 'PuOr', 'RdBu', 'RdGy', 'RdYlBu', 'RdYlGn', 'Spectral'];
const DOMAIN = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.625, 0.725, 0.85, 1.0];
const LINE = 'line.png';
const DOT = 'dot.png';

var prices;
var since;
const SCALES = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];
var scaleIndex = 7;
var scaleSpanClearTimeout;
var showHelp = false;
const HALVINGS = [
  '2009-01-03', '2010-04-22', '2011-01-28', '2011-12-14',
  '2012-11-28', '2013-10-09', '2014-08-11', '2015-07-29',
  '2016-07-09', '2017-06-23', '2018-05-29', '2019-05-24',
  '2020-05-14'];

function onLoad() {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType('application/txt');
  xobj.open('GET', 'btc_PriceUSD.txt', true);
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == '200') {
      var result = xobj.responseText.split("\n")
      since = new Date(result[0]);
      prices = result.slice(2).map(Number);
      
      init();
    }
  };
  xobj.send(null);
}

function init() {
  if (localStorage.getItem('palette') === null) {
    localStorage.palette = 7;
  }
  
  var wrapperDiv =  document.getElementById('wrapper');
  var scrollbarWidth = wrapperDiv.offsetWidth - wrapperDiv.clientWidth;
  setProperty('--scrollbar-width', `${scrollbarWidth}px`);
  
  setInnerHTML('date', formatDate(getIndexDate(prices.length - 1));

  createLabels();

  var size = prices.length - 1;
  setProperty('--size', `${size}px`);

  var colorMap = getColorMap();
  drawIndex(colorMap);
  drawHodl(colorMap);
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
  var size = prices.length - 1;

  var hodlCanvas = document.getElementById('hodl');
  hodlCanvas.width = size;
  hodlCanvas.height = size;
  
  var hodlContext = hodlCanvas.getContext('2d');
  drawPixels(hodlContext, colorMap);
  
  setProperty('--background-color', getColorScale().colors()[5]);
  setProperty('--display-about', 'block');
}

function drawPixels(hodlContext, colorMap) {
  var size = prices.length - 1;

  var imageData = hodlContext.createImageData(size, size);
  var buffer = new ArrayBuffer(imageData.data.length);
  var pixels = new Uint32Array(buffer);
  pixels.fill(colorMap[200]);
  
  var y = 0;
  for (var buydate = 0; buydate <= size; buydate++) {
    for (var selldate = buydate + 1; selldate <= size; selldate++) {
      var profit = getProfit(buydate, selldate);
      pixels[y + selldate - 1] = colorMap[getColorIndex(profit)];
    }
    y += size;
  }
  
  imageData.data.set(new Uint8ClampedArray(buffer));
  hodlContext.putImageData(imageData, 0, 0);
}

function createLabels() {
  var labelsDiv = document.getElementById('labels');
  for (var index = 0; index < prices.length; index++) {
    var date = getIndexDate(index);
    if (date.getDate() == 1) {
      if (date.getMonth() == 0) {
        var yearLabelDiv = createLabelDiv(index, date.getFullYear());
        labelsDiv.appendChild(yearLabelDiv);
      }
      
      var monthDotImg = createDotImg(index, date.getMonth() == 0 ? LINE : DOT);
      labelsDiv.appendChild(monthDotImg);
    }

    var halvingIndex = HALVINGS.indexOf(formatDate(date));
    if (halvingIndex != -1) {
      
      var labelDiv = createGridDiv(index, halvingIndex);
      labelsDiv.appendChild(labelDiv);
      
      if (halvingIndex % 4 == 0) {
        var halving = ordinal(halvingIndex / 4);
        var halvingLabelDiv = createLabelDiv(index, `&puncsp;${halving} halving`);
        labelsDiv.appendChild(halvingLabelDiv);
        
        var halvingDotImg = createDotImg(index, LINE);
        labelsDiv.appendChild(halvingDotImg);
      }
    }
  }
}

function createLabelDiv(index, innerHTML) {
  var labelDiv = document.createElement('div');
  labelDiv.classList.add('label');
  labelDiv.innerHTML = innerHTML;
  labelDiv.style.setProperty('--index', `${index}px`);
  return labelDiv;
}

function createDotImg(index, src) {
  var dotImg = document.createElement('img');
  dotImg.classList.add('dot');
  dotImg.src = src;
  dotImg.style.setProperty('--index', `${index}px`);
  return dotImg;
}

function createGridDiv(index, halvingIndex) {
  var gridDiv = document.createElement('div');
  gridDiv.classList.add('grid');
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
  return chroma.scale(COLORMAPS[localStorage.palette]);
}

function onMouseMove(event) {
  if (event.offsetX >= 0 && event.offsetX < prices.length &&
      event.offsetY >= 0 && event.offsetY < prices.length && 
      event.offsetX >= event.offsetY) {

    var buy = event.offsetY;
    var sell = event.offsetX + 1;
    var buyDate = formatDate(getIndexDate(buy));
    var buyPrice = formatPrice(buy);
    var sellDate = formatDate(getIndexDate(sell));
    var sellPrice = formatPrice(sell);
    var duration = formatDuration(buy, sell);
    var profit = getProfit(buy, sell);

    setInnerHTML('tip', 
      `bought on ${buyDate} for ${buyPrice}<br>`+
      `&nbsp;&nbsp;sold on ${sellDate} for ${sellPrice}<br>` + 
      `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;hodl ${duration}<br>` + 
      `&nbsp;&nbsp;&nbsp;profit ${profit}%`;
    
    var colorIndex = getColorIndex(profit);
    setProperty('--color-index', `${colorIndex}px`);
    setProperty('--display-marker', 'block');
    setProperty('--cursor', 'crosshair');
  } else {
    onMouseLeave(event);
  }
}

function onMouseLeave(event) {
  setProperty('--display-marker', 'none');
  setProperty('--cursor', 'default');
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
  var buyPrice = prices[buy];
  var sellPrice = prices[sell];
  return Math.round(((sellPrice - buyPrice) / buyPrice) * 100)
}

function formatPrice(index) {
  return '$' + prices[index].toFixed(2);
}

function getIndexDate(index) {
  var date = new Date(since);
  date.setDate(since.getDate() + index);
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

function onHelpClick(event) {
  showHelp = !showHelp;
  setProperty('--display-help', showHelp ? 'block' : 'none');
  event.preventDefault();
}

function onChangePaletteClick(event) {
  localStorage.palette = (localStorage.palette + 1) % COLORMAPS.length;
  var colorMap = getColorMap();
  drawIndex(colorMap);
  drawHodl(colorMap);
  event.preventDefault();
}

function onZoomInClick(event) {
  if (scaleIndex < SCALES.length - 1) {
    scaleIndex++;
    setScale();
  }
  setScaleSpan();
  event.preventDefault();
}

function onZoomOutClick(event) {
  if (scaleIndex > 0) {
    scaleIndex--;
    setScale();
  }
  setScaleSpan();
  event.preventDefault();
}

function setScale() {
  var scale = SCALES[scaleIndex] / 100;
  var size = (prices.length - 1) * scale;

  setProperty('--scale', scale);
  setProperty('--size', `${size}px`);
}

function setScaleSpan() {
  var scale = SCALES[scaleIndex];
  setInnerHTML('scale', scale + '%' + (scale < 100 ? '&nbsp;' : '');
  setProperty('--visibility-scale', 'visible')

  clearTimeout(scaleSpanClearTimeout);
  scaleSpanClearTimeout = setTimeout(function(){ setProperty('--visibility-scale', 'hidden') }, 2000);
}

function setInnerHTML(id, innerHTML) {
  document.getElementById(id).innerHTML = innerHTML;
}

function setProperty(key, value) {
  document.documentElement.style.setProperty(key, value);
}
