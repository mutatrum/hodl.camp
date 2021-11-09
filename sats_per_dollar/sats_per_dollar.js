async function onLoad() {
  init();
}

const COLUMNS = 10;
const GRID = 10;
const GRID_GAP = 2;
const DOT = 4;
const DOT_GAP = 1;
const BORDER = 5;
const BLOCK = (DOT * 10) + (DOT_GAP * 9);

class Bitfinex {
  constructor(market) {
    this.url = 'wss://api-pub.bitfinex.com/ws/2';
    this.subscribe = {
      event: 'subscribe', 
      channel: 'ticker', 
      symbol: `tBTC${market.symbol}`
    };
    this.handle = (data) => {
      if (Array.isArray(data)) {
        var message = data[1];
        if (Array.isArray(message)) {
          var price = message[6];
          var sats = 1e8 / price;
          update(sats);
        }
      } else {
        setStatus(data.event);
      }
    }
  }
}

class Kraken {
  constructor(market) {
    this.url = 'wss://ws.kraken.com/';
    this.subscribe = { 
      event: 'subscribe', 
      subscription: {name: 'ticker'},
      pair: [`XBT/${market.symbol}`],
    };
    this.handle = (data) => {
      if (Array.isArray(data)) {
        var price = data[1].a[0];
        var sats = 1e8 / price;
        update(sats);
      } else {
        if (data.status) {
          setStatus(data.status);      
        }
      }
    }
  }
}

class CoinFloor {
  constructor(market) {
    this.url = 'wss://api.coinfloor.co.uk/';
    this.subscribe = {
      method: 'WatchTicker',
      base: 63488,
      counter: 64032,
      watch: true
    };
    this.handle = (data) => {
      if (data.notice == 'TickerChanged') {
        if (data.bid) {
          var price = data.bid / 100;
          var sats = 1e8 / price;
          update(sats);
        }
        return;
      }
      if (data.notice) {
        setStatus(data.notice);
      }
    }
  }
}

class Binance {
  constructor(market) {
    this.url = 'wss://stream.binance.com:9443/ws';
    this.subscribe = { 
      method: 'SUBSCRIBE', 
      params: [`btc${market.symbol.toLowerCase()}@ticker`],
      id: 1
    };
    this.handle = (data) => {
      if (data.id) {
        setStatus('subscribed');
      } else {
        var price = data.c;
        var sats = 1e8 / price;
        update(sats);
      }
    }
  }
}

class Ftx {
  constructor(market) {
    this.url = 'wss://ftx.com/ws/';
    this.subscribe = {
      op: 'subscribe',
      channel: 'ticker',
      market: `BTC/${market.symbol}`
    };
    this.handle = (data) => {
      if (data.id) {
        setStatus('subscribed');
      } else {
        setStatus(data.type);
        if (data.data) {
          var price = data.data.last;
          var sats = 1e8 / price;
          update(sats);
        }
      }
    }
  }
}

class Luno {
  constructor(market) {
    this.url = `wss://ws.luno.com/api/1/stream/XBT${market.symbol}`;
    this.subscribe = {},
    this.orders = {}
    this.handle = (data) => {
      var price;
      if (data.status) {
        setStatus(data.status);
        if (data.asks) {
          for (var ask of data.asks) {
            this.orders[ask.id] = ask.price;
          }
        }
        if (data.bids) {
          for (var bid of data.bids) {
            this.orders[bid.id] = bid.price;
          }
        }
        price = data.bids[0].price;
      } else {
        if (data.create_update) {
          this.orders[data.create_update.order_id] = data.create_update.price;
        }
        if (data.delete_update) {
          delete this.orders[data.delete_update.order_id];
        }
        if (data.trade_updates) {
          for (var trade_update of data.trade_updates) {
            price = this.orders[trade_update.maker_order_id];
          }
        }
      }
      if (price) {
        var sats = 1e8 / price;
        update(sats);
      }
    }
  }
}

