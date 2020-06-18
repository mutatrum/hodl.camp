async function onLoad() {
  init();
}

const WIDTH = 506;
const BLOCK = 31;
const GRID = 10;
const COLUMNS = 16;

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

const FIAT_SYMBOLS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'];
const FIAT_NAMES = ['dollar', 'euro', 'pound sterling', 'japanese yen', 'australian dollar', 'canadian dollar', 'swiss franc'];
const FIAT_EXCHANGE = [BITFINEX, KRAKEN, KRAKEN, BITFINEX, KRAKEN, KRAKEN, KRAKEN];

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
        fiatList.innerHTML += `<a href=".">dollar</a><br>`;
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

  document.getElementById('sats').innerHTML = sats;
  
  var canvas = document.getElementById('sats_per_dollar');
  
  var height = getHeight(sats);
  
  canvas.width = WIDTH;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  
  const imageData = ctx.getImageData(0, 0, WIDTH, height);
  
  var buffer = new ArrayBuffer(imageData.data.length);
  var pixels = new Uint32Array(buffer);
  pixels.fill(background);
  
  var ax = 0, ay = 0, bx = 0, by = 0;
  
  for (var i = 0; i < sats; i++) {

    var x = 6 + (ax * 3) + (bx * BLOCK);
    var y = 6 + (ay * 3) + (by * BLOCK);
    
    dot(pixels, x, y, foreground);
    
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

function dot(pixels, x, y, color) {
  var p = (y * WIDTH) + x;
  
  pixels[p            ] = color;
  pixels[p         + 1] = color;
  pixels[p + WIDTH    ] = color;
  pixels[p + WIDTH + 1] = color;
}

function getHeight(sats) {
  var rows = Math.floor(sats / (COLUMNS * GRID * GRID)) + 1;
  return (rows * BLOCK) + 10;
}

function setStatus(status) {
  document.getElementById('status').innerHTML = status;
}
