function d3ZoomableTreemap(el_id, data, options) {

  options = options || {};

  // options and defaults
  var sum_function =
          options.sum_function || function (d) {
              return d.value;
          },
      sort_function =
          options.sort_function || function (a, b) {
              return b.height - a.height || b.value - a.value;
          },
      margin_top =
          options.margin_top === undefined ? 30 : options.margin_top,
      margin_left =
          options.margin_left === undefined ? 0 : options.margin_left,
      margin_right =
          options.margin_right === undefined ? 0 : options.margin_right,
      margin_bottom =
          options.margin_bottom === undefined ? 20 : options.margin_bottom,
      full_height =
          options.height === undefined ? 600 : options.height,
      full_width =
          options.width || document.getElementById(el_id).offsetWidth,
      formatNumber =
          options.format_number || d3.format(","),
      navigation_height =
          options.navigation_height === undefined
              ? 40 : options.navigation_height,
      zoom_out_msg =
          options.zoom_out_msg || " -  Click here to zoom out",
      zoom_in_msg =
          options.zoom_in_msg || " - Click inside squares to zoom in",
      fill_color =
          options.fill_color || "#bbbbbb",
      debug =
          options.debug === undefined ? false : options.debug
  ;

  var margin = {
          top: margin_top,
          right: margin_right,
          bottom: margin_bottom,
          left: margin_left
      },
      width = full_width - margin.left - margin.right,
      height = full_height - margin.top - margin.bottom,
      transitioning;

  // sets x and y scale to determine size of visible boxes
  var x = d3.scaleLinear()
      .domain([0, width])
      .range([0, width]);

  var y = d3.scaleLinear()
      .domain([0, height])
      .range([0, height]);

  var treemap = d3.treemap()
          .size([width, height])
          .paddingInner(0)
          .round(false);

  var svg = d3.select('#'+el_id).append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
          .style("shape-rendering", "crispEdges");

  var grandparent = svg.append("g")
          .attr("class", "grandparent");

      grandparent.append("rect")
          .attr("width", width)
          .attr("height", navigation_height)
          .attr("fill", fill_color);

      grandparent.append("text")
          .attr("x", 6)
          .attr("y", 6)
          .attr("dy", "1em");

  treemap(data
      .sum(sum_function)
      .sort(sort_function)
  );

  if (debug)
      console.log(data);

  display(data);

  function display(d) {

      // write text into grandparent
      // and activate click's handler
      grandparent
          .datum(d.parent)
          .on("click", transition)
          .select("text")
          .text(breadcrumbs(d));

      // grandparent color
      grandparent
          .datum(d.parent)
          .select("rect")
          .attr("fill", function () {
              return fill_color
          });

      var g1 = svg.insert("g", ".grandparent")
          .datum(d)
          .attr("class", "depth")
          .attr("transform", "translate(0," + navigation_height + ")");

      var g = g1.selectAll("g")
          .data(d.children)
          .enter().
          append("g");

      // add class and click handler to all g's with children
      g.filter(function (d) {
          return d.children;
      })
          .attr("class", "children")
          .style("cursor", "pointer")
          .on("click", transition);

      g.selectAll(".child")
          .data(function (d) {
              return d.children || [d];
          })
          .enter().append("rect")
          .attr("class", "child")
          .call(rect);

      // add title to parents
      g.append("rect")
          .attr("class", "parent")
          .call(rect)
          .append("title")
          .text(function (d){
              return title(d);
          });

      /* Adding a foreign object instead of a text object, allows for text wrapping */
      g.append("foreignObject")
          .call(rect)
          .attr("class", "foreignobj")
          .append("xhtml:div")
          .attr("title", function(d) {
              return title(d);
          })
          .html(function (d) {
              return '' +
                  '<p class="title">' + name(d) + '</p>' +
                  '<p>' + formatNumber(d.value) + '</p>'
              ;
          })
          .attr("class", "textdiv"); //textdiv class allows us to style the text easily with CSS

      function transition(d) {
          if (transitioning || !d) return;
          transitioning = true;

          var g2 = display(d),
              t1 = g1.transition().duration(650),
              t2 = g2.transition().duration(650);

          // Update the domain only after entering new elements.
          x.domain([d.x0, d.x1]);
          y.domain([d.y0, d.y1]);

          // Enable anti-aliasing during the transition.
          svg.style("shape-rendering", null);

          // Draw child nodes on top of parent nodes.
          svg.selectAll(".depth").sort(function (a, b) {
              return a.depth - b.depth;
          });

          // Fade-in entering text.
          g2.selectAll("text").style("fill-opacity", 0);
          g2.selectAll("foreignObject div").style("display", "none");
          /*added*/

          // Transition to the new view.
          t1.selectAll("text").call(text).style("fill-opacity", 0);
          t2.selectAll("text").call(text).style("fill-opacity", 1);
          t1.selectAll("rect").call(rect);
          t2.selectAll("rect").call(rect);

          /* Foreign object */
          t1.selectAll(".textdiv").style("display", "none");
          /* added */
          t1.selectAll(".foreignobj").call(foreign);
          /* added */
          t2.selectAll(".textdiv").style("display", "block");
          /* added */
          t2.selectAll(".foreignobj").call(foreign);
          /* added */

          // Remove the old node when the transition is finished.
          t1.on("end.remove", function(){
              this.remove();
              transitioning = false;
          });
      }

      return g;
  }

  function text(text) {
      text.attr("x", function (d) {
          return x(d.x) + 6;
      })
          .attr("y", function (d) {
              return y(d.y) + 6;
          });
  }

  function rect(rect) {
      rect
          .attr("x", function (d) {
              return x(d.x0);
          })
          .attr("y", function (d) {
              return y(d.y0);
          })
          .attr("width", function (d) {
              return x(d.x1) - x(d.x0);
          })
          .attr("height", function (d) {
              return y(d.y1) - y(d.y0);
          })
          .attr("fill", function (d) {
              return fill_color;
          });
  }

  function foreign(foreign) { /* added */
      foreign
          .attr("x", function (d) {
              return x(d.x0);
          })
          .attr("y", function (d) {
              return y(d.y0);
          })
          .attr("width", function (d) {
              return x(d.x1) - x(d.x0);
          })
          .attr("height", function (d) {
              return y(d.y1) - y(d.y0);
          });
  }

  function title(d) {
      return name(d) + ": " + formatNumber(d.value);
  }

  function name(d) {
      return d.data.label;
  }

  function breadcrumbs(d) {
      var res = "";
      var sep = " > ";
      d.ancestors().reverse().forEach(function(i){
          res += name(i) + sep;
      });
      res = res
          .split(sep)
          .filter(function(i){
              return i!== "";
          })
          .join(sep);

      return res + (d.parent ? zoom_out_msg : zoom_in_msg);
  }
}