class Bitso {
  constructor(market) {
    this.url = 'wss://ws.bitso.com';
    this.subscribe = {
      action: 'subscribe',
      book: `btc_${market.symbol.toLowerCase()}`,
      type: 'orders'
    };
    this.lastUpdate = 0;
    this.handle = (data) => {
      if (data.action) {
        setStatus(`${data.action}: ${data.response}`);
      } else {
        var now = Date.now();
        if (now - this.lastUpdate > 1000) {
          this.lastUpdate = now;
          if (data.type == 'orders') {
            var price = data.payload.bids[0].r;
            var sats = 1e8 / price;
            update(sats);
          }
        }
      }
    }
  }
}

class TideBit {
  constructor(market) {
    this.url = 'wss://pusher.tinfo.top/app/2b78567f96a2c0f40368?protocol=7&client=js&version=2.2.0&flash=false';
    this.handle = (data, webSocket) => {
      if (data.event == 'update') {
        var book = JSON.parse(data.data);
        var price = book.bids[0][0];
        var sats = 1e8 / price;
        update(sats);
        return;
      }
      if (data.event == 'trades') return;
      if (data.event == 'mobile_update') return;
      var pos = data.event.indexOf(':');
      if (pos == -1) {
        setStatus(data.event);
      } else {
        setStatus(data.event.substring(pos + 1));
      }
      if (data.event == 'pusher:connection_established') {
        webSocket.send(JSON.stringify({event: 'pusher:subscribe', data: {channel: `market-btc${market.symbol.toLowerCase()}-global`}}));
      }
    }
  }
}

class WazirX {
  constructor(market) {
    this.url = 'wss://ws-ap2.pusher.com/app/47bd0a9591a05c2a66db?protocol=7&client=js&version=4.4.0&flash=false';
    this.handle = (data, webSocket) => {
      if (data.event == 'update') {
        var book = JSON.parse(data.data);
        var price = book.bids[0][0];
        var sats = 1e8 / price;
        update(sats);
        return;
      }
      if (data.event == 'trades') return;
      if (data.event == 'mobile_update') return;
      var pos = data.event.indexOf(':');
      if (pos == -1) {
        setStatus(data.event);
      } else {
        setStatus(data.event.substring(pos + 1));
      }
      if (data.event == 'pusher:connection_established') {
        webSocket.send(JSON.stringify({event: 'pusher:subscribe', data: {channel: `market-btc${market.symbol.toLowerCase()}-global`}}));
      }
    }
  }
}

class Coinone {
  constructor(market) {
    this.url = 'wss://wss.coinone.co.kr/ws';
    this.subscribe = {
      event: 'subscribe',
      channel: 'market_price'
    };
    this.handle = (data) => {
      if (data.event) {
        setStatus('subscribed');
      } else {
        var price = data.data[0].price;
        var sats = 1e8 / price;
        update(sats);
      }
    }
  }
}

class Bitbay {
  constructor(market) {
    this.url = 'wss://api.bitbay.net/websocket/';
    this.subscribe = {
      action: 'subscribe-public',
      module: 'trading',
      path: `ticker/BTC-${market.symbol}`
     };
    this.handle = (data) => {
      if (data.action == 'subscribe-public-confirm') {
        setStatus('subscribed');
      } else {
        var price = data.message.highestBid;
        var sats = 1e8 / price;
        update(sats);
      }
    }
  }
}

class Bitkub {
  constructor(market) {
    this.url = `wss://api.bitkub.com/websocket-api/market.ticker.${market.symbol.toLowerCase()}_btc`;
    this.handle = (data) => {
      setStatus('subscribed');
      var price = data.highestBid;
      var sats = 1e8 / price;
      update(sats);
    }
  }
}

