async function onLoad() {

  var difficultyResponse = await fetch('/api/bitcoin/difficulty')
  difficultyData = await difficultyResponse.json()

  document.getElementById('difficulty').value = difficultyData.current

  var currentDifficultySpan = document.getElementById('current-difficulty')
  currentDifficultySpan.setAttribute('data-difficulty', difficultyData.current)
  currentDifficultySpan.setAttribute('data-difficulty-formatted', PARAMETERS.difficulty.format(difficultyData.current))

  var maxDifficultySpan = document.getElementById('max-difficulty')
  maxDifficultySpan.setAttribute('data-difficulty', difficultyData.max)
  maxDifficultySpan.setAttribute('data-difficulty-formatted', PARAMETERS.difficulty.format(difficultyData.max))

  var minerResponse = await fetch('miners.json')
  minerData = await minerResponse.json()

  const minerSelect = document.getElementById('miner')
  for (var miner of minerData) {
    var option = document.createElement('option')
    option.text = miner.name
    option.setAttribute('data-hashrate', miner.hashrate)
    option.setAttribute('data-watt', miner.watt)
    minerSelect.add(option)
  }

  var searchParams = new URLSearchParams(window.location.search)
  if (searchParams.has('miner')) {
    const minerSelect = document.getElementById('miner')
    minerSelect.selectedIndex = [...minerSelect.options].findIndex (option => option.text === searchParams.get('miner'))
  }
  if (searchParams.has('x-axis')) document.getElementById('x-axis').value = searchParams.get('x-axis')
  if (searchParams.has('y-axis')) document.getElementById('y-axis').value = searchParams.get('y-axis')
  for(var parameter of Object.values(PARAMETERS)) {
    var id = parameter.id
    if (searchParams.has(id)) document.getElementById(id).value = searchParams.get(id)
  }
  if (searchParams.has('number')) document.getElementById('number').value = searchParams.get('number')
  if (searchParams.get('price-sync')) {
    document.getElementById('price-sync').checked = true
    document.getElementById('price').disabled = true
  }

  var setInitialPrice = document.getElementById('price').value === ''

  if (!setInitialPrice) onMinerUpdate()

  websocketConnect(setInitialPrice)

  new bootstrap.Popover(document.querySelector('.popover-dismiss'))

  document.querySelectorAll('input[type=number]')
    .forEach(input => input.addEventListener('wheel', () => {}))
}

function onChange() {
  const minerSelect = document.getElementById('miner')
  if (minerSelect.selectedIndex != 0) {
    const minerOption = minerSelect.options[minerSelect.selectedIndex]
    if (minerOption &&
      ((minerOption.getAttribute('data-hashrate') != document.getElementById('hashrate').value) ||
       (minerOption.getAttribute('data-watt') != document.getElementById('watt').value))) {
          minerSelect.selectedIndex = 0
    }
  }

  const rows = document.getElementById('table').rows

  const selectXAxis = document.getElementById('x-axis')
  const parameterXAxis = PARAMETERS[selectXAxis.value]
  for (var i = 1, th; th = rows[0].cells[i]; i++) {
    th.innerHTML = parameterXAxis.format(parameterXAxis.step(i))
  }

  const selectYAxis = document.getElementById('y-axis')
  const parameterYAxis = PARAMETERS[selectYAxis.value]
  for (var i = 1, tr; tr = rows[i]; i++) {
    tr.cells[0].innerHTML = parameterYAxis.format(parameterYAxis.step(i))
  }

  for (var i = 0, option; option = selectXAxis.options[i]; i++) {
    option.disabled = i == selectYAxis.selectedIndex;
  }
  for (var i = 0, option; option = selectYAxis.options[i]; i++) {
    option.disabled = i == selectXAxis.selectedIndex;
  }

  for (var y = 1, row; row = rows[y]; y++) {
    for (var x = 1, cell; cell = row.cells[x]; x++) {

      var h = getValue(PARAMETERS.hashrate, x, y)
      var f = 1 - (getValue(PARAMETERS.fee, x, y) / 100)
      var s = getValue(PARAMETERS.subsidy, x, y)
      var p = getValue(PARAMETERS.price, x, y)
      var w = getValue(PARAMETERS.watt, x, y)
      var n = document.getElementById('number').value
      var e = getValue(PARAMETERS.energy, x, y)
      var d = getValue(PARAMETERS.difficulty, x, y)

      var result = n * (((h * f * s * p * 4383) / (d * 131072 / 18310546875)) - w * e * 1461 / 2000)

      // cell.setAttribute('data-amount', formatBitcoin(result / p))

      cell.setAttribute('data-amount', formatPrice(result))
    }
  }

  var d = document.getElementById('difficulty').value
  document.getElementById('network').innerHTML = difficultyToNetworkHashrate(d)

  document.getElementById('home').href = createLink()
}

