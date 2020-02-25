async function onLoad() {
  init();
}

const WIDTH = 1200;
const HEIGHT = 675;

var spinner = "◢◣◤◥";
var spin = 0;

var data;
var candles;

var resizeTimer;

async function init() {
  var response = await fetch('../data.json');
  data = await response.json();

  createCandles();
  
  webSocketConnect();
  
  window.onresize = function(event) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawCandles, 250);
  }
}

function createCandles() {
  candles = new Array();

  var candle = createCandle(data.bitcoin[0]);

  var firstCandleIndex = data.halvings.findIndex(date => date.localeCompare(data.since) == 1) - 1;
  candles[firstCandleIndex] = candle;
  
  for (var i = 0; i < data.bitcoin.length; i++) {
    
    var price = data.bitcoin[i];
    candle.h = Math.max(candle.h, price);
    candle.l = Math.min(candle.l, price);
    candle.c = price;
    
    var index = data.halvings.indexOf(formatDate(getIndexDate(i)));

    if (index != -1) {
      candle = createCandle(price);

      candles[index] = candle;
    }
  }
}

function createCandle(price) {
  return {
    o: price,
    h: price,
    l: price,
    c: price
  };
}

function webSocketConnect() {
  setStatus('connect');
  
  const webSocket = new WebSocket('wss://api-pub.bitfinex.com/ws/2');

  webSocket.onopen = function (event) {
    setStatus('open');
    let msg = JSON.stringify({ 
      event: 'subscribe', 
      channel: 'ticker', 
      symbol: 'tBTCUSD' 
    });

    webSocket.send(msg);
  };
  
  webSocket.onclose = function(event) {
    setStatus(`close ${event.code} ${event.reason}`);

    setTimeout(webSocketConnect, 1000);
  }
  
  webSocket.onerror = function(event) {
    setStatus(`close ${event.code} ${event.reason}`);
  }
  
  webSocket.onmessage = function(event) {
    var data = JSON.parse(event.data);
    if (Array.isArray(data)) {
      var message = data[1];
      if (Array.isArray(message)) {
        
        var price = message[6];
        
        var candle = candles[candles.length-1];
        candle.h = Math.max(candle.h, price);
        candle.l = Math.min(candle.l, price);
        candle.c = price;
        
        drawCandles();
      }
      document.getElementById('spinner').innerHTML = ' ' + spinner[spin];
      spin = (spin + 1) % spinner.length;
    }
    else {
      setStatus(data.event);
    }
  };

  document.getElementById('title').innerHTML = 'halving candles';
}

function setStatus(status) {
  document.getElementById('status').innerHTML = status;
}

function getIndexDate(index) {
  var date = new Date(data.since);
  date.setDate(date.getDate() + index);
  return date;
}

function formatDate(date) {
  return date.getFullYear().toString() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0');
}

var width;
var height;

function drawCandles() {
  var canvas = document.getElementById('halving_candles');
  
  width = canvas.scrollWidth;
  height = canvas.scrollHeight;

  canvas.width = width;
  canvas.height = width;

  const ctx = canvas.getContext('2d');
  var small = width < 600;
  ctx.font = (small ? "12" : "15") + "px Droid Sans Mono"; 
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  clearCanvas(ctx);

  var maxPrice = candles.reduce((max, candle) => Math.max(max, candle ? candle.h : 0), 0);
  var minPrice = candles.reduce((min, candle) => Math.min(min, candle ? candle.l : 0), maxPrice);
  var maxRange = Math.log10(maxPrice);
  var minRange = Math.log10(minPrice);

  var getX = i => (75 + (i * (width - 150) / candles.length));
  var scale = (height - 35) / (maxRange - minRange);
  var getY = price => (height - 25) - (scale * (Math.log10(price) - minRange));

  for (var i = Math.ceil(minRange); i < maxRange; i++) {
    var price = Math.pow(10, i);
    drawPriceIndex(ctx, getY, price);
    drawHorizontalGrid(ctx, getY, price);
  }

  data.halvings.forEach((halving, i) => {
    var x = getX(i);
    if (i % 4 == 0) {
      drawVerticalGrid(ctx, x);
      if (!small) {
        drawHalvingLabel(ctx, x, data.halvings[i]);
      }
    }
    if (i % 4 == 2) {
      var era = (i + 2) / 4;
      drawHalvingLabel(ctx, x, `era ${era}`);
    }
  });

  candles.forEach((candle, i) => {
    drawCandle(ctx, getX, getY, i);
  });

  drawPriceLabel(ctx, getY);
}

function clearCanvas(ctx) {
  ctx.fillStyle = 'darkgrey';
  ctx.rect(0, 0, width, height);
  ctx.fill();
  ctx.stroke();  
  ctx.fillStyle = 'black';
}

function drawPriceIndex(ctx, getY, price) {
  var y = getY(price);
  ctx.textAlign = 'right';
  ctx.fillText(price, 60, y + 5);
  ctx.beginPath();
  ctx.moveTo(65, y);
  ctx.lineTo(70, y);
  ctx.stroke();
}

function drawHorizontalGrid(ctx, getY, price) {
  var y = getY(price);
  ctx.setLineDash([1, 5]);
  ctx.beginPath();
  ctx.moveTo(75, y);
  ctx.lineTo(width-75, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCandle(ctx, getX, getY, i) {
  ctx.lineWidth = 2;

  var candle = candles[i];

  var up = candle.c > candle.o;
  ctx.strokeStyle = up ? 'green' : 'red';
  ctx.fillStyle = up ? 'darkgrey' : 'red';
  
  var x = getX(i + 0.5);
  var w = getX(i + 1) - x;
  var y = getY(candle.o);
  var h = getY(candle.c) - y;
  
  ctx.beginPath();
  ctx.moveTo(x, getY(candle.h));
  ctx.lineTo(x, getY(candle.l));
  ctx.stroke();
  
  ctx.beginPath();
  ctx.rect(x - (w / 2), y, w, h);
  ctx.fill();
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'black';
}

function drawVerticalGrid(ctx, x) {
  ctx.setLineDash([1, 5]);
  ctx.beginPath();
  ctx.moveTo(x, 10);
  ctx.lineTo(x, height - 25);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHalvingLabel(ctx, x, label) {
  ctx.textAlign = 'center';
  ctx.fillText(label, x, height - 10);
}

function drawPriceLabel(ctx, getY) {
  var price = candles[candles.length-1].c;
  
  var y = getY(price);
  ctx.textAlign = 'left';
  ctx.fillText(Math.round(price), width - 60, y + 5);

  ctx.beginPath();
  ctx.moveTo(width - 70, y);
  ctx.lineTo(width - 65, y);
  ctx.stroke();
}