const MARKETS = [
  {symbol: 'USD', iso: 'us', flag: '🇺🇸', name: 'dollar', exchange: Bitfinex},
  {symbol: 'EUR', iso: 'eu', flag: '🇪🇺', name: 'euro', exchange: Kraken},
  {symbol: 'GBP', iso: 'gb', flag: '🇬🇧', name: 'pound sterling', exchange: Kraken},
  {symbol: 'JPY', iso: 'jp', flag: '🇯🇵', name: 'yen', exchange: Bitfinex},
  {symbol: 'AUD', iso: 'au', flag: '🇦🇺', name: 'dollar', exchange: Kraken},
  {symbol: 'CAD', iso: 'ca', flag: '🇨🇦', name: 'dollar', exchange: Kraken},
  {symbol: 'CHF', iso: 'ch', flag: '🇨🇭', name: 'franc', exchange: Kraken},
  {symbol: 'NGN', iso: 'ng', flag: '🇳🇬', name: 'naira', exchange: Binance},
  {symbol: 'RUB', iso: 'ru', flag: '🇷🇺', name: 'ruble', exchange: Binance},
  {symbol: 'TRY', iso: 'tr', flag: '🇹🇷', name: 'lira', exchange: Binance},
  {symbol: 'ZAR', iso: 'za', flag: '🇿🇦', name: 'rand', exchange: Luno},
  {symbol: 'UAH', iso: 'ua', flag: '🇺🇦', name: 'hryvnia', exchange: Binance},
  {symbol: 'BRZ', iso: 'br', flag: '🇧🇷', name: 'real', exchange: Ftx},
  {symbol: 'SGD', iso: 'sg', flag: '🇸🇬', name: 'dollar', exchange: Luno},
  {symbol: 'IDR', iso: 'id', flag: '🇮🇩', name: 'rupiah', exchange: Luno},
  {symbol: 'MYR', iso: 'my', flag: '🇲🇾', name: 'ringgit', exchange: Luno},
  {symbol: 'UGX', iso: 'ug', flag: '🇺🇬', name: 'shilling', exchange: Luno},
  {symbol: 'ZMW', iso: 'zm', flag: '🇿🇲', name: 'kwacha', exchange: Luno},
  {symbol: 'ARS', iso: 'ar', flag: '🇦🇷', name: 'peso', exchange: Bitso},
  {symbol: 'MXN', iso: 'mx', flag: '🇲🇽', name: 'peso', exchange: Bitso},
  {symbol: 'HKD', iso: 'hk', flag: '🇭🇰', name: 'dollar', exchange: TideBit},
  {symbol: 'INR', iso: 'in', flag: '🇮🇳', name: 'rupiah', exchange: WazirX},
  {symbol: 'KRW', iso: 'kr', flag: '🇰🇷', name: 'won', exchange: Coinone},
  {symbol: 'PLN', iso: 'pl', flag: '🇵🇱', name: 'złoty', exchange: Bitbay},
  {symbol: 'THB', iso: 'th', flag: '🇹🇭', name: 'baht', exchange: Bitkub},
];

var color;
var startColor = chroma.random();
var endColor = chroma.random();
var colorIndex = 0;

var spinner = "◢◣◤◥";
var spin = 0;

var selectedMarket;

function init() {
  selectedMarket = MARKETS[0];
  const urlParams = new URLSearchParams(window.location.search);
  var selectedSymbol = urlParams.get('fiat');

  var i = 0
  var fiatList = document.getElementById("fiat_list_col1");
  for (var market of MARKETS) {
    var a = document.createElement('a')
    a.href = market.symbol == 'USD' ? '.' : `?fiat=${market.symbol}`
    appendCountry(a, market)
    fiatList.appendChild(a)
    fiatList.append(document.createElement('br'))

    if (market.symbol == selectedSymbol) {
      selectedMarket = market;
    }

    i++;
    if (i >= MARKETS.length / 2) {
      fiatList = document.getElementById("fiat_list_col2");
    }
  }

  appendCountry(document.getElementById('fiat'), selectedMarket)
  
  var exchange = new selectedMarket.exchange(selectedMarket)
  connect(exchange);
}

function appendCountry(element, market) {
  var img = document.createElement('img')
  img.classList.add('flag')
  img.src = `https://flagcdn.com/48x36/${market.iso}.webp`
  img.alt = market.iso.toUpperCase()

  element.appendChild(img)
  element.append(' ')
  element.append(market.name)
}