const PREFIX = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'B']

function difficultyToNetworkHashrate(d) {
  var network = d * 536870912 / 75

  i = 0;
  while (network > 1000 && i < 9) {
    i++
    network /= 1000
  }
  return network.toFixed(1) + ' ' + PREFIX[i] + 'h/s'
}

function getValue(parameter, x, y) {
  const id = parameter.id
  if (document.getElementById('x-axis').value == id) return parameter.step(x)
  if (document.getElementById('y-axis').value == id) return parameter.step(y)
  return document.getElementById(id).value
}

function onMinerUpdate() {
  const minerSelect = document.getElementById('miner')
  const minerOption = minerSelect.options[minerSelect.selectedIndex]
  if (minerOption) {
    for(var parameter of Object.values(PARAMETERS)) {
      var attribute = minerOption.getAttribute('data-' + parameter.id)
      if (attribute) {
        document.getElementById(parameter.id).value = attribute
      }
    }
  }
  onChange()
}

function onShareClick(event) {
  navigator.clipboard.writeText(createLink())

  event.preventDefault()
}

function createLink() {
  var href = window.location.href
  var url = new URL(href.slice(0, href.indexOf('?')))
  var searchParams = url.searchParams
  searchParams.append('x-axis', document.getElementById('x-axis').value)
  searchParams.append('y-axis', document.getElementById('y-axis').value)
  var minerSelectedIndex = document.getElementById('miner').selectedIndex
  if (minerSelectedIndex > 0) {
    searchParams.append('miner', document.getElementById('miner').options[minerSelectedIndex].value)
  }
  for(var parameter of Object.values(PARAMETERS)) {
    searchParams.append(parameter.id, document.getElementById(parameter.id).value)
  }
  searchParams.append('number', document.getElementById('number').value)
  if (document.getElementById('price-sync').checked) {
    searchParams.append('price-sync', 'true')
  }
  return url.toString()
}

function websocketConnect(setInitialPrice) {

  const currentPriceSpan = document.getElementById('current-price')
  const priceInput = document.getElementById('price')
  const priceSyncCheckbox = document.getElementById('price-sync')

  const webSocket = new WebSocket('wss://api-pub.bitfinex.com/ws/2')

  webSocket.onopen = function (event) {
    let msg = JSON.stringify({
      event: 'subscribe',
      channel: 'ticker',
      symbol: 'tBTCUSD'
    })

    webSocket.send(msg)
  }

  webSocket.onclose = function(event) {
    setTimeout(() => webSocketConnect(false), 1000)
  }

  webSocket.onmessage = function(event) {
    var data = JSON.parse(event.data)
    if (Array.isArray(data)) {
      var message = data[1]
      if (Array.isArray(message)) {
        var price = Math.round(message[6])
        currentPriceSpan.setAttribute('data-price', price)
        currentPriceSpan.setAttribute('data-price-formatted', PARAMETERS.price.format(price))
        if (priceSyncCheckbox.checked || setInitialPrice) {
          priceInput.value = price
          onChange()
          initialConnect = false
        }
      }
    }
  }
}

function onPriceClick(event) {
  const element = event.target
  document.getElementById('price').value = element.getAttribute('data-price')
  onChange()
}

function onDifficultyClick(event) {
  const element = event.target
  document.getElementById('difficulty').value = element.getAttribute('data-difficulty')
  onChange()
}

function onPriceSyncClick(event) {
  const element = event.target
  const priceInput = document.getElementById('price')
  if (element.checked) {
    priceInput.value = document.getElementById('current-price').getAttribute('data-price')
    priceInput.disabled = true
    onChange()
  } else {
    priceInput.disabled = false
  }
}

class Parameter {
  constructor(id, format, step) {
    this.id = id
    this.format = format
    if (step) this.step = step
  }

  step(i) {
    var value = document.getElementById(this.id).value
    var step = Number(Number(value / 5).toPrecision(1))
    return i * step
  }
}

const PARAMETERS = {
  hashrate: new Parameter('hashrate', v => v.toLocaleString() + ' Th/s'),
  fee: new Parameter('fee', v => v.toLocaleString() + '%'),
  subsidy: new Parameter('subsidy', formatSubsidy, subsidyStep),
  price: new Parameter('price', v => formatPrice(Math.round(v))),
  watt: new Parameter('watt', v => v.toLocaleString() + ' W'),
  energy: new Parameter('energy', formatPrice),
  difficulty: new Parameter('difficulty', v => v.toLocaleString())
}

function formatPrice(v) {
  return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString()
}

function formatSubsidy(i) {
  return '₿ ' + formatBitcoin(i)
}

function formatBitcoin(i) {
  var s = i.toString()
  return s.slice(0, (s.indexOf('.')) + 9)
}

function subsidyStep(i) {
  return 100 / (1 << i)
}