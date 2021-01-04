async function onLoad() {
  var index = document.getElementById('data');
  
  var line = 0;
  var pos = 0;
  var hex = '';
  var chars = '';
  var currentAnnotation;
  
  var annotations = document.getElementsByClassName('annotation');
  for (var i = 0; i < annotations.length; i++) {
    var annotation = annotations[i];
    var fragment = annotation.dataset.fragment;
    annotation.dataset.annotation = i;
    for (j = 0; j < fragment.length; j += 2) {
      var beginSpan = (j == 0) || (pos == 0) ? `<span class='fragment' data-annotation='${i}' onmouseover=fragmentHighlight(${i}) onmouseout=fragmentFade(${i}) onclick=fragmentClick(${i})>` : '';
      var endSpan = ((j + 2) >= fragment.length) || (pos == 15) ? '</span>' : '';
      
      var b = fragment.substring(j, j + 2);
      
      if (pos == 0) {
        var l = (line * 16).toString(16).toUpperCase();
        while (l.length < 8) {
          l = '0' + l;
        }
        index.innerHTML += l + '&nbsp;&nbsp;&nbsp;';
      }
      
      hex += beginSpan;
      hex += b;
      hex += endSpan;

      hex += '&nbsp;';
      
      chars += beginSpan;
      var code = parseInt(b, 16);
      if (code <= 0x1F || (code >= 0x7F && code <= 0x9F)) {
        chars += '.';
      }
      else if (code == 0x20) {
        chars += '&nbsp;';
      }
      else {
        chars += '&#x' + b + ';';
      }
      chars += endSpan;

      pos++;

      if (pos == 8) {
        hex += '&nbsp;';
      }
      if (pos == 16) {
        index.innerHTML += hex + '&nbsp;&nbsp;' + chars + '<br>';

        hex = '';
        chars = '';
        pos = 0;
        line++;
      }
    }
  }
  while (pos < 16) {
    hex += '&nbsp;&nbsp;&nbsp;';
    pos++;
  }
  index.innerHTML += hex + '&nbsp;&nbsp;' + chars + '<br>';
}

function fragmentHighlight(index) {
  Array.prototype.forEach.call(document.getElementsByClassName('fragment'), function(element) {
    if (element.dataset.annotation == index) {
      element.classList.remove('fragment-fade');
      element.classList.add('fragment-highlight');
    }
  });
}

function fragmentFade(index) {
  Array.prototype.forEach.call(document.getElementsByClassName('fragment'), function(element) {
    if (element.dataset.annotation == index) {
      element.classList.add('fragment-fade');
      element.classList.remove('fragment-highlight');
    }
  });
}

function fragmentClick(index) {
  Array.prototype.forEach.call(document.getElementsByClassName('annotation'), function(element) {
    if (element.dataset.annotation == index) {
      element.classList.toggle('annotation-show');
    } else {
      element.classList.remove('annotation-show');
    }
  });
}