function connect(exchange) {
  setStatus('connect');

  const webSocket = new WebSocket(exchange.url);

  var timeoutId;

  webSocket.onopen = function (event) {
    setStatus('open');
    if (exchange.subscribe) {
      webSocket.send(JSON.stringify(exchange.subscribe));
    }
  };
  
  webSocket.onclose = function(event) {
    setStatus(`close ${event.code} ${event.reason}`);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(function() {connect(exchange)}, 5000);
  }
  
  webSocket.onerror = function(event) {
    setStatus(`close ${event.code} ${event.reason}`);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(function() {connect(exchange)}, 5000);
  }
  
  webSocket.onmessage = function(event) {
    var data = JSON.parse(event.data);
    exchange.handle(data, webSocket);
  };
}

function update(sats) {
  document.getElementById('spinner').innerHTML = ' ' + spinner[spin];
  spin = (spin + 1) % spinner.length;

  color = chroma.mix(startColor, endColor, colorIndex / 100, 'lab');

  colorIndex = (colorIndex + 1) % 100;
  if (colorIndex == 0) {
    startColor = endColor;
    endColor = chroma.random();
  }

  var background = getBackground(color);
  var foreground = getForeground(color);

  var precision = Math.max(0, Math.floor(2 - Math.log10(sats)));
  var displaySats = sats.toFixed(precision);
  document.getElementById('sats').innerHTML = displaySats;
  document.title = `${displaySats} sats per ${selectedMarket.flag} ${selectedMarket.name}`;
  
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
  
  if (sats > 10) {
    var ax = 0, ay = 0, bx = 0, by = 0;
  
    for (var i = 0; i < Math.round(sats); i++) {
  
      var x = BORDER + (ax * (DOT + DOT_GAP)) + (bx * (BLOCK + GRID_GAP));
      var y = BORDER + (ay * (DOT + DOT_GAP)) + (by * (BLOCK + GRID_GAP));
      
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
  } else {
    var bx = 0;
  
    for (var i = 0; i < sats; i++) {
  
      var x = BORDER + (bx * (BLOCK + GRID_GAP));
      var y = BORDER;

      block(pixels, x, y, foreground, width, Math.min(sats - i, 1));

      bx++;
    }
  }

  imageData.data.set(new Uint8ClampedArray(buffer));
  ctx.putImageData(imageData, 0, 0);
}

function getBackground(color) {
  var rgb = color.rgb();
  return 0xFF000000 + (rgb[2] << 16) + (rgb[1] << 8) + rgb[0];
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

function block(pixels, x, y, color, width, fraction) {
  if (fraction < 1) {
    var p = (y * width) + x;
    for (var i = 0; i < BLOCK; i++) {
      if (i % 2 === 0) {
        pixels[p + i] = color;
        pixels[p + (i * width)] = color;
        pixels[p + i + ((BLOCK - 1) * width)] = color;
        pixels[p + (i * width) + BLOCK - 1] = color;
      }
    }
  }

  var part = fraction > 0.5 ? 1 - fraction : fraction;
  var size = Math.sqrt(part * 2) * BLOCK;
  if (fraction > 0.5) size = (BLOCK * 2) - size;

  var p = (y * width) + x;
  for(var i = 0; i < Math.min(size, BLOCK); i++) {
    pixels.fill(color, p, p + Math.min(size - i, BLOCK));
    p += width;
  }
}

function getWidth() {
  return (COLUMNS * 10 * DOT) + (COLUMNS * 9 * DOT_GAP) + ((COLUMNS - 1) * GRID_GAP) + BORDER + BORDER;
}

function getHeight(sats) {
  var result = BORDER + BORDER;

  if (sats < 10) {
    result += 10 * DOT;
    result += 9 * DOT_GAP;
  } else {

    while (sats > COLUMNS * 100) {
      sats -= COLUMNS * 100;
  
      result += 10 * DOT;
      result += 9 * DOT_GAP;
      if (sats > 0) {
        result += GRID_GAP;
      }
    }
  
    if (sats > GRID * GRID) {
      result += 10 * DOT;
      result += 9 * DOT_GAP;
    } else {
      while (sats > GRID) {
        sats -= GRID;
        result += DOT;
        if (sats > 0) {
          result += DOT_GAP;
        }
      }
      if (sats > 0) {
        result += DOT;
        result += DOT_GAP;
      }
    } 
  }

  return result;
}

function setStatus(status) {
  document.getElementById('status').innerHTML = status;
}
