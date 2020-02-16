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
  var size = data.bitcoin.length - 1;

  candles = new Array();

  var candle = createCandle(data.bitcoin[0]);

  var firstCandleIndex = data.halvings.findIndex(date => date.localeCompare(data.since) == 1) - 1;
  candles[firstCandleIndex] = candle;
  
  for (var i = 0; i <= size; i++) {
    
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
  candle.c = data.bitcoin[size];
  
  document.getElementById('event').innerHTML = 'connect';
  
  const webSocket = new WebSocket('wss://api-pub.bitfinex.com/ws/2');

  webSocket.onopen = function (event) {
    document.getElementById('event').innerHTML = 'open';
    let msg = JSON.stringify({ 
      event: 'subscribe', 
      channel: 'ticker', 
      symbol: 'tBTCUSD' 
    });

    webSocket.send(msg); 
  };
  
  webSocket.onclose = function(event) {
    document.getElementById('event').innerHTML = `close ${event.code} ${event.reason}`;
  }
  
  webSocket.onerror = function(event) {
    document.getElementById('event').innerHTML = `close ${event.code} ${event.reason}`;
  }
  
  webSocket.onmessage = function(event) {
    var data = JSON.parse(event.data);
    if (Array.isArray(data)) {
      var message = data[1];
      if (Array.isArray(message)) {
        update(message[6]);
      }
      document.getElementById('spinner').innerHTML = ' ' + spinner[spin];
      spin = (spin + 1) % spinner.length;
    }
    else {
      document.getElementById('event').innerHTML = data.event;
    }
  };

  window.onresize = function(event) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      update(candles[candles.length-1].c);
    }, 250);
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

function update(price) {
  var candle = candles[candles.length-1];
  candle.h = Math.max(candle.h, price);
  candle.l = Math.max(candle.l, price);
  candle.c = price;

  var maxPrice = candles.reduce((max, candle) => Math.max(max, candle ? candle.h : 0), 0);
  var minPrice = candles.reduce((min, candle) => Math.min(min, candle ? candle.l : 0), maxPrice);
  var maxRange = Math.log10(maxPrice);
  var minRange = Math.log10(minPrice);
  
  document.getElementById('title').innerHTML = 'halving candles';
  
  var canvas = document.getElementById('halving_candles');
  
  width = canvas.scrollWidth;
  height = canvas.scrollHeight;

  canvas.width = width;
  canvas.height = width;
  

  var scale = (height - 35) / (maxRange - minRange);
  var getY = price => (height - 25) - (scale * (Math.log10(price) - minRange));

  const ctx = canvas.getContext('2d');
  
  if (width < 600) {
    ctx.font = "12px Droid Sans Mono";
  } else {
    ctx.font = "15px Droid Sans Mono";
  }
  
  ctx.fillStyle = 'darkgrey';
  ctx.rect(0, 0, width, height);
  ctx.fill();
  ctx.stroke();  

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  for (var index = Math.ceil(minRange); index < maxRange; index++) {
    drawPriceIndex(ctx, getY, Math.pow(10, index));
  }

  if (width > 600) {
    drawHalvingLabel(ctx, 75, data.halvings[0]);
  }
  drawHalvingLine(ctx, 75, height);

  var w = (width - 150) / candles.length;
  candles.forEach((candle, i) => {
    var x = 75 + ((i + 0.5) * w);
    
    if (i % 4 == 1) {
      var era = ((i - 1) / 4) + 1;
      drawHalvingLabel(ctx, x + (w / 2), `era ${era}`);
    }

    if (i % 4 == 3) {
      drawHalvingLine(ctx, x + (w / 2));
      if (width > 600) {
        drawHalvingLabel(ctx, x + (w / 2), data.halvings[i]);
      }
    }
    
    drawCandle(ctx, getY, x, w, candles[i]);
  });

  if (price) {
    ctx.lineWidth = 1;
    var y = getY(price);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'black';
    ctx.fillText(Math.round(price), width - 60, y + 5);

    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.moveTo(width - 70, y);
    ctx.lineTo(width - 65, y);
    ctx.stroke();
  }
}

function drawPriceIndex(ctx, getY, price) {
  ctx.lineWidth = 1;
  var y = getY(price);
  ctx.textAlign = 'right';
  
  ctx.fillStyle = 'black';
  
  ctx.fillText(price, 60, y + 5);
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.moveTo(65, y);
  ctx.lineTo(70, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.setLineDash([1, 5]);
  ctx.moveTo(75, y);
  ctx.lineTo(width-75, y);
  ctx.stroke();

  ctx.setLineDash([]);
}

function drawCandle(ctx, getY, x, w, candle) {
  ctx.lineWidth = 4;
  ctx.setLineDash([]);
  
  var yo = getY(candle.o);
  var yh = getY(candle.h);
  var yl = getY(candle.l);
  var yc = getY(candle.c);
  
  var up = candle.c >= candle.o;
  ctx.strokeStyle = up ? 'green' : 'red';
  ctx.fillStyle = up ? 'darkgrey' : 'red';
  ctx.beginPath();
  ctx.moveTo(x, yh);
  ctx.lineTo(x, up ? yc : yo);
  ctx.moveTo(x, up ? yo : yc);
  ctx.lineTo(x, yl);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.rect(x - (w / 8), yo, w / 4, yc - yo);
  ctx.fill();
  ctx.stroke();
}

function drawHalvingLine(ctx, x) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.setLineDash([1, 5]);
  ctx.moveTo(x, 10);
  ctx.lineTo(x, height - 25);
  ctx.stroke();
}

function drawHalvingLabel(ctx, x, label) {
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, height - 10);
}