/**
 * Boba Bear — Chapter 01 Content Config
 *
 * Single source of truth for:
 *   - Featured product showcase (SHOWCASE)
 *   - Delivery platform routing (PLATFORMS)
 *
 * After updating products, also sync:
 *   - The JSON-LD <script type="application/ld+json"> in <head> of index.html
 */

/* ─── Product Showcase ─────────────────────────────────────────────────────── */

const SHOWCASE = [
  {
    name: 'Purple Rain Taro Boba',
    category: 'Signature Sip',
    description: 'Creamy taro boba with a rich purple blend and chewy tapioca pearls.',
    image: 'assets/images/products/purple-rain-taro.png',
    auroraHex: '#D4BEF5', // aurora-lavender
  },
  {
    name: 'Gangnam Iced Coffee Boba',
    category: 'Coffee Drop',
    description: 'Creamy iced coffee with chewy boba and chocolate-lined cup walls.',
    image: 'assets/images/products/gangnam-iced-coffee-boba.png',
    auroraHex: '#FAC9A8', // aurora-peach
  },
  {
    name: 'Zen Master Matcha Boba',
    category: 'Matcha Drop',
    description: 'Premium matcha blended with milk, dark chocolate, and chewy boba.',
    image: 'assets/images/products/zen-master-matcha-boba.png',
    auroraHex: '#B8F0C4', // aurora-mint
  },
  {
    name: 'Spicy Carbonara Ramyun',
    category: 'K-Street Bites',
    description: 'Creamy, spicy dry-stir ramyun finished with sesame and spring onion.',
    image: 'assets/images/products/spicy-carbonara-ramyun.png',
    auroraHex: '#F9C4CC', // aurora-rose
  },
];

/* ─── Platform Routing ──────────────────────────────────────────────────────── */

const PLATFORMS = [
  {
    id: 'swiggy',
    url: 'https://www.swiggy.com/direct/brand/730987?source=swiggy-direct&subSource=generic',
    trackUrl: 'https://www.swiggy.com/direct/brand/730987',
    label: 'Access Swiggy Drop',
    shortLabel: 'Swiggy Drop',
    colorHex: '#FC8019',
  },
  {
    id: 'zomato',
    url: 'https://link.zomato.com/xqzv/rshare?id=12538351530563d18',
    trackUrl: 'https://link.zomato.com/xqzv/rshare?id=12538351530563d18',
    label: 'Access Zomato Drop',
    shortLabel: 'Zomato Drop',
    colorHex: '#E23744',
  },
  {
    id: 'whatsapp',
    url: 'https://wa.me/919259894495?text=I%20want%20to%20Catch%20the%20Drop.%20Send%20the%20menu%21',
    trackUrl: 'https://wa.me/919259894495',
    label: 'Ping on WhatsApp',
    shortLabel: 'WhatsApp',
    colorHex: '#25D366',
  },
];

/* ─── Renderers ─────────────────────────────────────────────────────────────── */

function renderShowcaseGrid() {
  var el = document.getElementById('showcase-grid');
  if (!el || el.children.length) return;

  el.innerHTML = SHOWCASE.map(function (item) {
    var imageArea = item.image
      ? '<div class="bb-card-image" style="background-color:' + item.auroraHex + '33">' +
          '<img src="' + item.image + '" alt="' + item.name + '" width="800" height="600" loading="lazy" decoding="async" />' +
        '</div>'
      : '<div class="bb-card-placeholder" style="background-color:' + item.auroraHex + '40"></div>';

    return (
      '<a href="#delivery-links" class="bb-card"' +
        ' onclick="bbTrack(\'product_card_click\',{product_name:\'' + item.name + '\',category:\'' + item.category + '\',section:\'current_drop\',destination:\'#delivery-links\'})">' +
        imageArea +
        '<div style="margin-top:16px">' +
          '<p class="bb-card-category">' + item.category + '</p>' +
          '<p class="bb-card-title">' + item.name + '</p>' +
          '<p class="bb-card-desc">' + item.description + '</p>' +
        '</div>' +
      '</a>'
    );
  }).join('');
}

function renderPlatformButtons() {
  var el = document.getElementById('platform-buttons');
  if (!el || el.children.length) return;

  el.innerHTML = PLATFORMS.map(function (p) {
    return (
      '<a href="' + p.url + '" target="_blank" rel="noopener noreferrer"' +
        ' onclick="bbTrack(\'order_click\',{platform:\'' + p.id + '\',placement:\'delivery_section\',destination_url:\'' + p.trackUrl + '\'})"' +
        ' class="btn-transition bb-on-brand rounded-[8px] px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.12em] hover:brightness-110"' +
        ' style="background-color:' + p.colorHex + ';box-shadow:0 4px 6px -1px ' + p.colorHex + '40">' +
        p.label +
      '</a>'
    );
  }).join('');
}

function renderMobileBar() {
  var el = document.getElementById('mobile-platform-bar');
  if (!el || el.children.length) return;

  el.innerHTML = PLATFORMS.map(function (p) {
    return (
      '<a href="' + p.url + '" target="_blank" rel="noopener noreferrer"' +
        ' onclick="bbTrack(\'order_click\',{platform:\'' + p.id + '\',placement:\'mobile_sticky_bar\',destination_url:\'' + p.trackUrl + '\'})"' +
        ' class="bb-on-brand rounded-[8px] px-2 py-3 text-center text-[10px] font-bold uppercase leading-tight tracking-[0.08em] sm:px-3 sm:text-[11px]"' +
        ' style="background-color:' + p.colorHex + '">' +
        p.shortLabel +
      '</a>'
    );
  }).join('');
}

/* ─── Init ──────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {
  renderShowcaseGrid();
  renderPlatformButtons();
  renderMobileBar();
});
