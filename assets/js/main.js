/* СТО «Хоттабыч сервис» - поведение страницы.
   Фильтр каталога, поиск, подстановка услуги в форму, маска телефона,
   проверка формы, стеклянная шапка и мягкое появление блоков.
   GSAP + ScrollTrigger + Lenis подключаются локально, при их отсутствии
   работает запасной вариант на IntersectionObserver. */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktopPointer = window.matchMedia('(pointer: fine)').matches;
  var lenis = null;

  /* ------------------------------------------------------------ плавный скролл */
  if (window.Lenis && !reduce.matches && desktopPointer) {
    try {
      lenis = new window.Lenis({
        duration: 1.05,
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 1
      });
      var raf = function (time) {
        lenis.raf(time);
        window.requestAnimationFrame(raf);
      };
      window.requestAnimationFrame(raf);
    } catch (err) {
      lenis = null;
    }
  }

  var scrollToY = function (top) {
    var y = Math.max(0, Math.round(top));
    if (lenis) {
      lenis.scrollTo(y);
    } else if (reduce.matches) {
      window.scrollTo(0, y);
    } else {
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  var scrollToTarget = function (target, offset) {
    if (!target) {
      return;
    }
    var top = target.getBoundingClientRect().top + window.pageYOffset - (offset || 0);
    scrollToY(top);
  };

  /* ------------------------------------------------------------ шапка */
  var header = document.getElementById('header');

  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.pageYOffset > 6);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------ появление блоков */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  if (revealItems.length) {
    if (reduce.matches) {
      docEl.classList.add('no-motion');
      revealItems.forEach(function (el) {
        el.classList.add('is-in');
      });
    } else if (window.gsap && window.ScrollTrigger) {
      docEl.classList.add('motion');
      window.gsap.registerPlugin(window.ScrollTrigger);
      if (lenis) {
        lenis.on('scroll', window.ScrollTrigger.update);
      }
      revealItems.forEach(function (el) {
        window.gsap.fromTo(el,
          { opacity: 0, y: 26 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          });
      });
    } else if ('IntersectionObserver' in window) {
      docEl.classList.add('motion');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealItems.forEach(function (el) {
        io.observe(el);
      });
    } else {
      docEl.classList.add('no-motion');
    }
  }

  /* мягкий параллакс фото в hero: только десктоп и без reduce-motion */
  if (window.gsap && window.ScrollTrigger && !reduce.matches && window.innerWidth > 860) {
    var heroFrame = document.querySelector('.hero__frame');
    var heroImg = document.querySelector('.hero__img');
    if (heroFrame && heroImg) {
      window.gsap.fromTo(heroImg,
        { scale: 1.08, yPercent: -2.5 },
        {
          scale: 1.02,
          yPercent: 2.5,
          ease: 'none',
          scrollTrigger: {
            trigger: heroFrame,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        });
    }
  }

  /* ------------------------------------------------------------ каталог */
  var grid = document.getElementById('catalog-grid');
  var cards = grid ? Array.prototype.slice.call(grid.querySelectorAll('.service')) : [];
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var search = document.getElementById('catalog-search');
  var clearBtn = document.getElementById('catalog-clear');
  var resetBtn = document.getElementById('catalog-reset');
  var countEl = document.getElementById('catalog-count');
  var emptyBox = document.getElementById('catalog-empty');
  var tabsBox = document.querySelector('.catalog__tabs');
  var serviceField = document.querySelector('[data-field="service"]');
  var state = { group: 'all', q: '' };

  var normalize = function (value) {
    return String(value || '').toLowerCase().replace(/ё/g, 'е').trim();
  };

  var applyFilter = function () {
    if (!cards.length) {
      return;
    }
    var q = normalize(state.q);
    var shown = 0;

    cards.forEach(function (card) {
      var haystack = normalize(card.dataset.name);
      var okGroup = state.group === 'all' || card.dataset.group === state.group;
      var okQuery = !q || haystack.indexOf(q) !== -1;
      var visible = okGroup && okQuery;
      card.hidden = !visible;
      if (visible) {
        shown += 1;
      }
    });

    if (countEl) {
      countEl.textContent = String(shown);
    }
    if (emptyBox) {
      emptyBox.classList.toggle('is-visible', shown === 0);
    }
    if (resetBtn) {
      resetBtn.hidden = state.group === 'all' && !q;
    }
    if (clearBtn && search) {
      clearBtn.hidden = !search.value;
    }
  };

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      state.group = tab.dataset.filter || 'all';
      tabs.forEach(function (other) {
        other.setAttribute('aria-pressed', other === tab ? 'true' : 'false');
      });
      applyFilter();
      if (tabsBox && window.innerWidth <= 768) {
        var box = tabsBox.getBoundingClientRect();
        var rect = tab.getBoundingClientRect();
        if (rect.left < box.left || rect.right > box.right) {
          tab.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    });
  });

  if (search) {
    search.addEventListener('input', function () {
      state.q = search.value;
      applyFilter();
    });
    search.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        search.value = '';
        state.q = '';
        applyFilter();
      }
    });
  }

  var resetFilter = function () {
    state.group = 'all';
    state.q = '';
    if (search) {
      search.value = '';
    }
    tabs.forEach(function (tab) {
      tab.setAttribute('aria-pressed', tab.dataset.filter === 'all' ? 'true' : 'false');
    });
    applyFilter();
  };

  if (resetBtn) {
    resetBtn.addEventListener('click', resetFilter);
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      resetFilter();
      if (search) {
        search.focus();
      }
    });
  }
  if (emptyBox) {
    emptyBox.addEventListener('click', function (event) {
      if (event.target.closest('a')) {
        return;
      }
      resetFilter();
    });
  }

  /* ------------------------------------------------------------ выбор услуги */
  var select = document.getElementById('f-service');

  var setService = function (name) {
    if (!select) {
      return;
    }
    var matched = false;
    for (var i = 0; i < select.options.length; i += 1) {
      if (select.options[i].value === name) {
        matched = true;
        break;
      }
    }
    select.value = matched ? name : 'Другое';
    if (serviceField) {
      serviceField.classList.remove('is-invalid');
      serviceField.classList.add('is-set');
      window.setTimeout(function () {
        serviceField.classList.remove('is-set');
      }, 2200);
    }
    var err = document.getElementById('err-service');
    if (err) {
      err.textContent = '';
    }
    select.setAttribute('aria-invalid', 'false');
  };

  if (grid) {
    grid.addEventListener('click', function (event) {
      var pick = event.target.closest('.service__pick');
      if (!pick) {
        return;
      }
      var card = pick.closest('.service');
      setService(pick.dataset.service || '');
      cards.forEach(function (item) {
        item.classList.remove('is-picked');
      });
      if (card) {
        card.classList.add('is-picked');
        window.setTimeout(function () {
          card.classList.remove('is-picked');
        }, 2400);
      }
      var booking = document.getElementById('booking');
      scrollToTarget(booking, header ? header.offsetHeight + 12 : 80);
    });
  }

  /* ------------------------------------------------------------ якорные ссылки */
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (link) {
    link.addEventListener('click', function (event) {
      var href = link.getAttribute('href');
      if (!href || href === '#') {
        return;
      }
      var target = document.querySelector(href);
      if (!target) {
        return;
      }
      event.preventDefault();
      scrollToTarget(target, header ? header.offsetHeight + 10 : 72);
      if (target.id === 'booking' && select && !select.value) {
        select.focus({ preventScroll: true });
      }
    });
  });

  /* ------------------------------------------------------------ маска телефона */
  var phone = document.getElementById('f-phone');

  var formatPhone = function (raw) {
    var digits = String(raw).replace(/\D/g, '');
    if (digits.indexOf('80') === 0) {
      digits = '375' + digits.slice(2);
    }
    if (digits.indexOf('375') !== 0) {
      digits = '375' + digits;
    }
    digits = digits.slice(0, 12);
    var out = '+375';
    if (digits.length > 3) {
      var a = digits.slice(3, 5);
      var b = digits.slice(5, 8);
      var c = digits.slice(8, 10);
      var d = digits.slice(10, 12);
      out += ' (' + a;
      if (a.length === 2) {
        out += ')';
      }
      if (b) {
        out += ' ' + b;
      }
      if (c) {
        out += '-' + c;
      }
      if (d) {
        out += '-' + d;
      }
    }
    return out;
  };

  var phoneDigits = function () {
    return phone ? String(phone.value).replace(/\D/g, '') : '';
  };

  if (phone) {
    phone.addEventListener('focus', function () {
      if (!phone.value) {
        phone.value = '+375 (';
      }
    });
    phone.addEventListener('input', function () {
      var caretToEnd = phone.value.length === phone.selectionStart;
      phone.value = formatPhone(phone.value);
      if (caretToEnd) {
        phone.setSelectionRange(phone.value.length, phone.value.length);
      }
    });
    phone.addEventListener('blur', function () {
      if (phoneDigits().length <= 3) {
        phone.value = '';
      }
    });
  }

  /* ------------------------------------------------------------ форма записи */
  var form = document.getElementById('booking-form');
  var done = document.getElementById('booking-done');
  var again = document.getElementById('booking-again');

  if (form && done) {
    var labels = form.dataset;
    var submitBtn = form.querySelector('button[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.innerHTML : '';
    var fields = {
      name: document.getElementById('f-name'),
      phone: phone,
      service: select,
      consent: document.getElementById('f-consent')
    };

    var setError = function (key, message) {
      var wrap = form.querySelector('[data-field="' + key + '"]');
      var box = document.getElementById('err-' + key);
      if (box) {
        box.textContent = message || '';
      }
      if (wrap && key !== 'consent') {
        wrap.classList.toggle('is-invalid', Boolean(message));
      }
      if (wrap && key === 'consent') {
        wrap.classList.toggle('is-invalid', Boolean(message));
      }
      var input = fields[key];
      if (input) {
        input.setAttribute('aria-invalid', message ? 'true' : 'false');
      }
    };

    var validate = function () {
      var first = null;

      if (!fields.name || fields.name.value.trim().length < 2) {
        setError('name', labels.errName);
        first = first || fields.name;
      } else {
        setError('name', '');
      }

      var digits = phoneDigits();
      if (digits.length !== 12 || digits.indexOf('375') !== 0) {
        setError('phone', labels.errPhone);
        first = first || phone;
      } else {
        setError('phone', '');
      }

      if (!fields.service || !fields.service.value) {
        setError('service', labels.errService);
        first = first || fields.service;
      } else {
        setError('service', '');
      }

      if (!fields.consent || !fields.consent.checked) {
        setError('consent', labels.errConsent);
        first = first || fields.consent;
      } else {
        setError('consent', '');
      }

      if (first) {
        first.focus({ preventScroll: false });
        return false;
      }
      return true;
    };

    ['name', 'phone', 'service', 'consent'].forEach(function (key) {
      var input = fields[key];
      if (!input) {
        return;
      }
      input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', function () {
        var wrap = form.querySelector('[data-field="' + key + '"]');
        if (wrap && wrap.classList.contains('is-invalid')) {
          setError(key, '');
        }
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!validate()) {
        return;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = labels.msgSubmitting || 'Отправляем...';
      }
      window.setTimeout(function () {
        form.hidden = true;
        done.hidden = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = submitLabel;
        }
        done.setAttribute('tabindex', '-1');
        done.focus({ preventScroll: true });
        var card = done.closest('.booking__card') || done;
        scrollToTarget(card, header ? header.offsetHeight + 16 : 80);
      }, 420);
    });

    if (again) {
      again.addEventListener('click', function () {
        form.reset();
        ['name', 'phone', 'service', 'consent'].forEach(function (key) {
          setError(key, '');
        });
        done.hidden = true;
        form.hidden = false;
        if (fields.name) {
          fields.name.focus();
        }
      });
    }
  }

  /* ------------------------------------------------------------ вопросы */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll('.faq__item'));
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) {
        return;
      }
      faqItems.forEach(function (other) {
        if (other !== item) {
          other.open = false;
        }
      });
    });
  });
})();
