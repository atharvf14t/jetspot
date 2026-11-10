(function () {
  var clock = document.querySelector("[data-clock]");
  if (clock) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var render = function () {
      var d = new Date();
      var h = d.getHours();
      var m = String(d.getMinutes()).padStart(2, "0");
      var suffix = h >= 12 ? "pm" : "am";
      var hr = h % 12 || 12;
      clock.textContent = d.getDate() + " " + months[d.getMonth()] + ", " + hr + ":" + m + " " + suffix;
      clock.dateTime = d.toISOString();
    };
    render();
    setInterval(render, 30000);
  }

  var burger = document.querySelector("[data-burger]");
  var menu = document.querySelector("[data-menu]");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  document.querySelectorAll("[data-accordion]").forEach(function (root) {
    var items = root.querySelectorAll(".acc");
    items.forEach(function (item) {
      var btn = item.querySelector(".acc-btn");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var willOpen = !item.classList.contains("open");
        items.forEach(function (other) {
          other.classList.remove("open");
          var b = other.querySelector(".acc-btn");
          if (b) b.setAttribute("aria-expanded", "false");
        });
        if (willOpen) {
          item.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  });

  var scroller = document.querySelector("[data-carousel]");
  if (scroller) {
    var track = scroller.querySelector(".carousel-track");
    var cards = track ? track.children : [];
    var dots = document.querySelector("[data-dots]");
    var index = 0;

    var go = function (next) {
      if (!cards.length) return;
      index = (next + cards.length) % cards.length;
      var card = cards[index];
      scroller.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
      paint();
    };

    var paint = function () {
      if (!dots) return;
      Array.prototype.forEach.call(dots.children, function (dot, i) {
        if (i === index) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    };

    if (dots) {
      Array.prototype.forEach.call(cards, function (_, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Scroll to story " + (i + 1));
        b.addEventListener("click", function () { go(i); });
        dots.appendChild(b);
      });
      paint();
    }

    document.querySelectorAll("[data-dir]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        go(index + Number(btn.getAttribute("data-dir")));
      });
    });

    var ticking = false;
    scroller.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var closest = 0;
        var best = Infinity;
        Array.prototype.forEach.call(cards, function (card, i) {
          var dist = Math.abs(card.offsetLeft - track.offsetLeft - scroller.scrollLeft);
          if (dist < best) {
            best = dist;
            closest = i;
          }
        });
        index = closest;
        paint();
        ticking = false;
      });
    }, { passive: true });
  }

  var filters = document.querySelector("[data-filters]");
  if (filters) {
    filters.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (!link) return;
      event.preventDefault();
      var cat = link.getAttribute("data-cat");
      filters.querySelectorAll("a").forEach(function (item) {
        item.classList.toggle("is-on", item === link);
      });
      document.querySelectorAll("[data-post]").forEach(function (card) {
        card.hidden = cat !== "all" && card.getAttribute("data-post") !== cat;
      });
    });
  }

  document.querySelectorAll("form[data-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      form.classList.add("hide");
      var thanks = form.parentElement.querySelector("[data-thanks]");
      if (thanks) thanks.classList.add("show");
    });
  });
})();
