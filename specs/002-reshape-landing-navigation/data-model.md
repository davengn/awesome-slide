# Data Model: Reshape Landing, Sidebar, and Navigation

This feature does not introduce persisted user data. The entities below describe UI contracts and state that implementation should make explicit in components, props, or local helpers.

## LandingSection

**Purpose**: Defines each major marketing section in the reshaped landing page.

**Fields**:

- `id`: Stable section identifier used for anchors and tests.
- `surface`: One of `canvas`, `inverse`, `lime`, `lilac`, `cream`, `mint`, `pink`, `coral`, `navy`.
- `purpose`: Hero, proof, workflow, feature, product preview, CTA, or footer.
- `heading`: Visible section heading.
- `body`: Short supporting copy.
- `primaryAction`: Optional `NavigationItem`.
- `secondaryAction`: Optional `NavigationItem`.
- `mediaRole`: None, product preview, slide preview, code sample, or illustration tile.
- `responsiveBehavior`: `ResponsiveState` mapping.

**Validation Rules**:

- Only one pastel block surface should dominate a viewport at a time.
- `inverse` and `navy` surfaces require inverse text.
- Magenta can appear only as a promo/action accent, not as `surface`.
- Hero sections require at least one product or slide preview.

## NavigationItem

**Purpose**: Represents a top-nav link, CTA, sidebar row action, or mobile menu item.

**Fields**:

- `id`: Stable identifier.
- `label`: Visible label.
- `href`: Internal or external URL when the item navigates.
- `action`: Local action name when the item triggers UI state instead of navigation.
- `priority`: Primary, secondary, tertiary, utility, or hidden.
- `active`: Whether the item represents the current route or selected runtime state.
- `icon`: Optional Lucide icon name or existing icon component reference.
- `ariaLabel`: Required when `label` is visually hidden or icon-only.
- `responsiveVisibility`: Desktop, tablet, mobile, or all.

**Validation Rules**:

- Internal web links use Next.js `Link`.
- Icon-only items require `ariaLabel` or tooltip copy.
- Primary and secondary CTA items use pill geometry.
- Active state must not be color-only.

## NavigationGroup

**Purpose**: Groups related navigation items in the top navbar, mobile menu, or runtime sidebar.

**Fields**:

- `id`: Stable group identifier.
- `label`: Optional visible or screen-reader label.
- `items`: Ordered `NavigationItem` list.
- `layout`: Horizontal, vertical, rail, drawer, or menu.
- `collapseBehavior`: None, hide-to-menu, drawer, or mobile-pill.

**Validation Rules**:

- Keyboard order follows item order.
- Group collapse must preserve access to every primary action.
- Layout changes must not shift fixed navbar height.

## SidebarSection

**Purpose**: Describes a runtime sidebar group for folders, slides, actions, or status.

**Fields**:

- `id`: Stable section identifier.
- `title`: Optional section title.
- `items`: `NavigationItem` list or folder/slide rows.
- `density`: Compact or comfortable.
- `emptyState`: Optional empty state copy and action.
- `selectedItemId`: Current selection.
- `actions`: Optional section-level actions.

**Validation Rules**:

- Sidebar rows keep stable heights across hover, selected, pending, and error states.
- Long labels must truncate, wrap, or expose a tooltip without pushing actions off-screen.
- Empty states may use pastel surfaces but must remain compact.

## ResponsiveState

**Purpose**: Defines viewport-specific behavior for landing sections, top nav, and sidebar.

**Fields**:

- `viewport`: `375`, `768`, `1024`, or `1440`.
- `layout`: Grid, stack, split, drawer, rail, or overlay.
- `navMode`: Desktop, tablet, mobile-menu, or mobile-pill.
- `sidebarMode`: Expanded, collapsed, drawer, or hidden-with-pill.
- `motionMode`: Full, reduced, or none.

**Validation Rules**:

- No horizontal scroll at supported viewports.
- Fixed or sticky nav must reserve vertical space.
- Reduced motion disables non-essential animation.

## ActionPair

**Purpose**: Standardizes paired CTAs in the landing hero and major CTA sections.

**Fields**:

- `primary`: Primary `NavigationItem`.
- `secondary`: Optional secondary `NavigationItem`.
- `alignment`: Inline, stacked, or split.
- `surfaceTreatment`: Light, inverse, or pastel.

**Validation Rules**:

- Primary action uses black fill with white text on light/pastel surfaces.
- Secondary action uses white or transparent treatment with black text on light/pastel surfaces.
- On mobile, paired CTAs can stack but must preserve 44px minimum tap height.
