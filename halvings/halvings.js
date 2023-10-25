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
  var reward = 100n * 100_000_000n
  var era = 0
  var year = 2008
  var supply = 0n
  var percentage = 0n

  do {
    reward >>= 1n
    era++

    const row = tbody.insertRow(-1)

    const cell1 = row.insertCell(-1)
    cell1.innerHTML = getDate(era)

    const cell2 = row.insertCell(-1)
    cell2.classList.add("text-center");
    cell2.innerHTML = (era < 10 ? '&nbsp;' : '') + era

    const cell3 = row.insertCell(-1)
    cell3.classList.add("text-end");
    cell3.innerHTML = formatBigInt(reward, 8)

    const cell4 = row.insertCell(-1)
    cell4.classList.add("text-end");
    cell4.innerHTML = formatBigInt(supply, 4)

    const cell5 = row.insertCell(-1)
    cell5.classList.add("text-end");
    cell5.innerHTML = formatBigInt(percentage, 8) + ' %'

    supply += reward * 210_000n / 10_000n
    percentage = supply * 1_000_000n / 21_000_000n
    year += 4

  } while (reward > 0)
}

function getDate(era) {
  if (era < halvings.length) return halvings[era - 1]
  if (era == halvings.length) return `${halvings[era - 1]}~`
  return (2004 + (era * 4)) + ' Halving'
}

const ZEROES = /^0*$/

function formatBigInt(value, digits) {
  var text = value.toString()
  const leadingZeroes = digits - text.length + 1
  if (leadingZeroes > 0) text = '0'.repeat(leadingZeroes) + text
  
  var trailingZeroes = 0
  while (text[text.length - trailingZeroes - 1] == '0' && trailingZeroes < digits) trailingZeroes++
  
  const integer = text.substring(0, text.length - digits)
  const separator = trailingZeroes == digits ? '&nbsp;' : '.'
  const fraction = text.substring(text.length - digits, text.length - trailingZeroes)
  const padding = '&nbsp;'.repeat(trailingZeroes)

  return integer + separator + fraction + padding
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
