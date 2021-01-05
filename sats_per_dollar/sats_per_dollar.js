async function onLoad() {
  init();
}

const COLUMNS = 10;
const GRID = 10;
const GRID_GAP = 2;
const DOT = 4;
const DOT_GAP = 1;
const BORDER = 5;
const BLOCK = (DOT * 10) + (DOT_GAP * 9) + GRID_GAP;
  
const BITFINEX = {
  url: 'wss://api-pub.bitfinex.com/ws/2',
  subscribe: function(symbol) {
    return {
      event: 'subscribe', 
      channel: 'ticker', 
      symbol: 'tBTC' + symbol
    };
  },
  handle: function(data) {
    if (Array.isArray(data)) {
      var message = data[1];
      if (Array.isArray(message)) {
        var price = message[6];
        var sats = Math.floor(1e8 / price);
        update(sats);
      }
    }
    else {
      setStatus(data.event);
    }
  }
}
const KRAKEN = {
  url: 'wss://ws.kraken.com/',
  subscribe: function(symbol) {
    return { 
      event: 'subscribe', 
      subscription: {name: 'ticker'},
      pair: ['XBT/' + symbol],
    };
  },
  handle: function(data) {
    if (Array.isArray(data)) {
      var price = data[1].a[0];
      var sats = Math.floor(1e8 / price);
      update(sats);
    } else {
      if (data.status) {
        setStatus(data.status);      
      }
    }
  }
}
const BINANCE = {
  url: 'wss://stream.binance.com:9443/ws',
  subscribe: function(symbol) {
    return { 
      method: 'SUBSCRIBE', 
      params: ['btc' + symbol.toLowerCase() + '@ticker'],
      id: 1
    };
  },
  handle: function(data) {
    if (data.id) {
      setStatus('subscribed');
    } else {
      var price = data.c;
      var sats = Math.floor(1e8 / price);
      update(sats);
    }
  }
}
const FTX = {
  url: 'wss://ftx.com/ws/',
  subscribe: function(symbol) {
    return {
      op: 'subscribe',
      channel: 'ticker',
      market: 'BTC/'+symbol
    };
  },
  handle: function(data) {
    setStatus(data.type);
    if (data.data) {
      var price = data.data.last;
      var sats = Math.floor(1e8 / price);
      update(sats);
    }
  }
}

const FIAT_SYMBOLS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NGN', 'RUB', 'TRY', 'ZAR', 'UAH', 'BRL'];
const FIAT_NAMES = ['🇺🇸 dollar', '🇪🇺 euro', '🇬🇧 pound sterling', '🇯🇵 yen', '🇦🇺 dollar', '🇨🇦 dollar', '🇨🇭 franc', '🇳🇬 naira', '🇷🇺 rubble', '🇹🇷 lira', '🇿🇦 rand', '🇺🇦 hryvnia', '🇧🇷 real'];
const FIAT_EXCHANGE = [BITFINEX, KRAKEN, KRAKEN, BITFINEX, KRAKEN, KRAKEN, KRAKEN, BINANCE, BINANCE, BINANCE, BINANCE, BINANCE, FTX];

var color;
var startColor = chroma.random();
var endColor = chroma.random();
var colorIndex = 0;
var fiatIndex = 0;

var spinner = "◢◣◤◥";
var spin = 0;

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  fiatIndex = FIAT_SYMBOLS.indexOf(urlParams.get('fiat'));
  if (fiatIndex == -1) {
    fiatIndex = 0;
  }

  document.getElementById('fiat').innerHTML = FIAT_NAMES[fiatIndex];

  var fiatList = document.getElementById("fiat_list");
  for (i = 0; i < FIAT_SYMBOLS.length; i++) {
    if (fiatIndex != i) {
      if (i == 0) {
        fiatList.innerHTML += `<a href=".">${FIAT_NAMES[0]}</a><br>`;
      } else {
        fiatList.innerHTML += `<a href="?fiat=${FIAT_SYMBOLS[i]}">${FIAT_NAMES[i]}</a><br>`;
      }
    }
  }

  connect(FIAT_EXCHANGE[fiatIndex], FIAT_SYMBOLS[fiatIndex]);
}

function connect(exchange, symbol) {
  setStatus('connect');

  const webSocket = new WebSocket(exchange.url);

  webSocket.onopen = function (event) {
    setStatus('open');
    let msg = JSON.stringify(exchange.subscribe(symbol));

    webSocket.send(msg); 
  };
  
  webSocket.onclose = function(event) {
    setStatus(`close ${event.code} ${event.reason}`);
    setTimeout(function() {connect(exchange, symbol)}, 5000);
  }
  
  webSocket.onerror = function(event) {
    setStatus(`close ${event.code} ${event.reason}`);
  }
  
  webSocket.onmessage = function(event) {
    var data = JSON.parse(event.data);
    exchange.handle(data);
    document.getElementById('spinner').innerHTML = ' ' + spinner[spin];
    spin = (spin + 1) % spinner.length;
  };
}

function update(sats) {
  color = chroma.mix(startColor, endColor, colorIndex / 100, 'lab');

  colorIndex = (colorIndex + 1) % 100;
  if (colorIndex == 0) {
    startColor = endColor;
    endColor = chroma.random();
  }

  var background = getBackground(color);
  var foreground = getForeground(color);

  document.title = `${sats} sats per ${FIAT_NAMES[fiatIndex]}`;
  document.getElementById('sats').innerHTML = sats;
  
  var canvas = document.getElementById('sats_per_dollar');
  
  var width = getWidth();
  var height = getHeight(sats);
  
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  
  const imageData = ctx.getImageData(0, 0, width, height);
  
  var buffer = new ArrayBuffer(imageData.data.length);
  var pixels = new Uint32Array(buffer);
  pixels.fill(background);
  
  var ax = 0, ay = 0, bx = 0, by = 0;
  
  for (var i = 0; i < sats; i++) {

    var x = BORDER + (ax * (DOT + DOT_GAP)) + (bx * BLOCK);
    var y = BORDER + (ay * (DOT + DOT_GAP)) + (by * BLOCK);
    
    dot(pixels, x, y, foreground, width);
    
    ax++;
    if (ax == GRID) {
      ax = 0;
      ay++;
    }
    
    if (ay == GRID) {
      bx++;
      ay = 0;
    }
    
    if (bx == COLUMNS) {
      by++;
      bx = 0;
    }
  }

  imageData.data.set(new Uint8ClampedArray(buffer));
  ctx.putImageData(imageData, 0, 0);
}

function getBackground(color) {
  return color.num() ^ 0xFF000000;
}

function getForeground(color) {
  var rgb = color.rgb();
  return (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) > 149 ? 0xFF000000 : 0xFFFFFFFF;
}

function dot(pixels, x, y, color, width) {
  var p = (y * width) + x;

  for(var i = 0; i < DOT; i++) {
    pixels.fill(color, p, p + DOT);
    p += width;
  }
}

function getWidth() {
  return (COLUMNS * 10 * DOT) + (COLUMNS * 9 * DOT_GAP) + ((COLUMNS - 1) * GRID_GAP) + BORDER + BORDER;
}

function getHeight(sats) {
  var rows = Math.ceil(sats / (COLUMNS * 100));
  return (rows * 10 * DOT) + (rows * 9 * DOT_GAP) + ((rows - 1) * GRID_GAP) + BORDER + BORDER;
}

function setStatus(status) {
  document.getElementById('status').innerHTML = status;
}
