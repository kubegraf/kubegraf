# Pods.tsx Update Summary

## File Location
`/Users/itsmine/Documents/repos/kubegraf/kubegraf/ui/solid/src/routes/Pods.tsx`

## Changes Applied

### 1. Styling Changes

#### Container Width
- **Line 520**: Changed main container from `class="space-y-4"` to `class="space-y-4 max-w-full"`
- This increases the panel/container width to use full available width

#### Text Styling for Pod Rows
- **Lines 690-696**: Updated `getTextColor()` function with new color scheme:
  - **Light Blue (#3b82f6)**: Default color for running/normal pods
  - **Orange (#f59e0b)**: Pending status
  - **Red (#ef4444)**: Failed, Error, CrashLoopBackOff, and Terminating status

- **Lines 724-728**: Added bold styling and increased text size for table rows:
  - `fontWeight: 'bold'` - Makes all row text bold
  - `fontSize: '0.9375rem'` - Increases from text-sm to text-base (15px)
  - `paddingTop: '0.25rem'` and `paddingBottom: '0.25rem'` - Reduces vertical spacing (py-1)

#### Text Alignment
- **Lines 743, 754, 798, 799, 800, 807, 814, 815, 816, 817**: Added `textAlign: 'left'` to all table cells
- Ensures all content is properly left-aligned throughout the table

### 2. Pagination Changes

#### Items Per Page Selector
- **Lines 880-889**: Moved "Items per page" selector to bottom right of pagination controls
- Positioned next to page number display
- Updated options to display as "20 per page", "50 per page", "100 per page"
- Removed from top filters section (previously at line 600-610)

### 3. Action Buttons Auto-Refresh

#### Current Implementation
The action buttons in the Pods component do **NOT** have their own auto-refresh timer. The buttons are part of the `ActionMenu` component which is stateless and event-driven.

#### Data Refresh Behavior
- **Lines 156-160**: There is a `podsRefreshTimer` that refreshes the entire pods list every 2 seconds
- This refresh updates the pod data but does not interfere with action button functionality
- Action buttons only trigger actions on user click - they are not auto-refreshed independently
- The ActionMenu component (lines 818-828) is a pure UI component that responds only to user interactions

**Conclusion**: Action buttons already follow the requested behavior - they only respond to user clicks and explicit actions, not auto-refresh. The background data refresh is separate and continues to work as expected.

## Summary of All Changes

1. ✅ **Container width**: Increased to `max-w-full`
2. ✅ **Text colors**: Light blue (#3b82f6) for default, orange (#f59e0b) for pending, red (#ef4444) for failed/terminating
3. ✅ **Text styling**: Bold font weight, text-base size (0.9375rem)
4. ✅ **Vertical spacing**: Reduced to py-1 (0.25rem top/bottom padding)
5. ✅ **Text alignment**: All cells properly left-aligned
6. ✅ **Pagination**: "Items per page" selector moved to bottom right next to page numbers
7. ✅ **Action buttons**: Already configured to only respond to user clicks (no separate auto-refresh)

## Testing Recommendations

1. Verify the increased container width displays properly on different screen sizes
2. Check that the new color scheme (light blue, orange, red) is clearly distinguishable
3. Test that the reduced vertical spacing improves information density without compromising readability
4. Confirm pagination controls work correctly with the relocated "Items per page" selector
5. Verify action button menu still functions properly after data refreshes
