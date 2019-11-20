const COLORMAPS = ['BrBG', 'PiYG', 'PRGn', 'PuOr', 'RdBu', 'RdGy', 'RdYlBu', 'RdYlGn', 'Spectral'];
const DOMAIN = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.625, 0.725, 0.85, 1.0];

var prices;
var since;
const SCALES = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];
var scaleIndex = 7;
var scaleSpanClearTimeout;
var scrollBarWidth;
const HALVINGS = ['2009-01-03',
  '2010-04-22','2011-01-28','2011-12-14','2012-11-28',
  '2013-10-09','2014-08-11','2015-07-29','2016-07-09',
  '2017-06-23','2018-05-29','2019-05-24','2020-05-14'];

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
  if (localStorage.getItem("palette") === null) {
    localStorage.palette = 7;
  }
  var wrapperDiv =  document.getElementById('wrapper');
  scrollBarWidth = wrapperDiv.offsetWidth - wrapperDiv.clientWidth;
  
  var backgroundDiv = document.getElementById('background');
  backgroundDiv.style.height = 'calc(100vh - ' + (scrollBarWidth + 16) + 'px)';
  backgroundDiv.style.width = 'calc(100vw - ' + (scrollBarWidth + 16) + 'px)';
  
  var dateSpan = document.getElementById('date');
  dateSpan.innerHTML = formatDate(getIndexDate(prices.length - 1));

  createLabels();
  setScale();

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

  colorMapCanvas.style.display = 'block';
}

function drawHodl(colorMap) {
  var size = prices.length - 1;

  var hodlCanvas = document.getElementById('hodl');
  hodlCanvas.style.display = 'block';
  hodlCanvas.width = size;
  hodlCanvas.height = size;
  
  var hodlContext = hodlCanvas.getContext('2d');
  drawPixels(hodlContext, colorMap);
  
  var backgroundDiv = document.getElementById('background');
  backgroundDiv.style.backgroundColor = getColorScale().colors()[5];

  var aboutDiv = document.getElementById('about');
  aboutDiv.style.display = 'block';
}

function drawPixels(hodlContext, colorMap) {
  var size = prices.length - 1;

  var imageData = hodlContext.createImageData(size, size);
  var buffer = new ArrayBuffer(imageData.data.length);
  var pixels = new Uint32Array(buffer);
  pixels.fill(colorMap[200]);
  
  var y = 0;
  for (var selldate = 1; selldate <= size; selldate++) {
    for (var buydate = 0; buydate < selldate; buydate++) {
      var profit = getProfit(buydate, selldate);
      pixels[y + buydate] = colorMap[getColorIndex(profit)];
    }
    y += size;
  }
  
  imageData.data.set(new Uint8ClampedArray(buffer));
  hodlContext.putImageData(imageData, 0, 0);
}

function createLabels() {
  var labelsDiv = document.getElementById('labels');
  for (var i = 0; i < prices.length; i++) {
    var date = getIndexDate(i);
    if (date.getDate() == 1) {
      if (date.getMonth() == 0) {
        var labelDiv = document.createElement('div');
        labelDiv.id = 'y' + date.getFullYear();
        labelDiv.classList.add('label');
        labelDiv.innerHTML = date.getFullYear();
  
        labelsDiv.appendChild(labelDiv);
      }
      var labelImg = document.createElement('img');
      labelImg.id = 'y' + date.getFullYear() + 'm' + date.getMonth();
      labelImg.classList.add('dot');
      if (date.getMonth() == 0) {
        labelImg.src = 'line.png';
      } else {
        labelImg.src = 'dot.png';
      }
      labelsDiv.appendChild(labelImg);
    }
    var halving = HALVINGS.indexOf(formatDate(date));
    if (halving != -1) {
      var halvingDiv = document.createElement('div');
      halvingDiv.id = 'h' + i;
      halvingDiv.classList.add('halving');
      if (halving % 4 == 0) {
        halvingDiv.innerHTML = '&puncsp;' + date.getFullYear() + ' halving';
      } else {
        halvingDiv.classList.add('grid');
      }
      labelsDiv.appendChild(halvingDiv);
    }
  }
}

function getColorMap() {
  var colorScale = getColorScale();
  var colors = colorScale.mode('lab').domain(DOMAIN).colors(401, 'rgb');
  var buffer = colors.map(rgb => (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]);
  return new Uint32Array(buffer);
}

