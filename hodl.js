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
  drawIndex();
  drawHodl();
  createLabels();
}

function drawIndex() {
  var gradientCanvas = document.getElementById('gradient');
  var gradientContext = gradientCanvas.getContext('2d');

  gradientContext.fillStyle = createIndexGradient(gradientContext);
  gradientContext.fillRect(0, 0, 25, 401);

  gradientCanvas.style.display = 'block';
}

function createIndexGradient(indexContext) {
  var indexGradient = indexContext.createLinearGradient(0, 0, 0, 400);
  var stop = 0;
  for (var color of COLORMAPS[localStorage.palette]) {
    indexGradient.addColorStop(stop, color);
    stop += 0.1;
  }
  return indexGradient;
}

function drawHodl() {
  var size = prices.length;

  var borderDiv = document.getElementById('border');
  borderDiv.style.width = (size + 7) + 'px';
  borderDiv.style.height = (size + 8) + 'px';
  
  var hodlCanvas = document.getElementById('hodl');
  hodlCanvas.width = size - 1;
  hodlCanvas.height = size;
  
  var hodlContext = hodlCanvas.getContext('2d');
  drawPixels(hodlContext);
  drawDots(hodlContext);
  
  hodlCanvas.style.backgroundColor = COLORMAPS[localStorage.palette][5]; 
  hodlCanvas.style.display = 'block';

  var aboutDiv = document.getElementById('about');
  aboutDiv.style.display = 'block';
}

function drawPixels(hodlContext) {
  var size = prices.length;
  var colors = getColorLookup();

  var imageData = hodlContext.createImageData(size - 1, size);
  var buffer = new ArrayBuffer(imageData.data.length);
  var pixelMap = new Uint32Array(buffer);
  var y = size - 1;
  for (var selldate = 1; selldate <= size; selldate++) {
    for (var buydate = 0; buydate < selldate; buydate++) {
      var profit = getProfit(buydate, selldate);
      pixelMap[y + buydate] = colors[getColorIndex(profit)];
    }
    y += size - 1;
  }
  
  imageData.data.set(new Uint8ClampedArray(buffer));
  hodlContext.putImageData(imageData, 0, 0);
}

function drawDots(hodlContext) {
  var size = prices.length;
  for (var i = 0; i < size; i++) {
    var date = getIndexDate(i);
    if (date.getDate() == 1) {
      if (date.getMonth() == 0) {
        hodlContext.moveTo(i + 0.5, i + 0.5);
        hodlContext.lineTo(i + 3.5, i - 2.5);
        hodlContext.stroke();
      } else {
        hodlContext.moveTo(i + 0.5, i + 0.5);
        hodlContext.lineTo(i + 1.5, i - 0.5);
        hodlContext.stroke();
      }
    }
  }
}

function createLabels() {
  var yearsDiv = document.getElementById('years');
  for (var i = 0; i < prices.length; i++) {
    var date = getIndexDate(i);
    if (date.getDate() == 1 && date.getMonth() == 0) {
        
      var div = document.createElement('div');
      div.classList.add('year');
      div.style.top = (i - 15) + 'px';
      div.style.left = (i +  15) + 'px';
      div.innerHTML = date.getFullYear();

      yearsDiv.appendChild(div);
    }
  }
}

function getColorLookup() {
  var gradientCanvas = document.getElementById('gradient');
  var gradientContext = gradientCanvas.getContext('2d');
  imageData = gradientContext.getImageData(0, 0, 1, 400);
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
  var size = prices.length;
  if (event.offsetX >= 0 && event.offsetX < size && 
    event.offsetY >= 0 && event.offsetY < size &&
    event.offsetX < event.offsetY) {
    
    hodlCanvas.style.cursor = 'crosshair';
    
    var buy = event.offsetX;
    var sell = event.offsetY;
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
