async function onLoad() {
  init();
}

const WIDTH = 1200;
const HEIGHT = 675;

var halvings;

async function init() {
  halvings = await fetch('/api/bitcoin/halvings').then(res => res.json())

  createContent();
}

function createContent() {
  const tbody = document.getElementById('tbody');
  var reward = 50n * 100_000_000n
  var era = 1
  var year = 2008
  var supply = 0n

  while (reward > 0) {
    const row = tbody.insertRow(-1)

    const cell1 = row.insertCell(-1)
    const cell2 = row.insertCell(-1)
    const cell3 = row.insertCell(-1)
    const cell4 = row.insertCell(-1)
    const cell5 = row.insertCell(-1)

    cell2.classList.add("text-end");
    cell3.classList.add("text-end");
    cell4.classList.add("text-end");
    cell5.classList.add("text-end");

    supply += reward * 210_000n / 10_000n
    percentage = supply * 1_000_000n / 21_000_000n
    
    cell1.innerHTML = getDate(era)
    cell2.innerHTML = era + '&thinsp;&nbsp;'
    cell3.innerHTML = formatBigInt(reward, 8)
    cell4.innerHTML = formatBigInt(supply, 4)
    cell5.innerHTML = formatBigInt(percentage, 8) + ' %'

    reward >>= 1n
    era++
    year += 4
  }
}

function getDate(era) {
  if (era < halvings.length) return halvings[era - 1]
  if (era == halvings.length) return `${halvings[era - 1]}~`
  return (2004 + (era * 4)) + ' Halving'
}

const ZEROES = /^0*$/

function formatBigInt(value, digits) {
  var text = value.toString()
  while (text.length <= digits) text = '0' + text
  var i = text.substring(0, text.length - digits)
  var f = text.substring(text.length - digits)
  if (ZEROES.test(f)) return i + '&nbsp;'.repeat(digits + 1)

  var p = ''
  while (f[f.length - 1] == '0') {
    f = f.substring(0, f.length - 1)
    p += '&nbsp;'
  }

  return i + '.' + f + p;
  
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