function getColorScale() {
  return chroma.scale(COLORMAPS[localStorage.palette]);
}

function onMouseLeave(event) {
  var tipCanvas = document.getElementById('tip');
  tipCanvas.style.display = 'none';
  
  var markerCanvas = document.getElementById('marker');
  markerCanvas.style.display = 'none';
  
  var hodlCanvas = document.getElementById('hodl');
  hodlCanvas.style.cursor = 'default';
}

function onMouseMove(event) {
  var hodlCanvas = document.getElementById('hodl');
  var tipDiv = document.getElementById('tip');
  var markerCanvas = document.getElementById('marker');
  var size = prices.length - 1;
  if (event.offsetX >= 0 && event.offsetX < size && 
    event.offsetY >= 0 && event.offsetY < size &&
    event.offsetX <= event.offsetY) {
    
    hodlCanvas.style.cursor = 'crosshair';
    
    var buy = event.offsetX;
    var sell = event.offsetY + 1;
    var buyDate = formatDate(getIndexDate(buy));
    var buyPrice = formatPrice(buy);
    var sellDate = formatDate(getIndexDate(sell));
    var sellPrice = formatPrice(sell);
    var duration = formatDuration(buy, sell);
    var profit = getProfit(buy, sell);
    tipDiv.innerHTML = `bought on ${buyDate} for ${buyPrice}<br>&nbsp;&nbsp;sold on ${sellDate} for ${sellPrice}<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;hodl ${duration}<br>&nbsp;&nbsp;&nbsp;profit ${profit}%`;
    tipDiv.style.display = 'block';
    
    var colorIndex = getColorIndex(profit);
    markerCanvas.style.top = colorIndex + 'px';
    markerCanvas.style.display = 'block';
  } else {
    hodlCanvas.style.cursor = 'default';
    tipDiv.style.display = 'none';
    markerCanvas.style.display = 'none';
  }
}

function getColorIndex(profit) {
  if (profit <= 0) {
    i = profit;
  } else {
    i = Math.log10(profit) * 10;
  }
  return 200 + ((i * 2) | 0);
}

function getProfit(buy, sell) {
  var buyPrice = prices[buy];
  var sellPrice = prices[sell];
  return Math.round(((sellPrice - buyPrice) / buyPrice) * 100)
}

function formatPrice(index) {
  var price = prices[index];
  return '$' + price.toFixed(2);
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
  var helpDiv = document.getElementById('help');
  helpDiv.style.display = (helpDiv.style.display == 'block' ? 'none' : 'block');
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
  var scale = SCALES[scaleIndex];
  var scaleFraction = scale / 100;

  var hodlCanvas = document.getElementById('hodl');
  hodlCanvas.style.transform = `scale(${scaleFraction})`;

  var size = (prices.length - 1) * scaleFraction;

  var borderDiv = document.getElementById('border');
  borderDiv.style.width = (size + 8) + 'px';
  borderDiv.style.height = (size + 8) + 'px';

  for (var i = 0; i < prices.length; i++) {
    var date = getIndexDate(i);
    var scaled = i * scaleFraction;
    if (date.getDate() == 1) {
      if (date.getMonth() == 0) {
        var div = document.getElementById('y' + date.getFullYear());
        div.style.top = (scaled - 22) + 'px';
        div.style.left = (scaled + 5) + 'px';
      }
      var img = document.getElementById('y' + date.getFullYear() + 'm' + date.getMonth());
      img.style.top = (scaled - 4) + 'px';
      img.style.left = scaled + 'px';
    }
    if (HALVINGS.includes(formatDate(date))) {
      var div = document.getElementById('h' + i);
      div.style.top = (scaled - 1) + 'px';
      div.style.width = (scaled - 1) + 'px';
      div.style.height = (size - scaled) + 'px';
    }
  }
}

function setScaleSpan() {
  var scale = SCALES[scaleIndex];
  var scaleSpan = document.getElementById('scale');
  var scalePadSpan = document.getElementById('scale-pad');
  scaleSpan.innerHTML = scale + '%';
  scalePadSpan.innerHTML = '&nbsp;&nbsp;&nbsp;' + (scaleIndex > 6 ? '&nbsp;' : '');

  clearTimeout(scaleSpanClearTimeout);
  scaleSpanClearTimeout = setTimeout(function(){ scaleSpan.innerHTML = ''; scalePadSpan.innerHTML = '';}, 2000);
}
