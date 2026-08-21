# IMP-028D Ordering UI Design Lock — RC1

Status: DESIGN LOCK FOR IMPLEMENTATION
Scope: BOBA Bear ordering UI only
Primary visual reference: the approved/generated composite mockup in the current ChatGPT conversation
Purpose: remove visual ambiguity for the coding agent while preserving existing commerce authority and behavior.

## 1. Visual authority order

When sources conflict, use this order:

1. **This Design Lock**
2. **Approved composite mockup**
3. **Existing BOBA Bear design system**
4. **Existing implemented product behavior / architecture**
5. **QSR references only as structural inspiration**

Do not copy McDelivery branding, colors, assets, imagery, or copy.

The approved mockup is a **visual target**, not literal product data. Real product names, prices, modifiers, menu structure, accessibility labels, and runtime state must come from BOBA Bear data/contracts.

## 2. Core interaction model

### Category selection

- The center catalogue shows **only items belonging to the currently selected root category**.
- Do **not** render all root categories one after another in the document.
- The selected category is explicit UI state.
- Desktop: selected state comes from the left category rail.
- Tablet/mobile: selected state comes from the horizontal category strip.
- Scroll-spy is not needed for root-category selection in this model.
- Switching category replaces the center catalogue with that category's items.
- Preserve the selected category during in-page interactions where practical.

### Product CTA

For Menu product cards:

- Primary CTA is always **`Add +`**.
- Items with customization capability display a small secondary text label:
  **`Customisable`**
- Do not use `Customize` as the primary product-card CTA.
- If the item requires or supports configuration, `Add +` opens the configurator.
- If an item truly has no configuration, `Add +` may add directly.
- Do not change modifier/commercial authority to create this behavior.

Inside the configurator, the final CTA may be:

**`Add to cart · ₹X`**

### Cart scrolling

Desktop/XL Cart is a bounded sticky commerce panel:

- Cart header remains visible.
- Cart item list may scroll independently when content exceeds available height.
- Cart summary and Checkout remain pinned/fixed within the Cart panel.
- The Menu must not become a nested independent scroll pane.
- Category rail must not become a nested independent scroll pane during normal use.
- The intentional exception to the previous "single document scroll" rule is:
  **Cart item list may scroll independently.**

## 3. XL desktop target

Representative viewport: 1920 × 1080.

### Ordering shell

Use a wide commerce-specific shell rather than the generic marketing container.

Target geometry:

- shell max width: approximately **1560–1620px**
- left category rail: approximately **180–190px**
- center catalogue: flexible and visually dominant
- right Cart rail: approximately **330–350px**
- gaps between zones: approximately **24px**
- page side gutters on 1920px viewport: approximately **140–180px**

Do not treat these as pixel-perfect invariants when real responsive constraints require minor adjustments.

### Left category rail

- Sticky below global nav.
- Shows all root categories.
- One selected category with strong Firefly Green treatment.
- Text/icon hierarchy should be compact and scannable.
- No independent vertical scrollbar under ordinary menu size.
- Use real category icons only if current assets/data support them; do not fabricate product-category media.

### Center catalogue

- Shows **one selected category only**.
- Category heading at top.
- Optional subcategory label under root heading when real menu structure requires it.
- XL target: **3 product cards per row**.
- Cards should have consistent dimensions.
- Product photography is the visual lead.
- Do not render giant explanatory/serviceability blocks before products.

### Right Cart

- Sticky beneath global nav.
- Bounded to usable viewport height.
- Header:
  - `YOUR CART`
  - optional `Clear all`
- Empty state:
  - visually intentional, not a tiny text line
  - concise customer copy
- Populated state:
  - compact line items
  - thumbnail where available
  - product name in readable body/UI type
  - modifier summary
  - quantity controls
  - Edit
  - Remove
  - line amount
- Cart items region scrolls independently.
- Cart summary/footer stays visible:
  - Estimated subtotal when safely resolvable
  - fallback when unresolved
  - Checkout primary action

## 4. Product-card design

### Hierarchy

1. Product image
2. Product name
3. Short description
4. Price
5. `Add +`
6. `Customisable` label when applicable

### Visual rules

- Image ratio: approximately **4:3**
- Product photography must remain prominent.
- Product name: Nunito / body UI family, bold or semibold.
- Do not use the expressive display font for every product name.
- Product name: max ~2 lines.
- Description: max ~2 lines.
- Price should be easy to find but should not compete visually with title.
- Primary CTA height: approximately **44–48px**
- CTA should be visually consistent across all cards.
- `Customisable` is secondary text below CTA, not another button.
- Card radius: use BOBA Bear card token.
- Card spacing/padding: use existing 4px-grid token system.

