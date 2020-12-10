var data;
var sats = [];
var chart;

async function onLoad() {
  var response = await fetch('../data.json');
  data = await response.json();

  const prices = data.bitcoin;
  const size = prices.length - 1;

  for (i = 0; i < size; i++) {
    sats[i] = Math.floor(1e8 / prices[i]);
  }

  initChart();
  updateValues();
}

function onAmountChange() {
  updateValues();
}

function updateValues() {
  if (chart == undefined) {
    return;
  }
  var labels = chart.data.labels;
  var values = chart.data.datasets[0].data;
  labels.length = 0;
  values.length = 0;

  const amount = document.getElementById('amount').value

  for (i = 0; i < sats.length; i++) {
    var offset = i;
    var total = 0;
    while (total < 1e8 && offset > 0) {
      total += sats[offset] * amount;
      offset--;
    }
    var days = i - offset;
    values.push(days);
    labels.push(getIndexDate(i));
  }
  chart.update();
  const duration = values[sats.length - 1];
  var durationSpan = document.getElementById('duration');
  durationSpan.innerHTML = formatDuration(sats.length - duration, sats.length);
  var pluralSpan = document.getElementById('plural');
  pluralSpan.style.display = amount > 1 ? 'initial' : 'none';
  var valueSpan = document.getElementById('value');
  valueSpan.innerHTML = duration * amount;
}

function initChart() {
  var canvas = document.getElementById('dca');

  const ctx = canvas.getContext('2d');

  canvas.parentNode.style.height = '80vh';
  canvas.parentNode.style.width = '90vw';

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          'rgba(54, 162, 235, 0.2)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
        ],
        pointHitRadius: 50,
        pointRadius: 0,
        cubicInterpolationMode: 'monotone'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: false
      },
      tooltips: {
        custom: function(tooltip) {
          if (!tooltip) return;
          tooltip.displayColors = false;
        },
        callbacks: {
          title: function (tooltipItem, data) {
            var days = data.datasets[0].data[tooltipItem[0].index];
            var end = data.labels[tooltipItem[0].index];
            var start = new Date();
            start.setTime(end.getTime() - (days * 24 * 3600000));
            return formatDate(start) + ' - ' + formatDate(end);
          },
          label: function (tooltipItem) {
            const duration = tooltipItem.yLabel;
            const amount = document.getElementById('amount').value;
            return [formatDuration(tooltipItem.index - duration, tooltipItem.index), '$' + duration * amount];
          }
        }
      },
      scales: {
        xAxes: [{
          ticks: {
            callback: function (value) {
              if (value.getDate() == 1 && value.getMonth() == 0) {
                return formatDate(value);
              } else {
                return '';
              }
            },
            stepSize: 1,
            autoSkip: false
          }
        }],
        yAxes: [{
          ticks: {
            callback: function (value) {
              return value + ' days';
            }
          }
        }]
      }
    }
  });
}

function formatDuration(startEpoch, endEpoch) {
  var startDate = getIndexDate(startEpoch);
  var endDate = getIndexDate(endEpoch);
  var year = endDate.getYear() - startDate.getYear();
  var month = endDate.getMonth() - startDate.getMonth();
  var day = endDate.getDate() - startDate.getDate();
  if (day < 0) {
    month--;
    day += new Date(endDate.getYear(), endDate.getMonth(), 0).getDate();
  }
  if (month < 0) {
    year--;
    month += 12;
  }
  var y = plural(year, 'year');
  var m = plural(month, 'month');
  var d = plural(day, 'day');

  if (year != 0) {
    if (month != 0) {
      if (day != 0) {
        return y + ', ' + m + ' and ' + d;
      }
      return y + ' and ' + m;
    }
    if (day != 0) {
      return y + ' and ' + d;
    }
    return 'exactly ' + y;
  }
  if (month != 0) {
    if (day != 0) {
      return m + ' and ' + d;
    }
    return m;
  }
  return d;
}

function plural(n, word) {
  return n + ' ' + word + (n > 1 ? 's' : '');
}

function getIndexDate(index) {
  var date = new Date(data.since);
  date.setDate(date.getDate() + index);
  return date;
}

function formatDate(date) {
  return date.getFullYear().toString() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0');
}
