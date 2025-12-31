### Previous: Tag Search Feature ✅
**Status:** Complete  
**Completed:** January 6, 2025

Added ability to search within tags field, making it easier to find verses by their tags.

#### Implementation
- Updated `filteredVerses` computed property to include tag searching
- Uses existing `formatTags()` function to convert tags to searchable string
- Applies same unicode normalization as reference and content search
- Simple, consistent approach that reuses existing helpers

#### User Experience
Users can now search for verses by:
- Tag keys (e.g., "fast", "ss", "personal")
- Tag values (e.g., "3", "2010", "Q2")
- Partial matches (e.g., "fast" matches "fast.sk=3")
- Case-insensitive with unicode normalization

#### Files Changed
- `client/src/app.ts` - Updated `filteredVerses` getter