## 5. Typography lock

Use expressive BOBA Bear display typography for:

- `Menu`
- selected root category heading such as `THE BAR`
- occasional small branded labels where appropriate

Use Nunito / UI body family for:

- product names
- prices
- descriptions
- category labels
- Cart line items
- modifiers
- quantity
- buttons
- delivery/serviceability
- checkout copy

Goal: BOBA Bear identity + transaction scanability.

## 6. Location/serviceability

- Keep delivery context compact.
- Preferred pattern:
  `Delivering in DEHRADUN  ›  Check delivery PIN`
- Do not restore the old large serviceability panel.
- Do not expose engineering or server-authority wording.
- Existing delivery PIN behavior remains reachable.

## 7. Customization modal

Desktop target:

- centered modal approximately **560–640px** wide
- strong product context at top
- readable product name and base price
- modifier groups rendered as branded interactive rows
- no visually raw/native-checkbox experience
- selection states clearly distinguish:
  - Included/default
  - Optional
  - Selected
  - Paid delta
- preserve existing modifier constraints and authority
- sticky/persistent modal footer where needed:
  - Item total
  - `Add to cart · ₹X`
- modal must sit above sticky Cart/category UI
- backdrop must clearly separate modal from page

Mobile:
- near-full-screen dialog/sheet is acceptable
- footer action remains reachable

## 8. Tablet target (~1024px)

- No desktop left category rail.
- No desktop right Cart rail.
- Horizontal category strip.
- Center shows only selected category.
- Product grid: **2 columns** where practical.
- Populated Cart represented by a sticky/bottom Cart continuity bar.
- Example:
  `3 items · Estimated ₹697          View Cart →`
- Do not squeeze desktop rails into tablet width.

## 9. Mobile target (~390px)

- Mobile header with BOBA Bear logo and Cart.
- Horizontal swipeable category strip.
- One selected category at a time.
- Product cards: **1 column**.
- Large product imagery.
- `Add +` primary action.
- `Customisable` secondary label.
- Bottom Cart continuity bar when populated.
- Cart opens as dedicated page/sheet/drawer according to existing architecture.
- No desktop side rail.

## 10. Theme

For RC1 ordering:

- **Boba Cream/light mode is the preferred default visual target.**
- Dark theme may remain supported if current architecture already provides it.
- Do not remove theme capability merely to implement RC1.
- Ordering should prioritize food/product legibility and scanability.

## 11. Customer-copy rules

Do not show:

- `menu prices for discovery`
- `server-authoritative`
- `server-authoritative total`
- `commercial authority`
- `pricing authority`
- `checkout implementation`

Use concise customer-facing language.

## 12. Visual-reference interpretation rules

The composite mockup may contain AI-generated imperfections such as:

- minor spelling errors
- placeholder icons
- slightly inaccurate prices
- repeated/invented visual details
- approximate spacing

Do **not** copy those literally.

Use the mockup for:

- composition
- density
- hierarchy
- responsive behavior
- card proportions
- Cart structure
- modal structure
- CTA consistency

Use actual repository/menu data for:

- names
- prices
- modifiers
- product availability
- categories
- accessibility text
- business behavior

## 13. Required pre-merge visual evidence

The implementation is not visually complete until the coding agent captures real-browser screenshots for:

1. XL desktop — empty Cart
2. XL desktop — populated Cart
3. XL desktop — customization modal
4. 1440 desktop
5. 1024 tablet
6. 390 mobile

For each, compare against the approved visual reference and this Design Lock.

## 14. Required browser checks

Before PR/merge:

- no uncaught browser/page errors
- no console errors caused by implementation
- no failed critical API requests
- category selection swaps catalogue correctly
- center only contains selected category items
- `Add +` is consistent
- configurable items show `Customisable`
- Cart item list scrolls when long
- Cart summary/Checkout remain visible
- Cart quantity/Edit/Remove work
- customization opens above sticky surfaces
- tablet/mobile Cart continuity works
- no horizontal overflow

## 15. Non-goals

Do not add as part of this visual lock:

- Search
- Offers
- recommendations
- Popular / Most Ordered
- My BOBA
- Favorites
- Order Again
- new address architecture
- geolocation
- maps
- new API/schema/pricing authority
- IMP-029
- D-371

## 16. Acceptance principle

For this UI slice:

**DOM/tests/CI are necessary but not sufficient.**

Implementation complete requires:

- deterministic tests pass
- production build passes
- real browser passes
- required screenshots exist
- visual-review comparison completed
- Founder visual approval occurs before formal UAT freeze
