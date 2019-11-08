const COLORMAPS = [
  ['#543005', '#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#80cdc1', '#35978f', '#01665e', '#003c30'],
  ['#8e0152', '#c51b7d', '#de77ae', '#f1b6da', '#fde0ef', '#f7f7f7', '#e6f5d0', '#b8e186', '#7fbc41', '#4d9221', '#276419'],
  ['#40004b', '#762a83', '#9970ab', '#c2a5cf', '#e7d4e8', '#f7f7f7', '#d9f0d3', '#a6dba0', '#5aae61', '#1b7837', '#00441b'],
  ['#7f3b08', '#b35806', '#e08214', '#fdb863', '#fee0b6', '#f7f7f7', '#d8daeb', '#b2abd2', '#8073ac', '#542788', '#2d004b'],
  ['#67001f', '#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac', '#053061'],
  ['#67001f', '#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#ffffff', '#e0e0e0', '#bababa', '#878787', '#4d4d4d', '#1a1a1a'],
  ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee090', '#ffffbf', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695'],
  ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'],
  ['#9e0142', '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'],
];

var prices;
var since;
const SCALES = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];
var scaleIndex = 7;
var scaleSpanClearTimeout;
var scrollBarWidth;

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
  
  createLabels();
  setScale();
  drawIndex();
  drawHodl();
}

function drawIndex() {
  var colorMapCanvas = document.getElementById('colormap');
  var colorMapContext = colorMapCanvas.getContext('2d');

  colorMapContext.fillStyle = createColorMap(colorMapContext);
  colorMapContext.fillRect(0, 0, 25, 401);

  colorMapCanvas.style.display = 'block';
}

function createColorMap(colorMapContext) {
  var colorMapGradient = colorMapContext.createLinearGradient(0, 0, 0, 400);
  var step = 0;
  var colorMap = COLORMAPS[localStorage.palette];
  for (var color of colorMap) {
    colorMapGradient.addColorStop(step / (colorMap.length - 1), color);
    step++;
  }
  return colorMapGradient;
}

function drawHodl() {
  var size = prices.length - 1;

  var backgroundColor = COLORMAPS[localStorage.palette][5];

  var hodlCanvas = document.getElementById('hodl');
  hodlCanvas.style.backgroundColor = backgroundColor; 
  hodlCanvas.style.display = 'block';
  hodlCanvas.width = size;
  hodlCanvas.height = size;
  
  var hodlContext = hodlCanvas.getContext('2d');
  drawPixels(hodlContext);
  
  var backgroundDiv = document.getElementById('background');
  backgroundDiv.style.backgroundColor = backgroundColor; 

  var aboutDiv = document.getElementById('about');
  aboutDiv.style.display = 'block';
}

function drawPixels(hodlContext) {
  var size = prices.length - 1;
  var colorMap = getColorMap();

  var imageData = hodlContext.createImageData(size, size);
  var buffer = new ArrayBuffer(imageData.data.length);
  var pixels = new Uint32Array(buffer);
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
        labelImg.classList.add('line');
      }
      labelsDiv.appendChild(labelImg);
    }
  }
}

function getColorMap() {
  var colorMapCanvas = document.getElementById('colormap');
  var colorMapContext = colorMapCanvas.getContext('2d');
  imageData = colorMapContext.getImageData(0, 0, 1, 400);
  return new Uint32Array(imageData.data.buffer);
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
    var buyDate = formatEpoch(buy);
    var buyPrice = formatPrice(buy);
    var sellDate = formatEpoch(sell);
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

function formatEpoch(index) {
  var date = getIndexDate(index);
  return date.getDate().toString().padStart(2, '0') + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getFullYear().toString();
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
  drawIndex();
  drawHodl();
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
    if (date.getDate() == 1) {
      if (date.getMonth() == 0) {
        var div = document.getElementById('y' + date.getFullYear());
        div.style.top = ((i * scaleFraction) - 14) + 'px';
        div.style.left = ((i * scaleFraction) + 13) + 'px';
      }
      var img = document.getElementById('y' + date.getFullYear() + 'm' + date.getMonth());
      img.style.top = ((i * scaleFraction) + 4) + 'px';
      img.style.left = ((i * scaleFraction) + 8) + 'px';
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
