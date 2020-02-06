async function onLoad() {
  init();
}

const WIDTH = 506;
const GRID = 10;
const COLUMNS = 16;

var current = 0;
var background;
var color;

function init() {
  var r = Math.floor(Math.random() * 256);
  var g = Math.floor(Math.random() * 256);
  var b = Math.floor(Math.random() * 256);
  
  background = (255 << 24) + (b << 16) + (g << 8) + r;
  color = (r * 0.299 + g * 0.587 + b * 0.114) > 149 ? 0xFF000000 : 0xFFFFFFFF;
  
  const webSocket = new WebSocket('wss://api-pub.bitfinex.com/ws/2');

  webSocket.onopen = function (event) {
    document.getElementById('status').innerHTML = 'open';
    let msg = JSON.stringify({ 
      event: 'subscribe', 
      channel: 'ticker', 
      symbol: 'tBTCUSD' 
    });

    webSocket.send(msg); 
  };
  
  webSocket.onclose = function(event) {
    document.getElementById('status').innerHTML = `close ${event.code} ${event.reason}`;
  }
  
  webSocket.onerror = function(event) {
    document.getElementById('status').innerHTML = `close ${event.code} ${event.reason}`;
    document.getElementById('status').innerHTML = 'error';
  }
  
  webSocket.onmessage = function(event) {
    var data = JSON.parse(event.data);
    if (Array.isArray(data)) {
      var message = data[1];
      if (Array.isArray(message)) {
        var price = message[0];
        var sats = Math.floor(1 / price * 1e8);
    
        update(sats);
      }
    }
    else {
      document.getElementById('status').innerHTML = data.event;
    }
  };
}

function update(sats) {
  if (current == sats) {
    return;
  }
  current = sats;
  
  document.getElementById('title').innerHTML = 'sats per dollar';
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

    var x = 6 + (ax * 3) + (bx * 31);
    var y = 6 + (ay * 3) + (by * 31);
    
    dot(pixels, x, y, color);
    
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

function dot(pixels, x, y, color) {
  var p = (y * WIDTH) + x;
  
  pixels[p            ] = color;
  pixels[p         + 1] = color;
  pixels[p + WIDTH    ] = color;
  pixels[p + WIDTH + 1] = color;
}

function getHeight(sats) {
  var rows = Math.floor(sats / (COLUMNS * GRID * GRID)) + 1;
  return (rows * 31) + 10;
}
