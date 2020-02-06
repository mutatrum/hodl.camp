async function onLoad() {
  init();
}

const WIDTH = 506;
const BLOCK = 31;
const GRID = 10;
const COLUMNS = 16;

var color = chroma.random();

var spinner = "◢◣◤◥";
var spin = 0;

function init() {
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
        var price = message[6];
        var sats = Math.floor(1e8 / price);
    
        update(sats);
      }
      document.getElementById('spinner').innerHTML = ' ' + spinner[spin];
      spin = (spin + 1) % spinner.length;
    }
    else {
      document.getElementById('event').innerHTML = data.event;
    }
  };
}

function update(sats) {
  color = chroma.mix(color, chroma.random(), 0.05);

  var background = getBackground(color);
  var foreground = getForeground(color);

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
