async function onLoad() {
  init();
}

const WIDTH = 1200;
const HEIGHT = 675;

var bitcoinPrices;

async function init() {
  bitcoinPrices = await fetch('/api/bitcoin/prices').then(res => res.json())

  createContent();
}

function createContent() {
  const size = bitcoinPrices.prices.length - 1;
  const content = document.getElementById('content');

  var hasStreak;
  var price = 0;

  do {
    hasStreak = false;
    price += 1000;

    var streakLength = 0;
    var streakStart = 0;
    var start = 0;

    for (var index = 0; index <= size; index++) {
      if (bitcoinPrices.prices[index] >= price) {
        hasStreak = true;
        if (start == 0) {
          start = index;
        }
      } else {
        if (start != 0) {
          var length = index - start;
          if (length > streakLength) {
            streakStart = start;
            streakLength = length;
          }
          start = 0;
        }
      }
    }
    if (start != 0 && index - start > streakLength) {
      streakStart = start;
      streakLength = size - start + 1;
    }

    content.innerHTML += '$' + price + ': ' + formatDays(streakLength);
    if (hasStreak) {
      content.innerHTML += ' (' + formatDate(getIndexDate(streakStart)) + ' - ';
      if (streakStart + streakLength - 1 == size) {
        content.innerHTML += 'today';
      }
      else {
        content.innerHTML += formatDate(getIndexDate(streakStart + streakLength - 1));
      }
      content.innerHTML += ')';

      if (start != 0 && start != streakStart) {
        content.innerHTML += '<span class="lb"></span>Current streak: ' + formatDays(size - start + 1) + ' (' + formatDate(getIndexDate(start)) + ' - today)';
      }

      content.innerHTML += '</br>';
    }
  }
  while (hasStreak);

  const root = document.documentElement;
  root.style.setProperty('--lines', price/1000);
}

function formatDays(longest) {
  return longest + ' day' + (longest == 1 ? '' : 's');
}

function formatDate(date) {
  return date.getFullYear().toString() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0');
}

function getIndexDate(index) {
  var date = new Date(bitcoinPrices.since);
  date.setDate(date.getDate() + index);
  return date;
}
