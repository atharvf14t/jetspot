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

  // Each section rises once as it enters, staggered when several arrive together.
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && "IntersectionObserver" in window) {
    var pieces = [];
    var seen = [];
    var addPiece = function (el) {
      if (!el || seen.indexOf(el) !== -1) return;
      seen.push(el);
      pieces.push(el);
    };
    document.querySelectorAll("main > section, main > article").forEach(function (block) {
      if (block.querySelector(".prose")) {
        addPiece(block);
      } else if (block.classList.contains("hero")) {
        block.querySelectorAll(".hero-title, .hero-meta, .hero-photo").forEach(addPiece);
      } else if (block.querySelector(".svc-card")) {
        block.querySelectorAll(":scope > .wrap > .pill, :scope > .wrap > h1, :scope > .wrap > .lede, :scope > .wrap > .svc-head, .svc-card").forEach(addPiece);
      } else if (block.querySelector(".acc")) {
        block.querySelectorAll(".eyebrow, .acc").forEach(addPiece);
      } else if (block.querySelector(".post-card")) {
        block.querySelectorAll(".blog-head, .post-card").forEach(addPiece);
      } else if (block.querySelector(".post-grid")) {
        block.querySelectorAll(".blog-hero, .filters, .post-grid > a").forEach(addPiece);
      } else if (block.querySelector(".quote-grid")) {
        block.querySelectorAll(".quote").forEach(addPiece);
      } else if (block.querySelector(".app")) {
        block.querySelectorAll(".app").forEach(addPiece);
      } else if (block.classList.contains("partner")) {
        block.querySelectorAll(":scope > .wrap > .kicker, :scope > .wrap > h1, :scope > .wrap > .lede, .perk-row, .partner-copy, .how, .refer").forEach(addPiece);
      } else if (block.querySelector(".connect")) {
        block.querySelectorAll(".connect, .ask").forEach(addPiece);
      } else if (block.classList.contains("contact")) {
        block.querySelectorAll(".contact-hero, .contact-mailblock, .contact-aside, .contact-panel").forEach(addPiece);
      } else {
        addPiece(block);
      }
    });
    pieces.forEach(function (el) { el.classList.add("rise"); });

    var queued = [];
    var flushTimer = 0;
    var flush = function () {
      flushTimer = 0;
      var batch = queued;
      queued = [];
      batch.sort(function (a, b) {
        var ra = a.getBoundingClientRect();
        var rb = b.getBoundingClientRect();
        if (Math.abs(ra.top - rb.top) > 12) return ra.top - rb.top;
        return ra.left - rb.left;
      });
      batch.forEach(function (el, i) {
        el.style.transitionDelay = Math.min(0.12 + i * 0.1, 0.52) + "s";
        el.classList.add("is-in");
      });
    };
    var io = new IntersectionObserver(function (entries) {
      var grew = false;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        queued.push(entry.target);
        io.unobserve(entry.target);
        grew = true;
      });
      if (grew) {
        clearTimeout(flushTimer);
        flushTimer = setTimeout(flush, 40);
      }
    }, { threshold: 0, rootMargin: "0px 0px 8% 0px" });

    requestAnimationFrame(function () {
      document.documentElement.classList.add("motion-ready");
      requestAnimationFrame(function () {
        pieces.forEach(function (el) { io.observe(el); });
      });
    });
  }

  // Full-screen footer reveal: text stays nearly still while the black band scrolls up over it.
  var footer = document.querySelector("footer.footer");
  var footerWrap = footer && footer.querySelector(".wrap");
  var footerWide = window.matchMedia("(min-width: 981px)");
  if (footer && footerWrap) {
    var footerFrame = 0;
    var placeFooter = function () {
      if (reduceMotion || !footerWide.matches) {
        footerWrap.style.transform = "";
        return;
      }
      var rect = footer.getBoundingClientRect();
      var entered = window.innerHeight - rect.top;
      var shift = entered - rect.height;
      if (shift < -rect.height) shift = -rect.height;
      if (shift > 0) shift = 0;
      footerWrap.style.transform = "translate3d(0," + shift.toFixed(2) + "px,0)";
    };
    var queueFooter = function () {
      if (footerFrame) return;
      footerFrame = requestAnimationFrame(function () {
        footerFrame = 0;
        placeFooter();
      });
    };
    placeFooter();
    window.addEventListener("scroll", queueFooter, { passive: true });
    window.addEventListener("resize", queueFooter);
    footerWide.addEventListener("change", queueFooter);
  }

  // Safari ignores prefers-color-scheme inside an SVG favicon.
  var safari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  var icon = document.querySelector('link[rel="icon"]');
  if (safari && icon && window.matchMedia) {
    var scheme = window.matchMedia("(prefers-color-scheme: dark)");
    var paintIcon = function () {
      icon.href = scheme.matches ? "favicon-dark.svg?v=tick7" : "favicon-light.svg?v=tick7";
    };
    paintIcon();
    scheme.addEventListener("change", paintIcon);
  }
})();
