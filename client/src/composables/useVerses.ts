import { ref, computed, toRaw } from 'vue';
import { Verse } from '../db';
import {
  addVerse as addVerseAction,
  updateVerse as updateVerseAction,
  deleteVerse as deleteVerseAction,
  getAllVerses,
  parseTags,
  formatTags,
  getTodayMidnight,
  dateToMidnightEpoch,
  epochToDateString
} from '../actions';

export function useVerses() {
  // State
  const verses = ref<Verse[]>([]);
  const searchQuery = ref('');
  const sortBy = ref<'newest' | 'oldest' | 'reference' | 'category'>(
    (localStorage.getItem('verseSortPreference') as any) || 'reference'
  );

  // Add verse wizard state
  const addVerseStep = ref<'paste' | 'form' | 'collections-list' | 'collections-detail' | 'collections-pace'>('paste');
  const pastedText = ref('');
  const parsingState = ref<'idle' | 'loading' | 'error' | 'success'>('idle');
  const parsingError = ref('');

  // Collections state
  const collectionsList = ref<Array<{id: string, name: string, description: string, verseCount?: number}>>([]);
  const collectionsLoading = ref(false);
  const collectionsError = ref('');
  const selectedCollectionId = ref('');
  const selectedCollectionName = ref('');
  const selectedCollectionDescription = ref('');
  const collectionVerses = ref<Array<{reference: string, refSort: string, content: string, translation: string, tags: Array<{key: string, value: string}>}>>([]);
  const collectionVersesLoading = ref(false);
  const collectionVersesError = ref('');
  const selectedVerseIndices = ref<number[]>([]);
  const selectedPace = ref('two-to-start-then-weekly');
  const paceOptions = [
    { value: 'two-to-start-then-weekly', label: 'Two to start, then weekly', description: '2 verses today, then 1 per week' },
    { value: 'weekly', label: 'Weekly', description: '1 verse per week' },
    { value: 'fortnightly', label: 'Every 2 weeks', description: '1 verse every 2 weeks' },
    { value: 'monthly', label: 'Monthly', description: '1 verse per month' }
  ];

  // Add verse form
  const newVerse = ref({
    reference: '',
    refSort: '',
    content: '',
    translation: '',
    tagsInput: '',
    startedAtInput: ''
  });
  const showAddSuccess = ref(false);

  // Edit verse modal
  const showEditModal = ref(false);
  const editingVerse = ref<{
    id: string;
    reference: string;
    refSort: string;
    content: string;
    translation: string;
    tagsInput: string;
    startedAtInput: string;
    reviewCat: string;
    favorite: boolean;
  } | null>(null);

  // File input ref
  const importFileRef = ref<HTMLInputElement | null>(null);

  // Helper function
  const normalizeForSearch = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Computed properties
  const filteredVerses = computed(() => {
    // First, filter based on search query
    let filtered = verses.value;
    if (searchQuery.value) {
      const query = normalizeForSearch(searchQuery.value);
      filtered = verses.value.filter(v => {
        const tagsString = formatTags(v.tags || []);
        return normalizeForSearch(v.reference).includes(query) ||
               normalizeForSearch(v.content).includes(query) ||
               normalizeForSearch(tagsString).includes(query);
      });
    }

    // Then, sort based on sortBy preference
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy.value) {
        case 'newest':
          // Newest first (descending)
          return (b.startedAt || b.createdAt) - (a.startedAt || a.createdAt);

        case 'oldest':
          // Oldest first (ascending)
          return (a.startedAt || a.createdAt) - (b.startedAt || b.createdAt);

        case 'reference':
          // Biblical order (using refSort)
          return a.refSort.localeCompare(b.refSort);

        case 'category':
          // Category order: future, learn, daily, weekly, monthly, auto (auto last)
          const categoryOrder: Record<string, number> = {
            future: 0,
            learn: 1,
            daily: 2,
            weekly: 3,
            monthly: 4,
            auto: 5
          };
          const aOrder = categoryOrder[a.reviewCat] ?? 5;
          const bOrder = categoryOrder[b.reviewCat] ?? 5;

          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          // If same category, sort by reference
          return a.refSort.localeCompare(b.refSort);

        default:
          return 0;
      }
    });

    return sorted;
  });

  const hasVersesButNoSearchResults = computed(() => {
    return verses.value.length > 0 &&
           filteredVerses.value.length === 0 &&
           searchQuery.value.length > 0;
  });

  // Methods
  const loadVerses = async () => {
    try {
      verses.value = await getAllVerses();
    } catch (error) {
      console.error("Failed to load verses:", error);
    }
  };

  const initializeForm = () => {
    newVerse.value.startedAtInput = epochToDateString(getTodayMidnight());
  };

  const resetAddVerseWizard = () => {
    addVerseStep.value = 'paste';
    pastedText.value = '';
    parsingState.value = 'idle';
    parsingError.value = '';
  };

  const parseVerseWithAI = async () => {
    if (!pastedText.value.trim()) {
      parsingError.value = 'Please paste a verse above';
      parsingState.value = 'error';
      return;
    }

    parsingState.value = 'loading';
    parsingError.value = '';

    try {
      // Get auth token
      const authStore = await import('../db').then(m => m.db.auth.toArray());
      const token = authStore[0]?.token;

      if (!token) {
        throw new Error('Authentication required');
      }

      // Call parse API with 15 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/parse-verse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({ text: pastedText.value }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Server error');
      }

      const parsed = await response.json();

      // Pre-fill form with parsed data
      newVerse.value.reference = parsed.reference || '';
      newVerse.value.refSort = parsed.refSort || '';
      newVerse.value.content = parsed.content || pastedText.value;
      newVerse.value.translation = parsed.translation || '';
      newVerse.value.tagsInput = Array.isArray(parsed.tags) 
        ? formatTags(parsed.tags) 
        : '';

      // Move to form step
      parsingState.value = 'success';
      addVerseStep.value = 'form';

    } catch (error: any) {
      console.error('Parse error:', error);
      
      if (error.name === 'AbortError') {
        parsingError.value = 'Request timed out - please try again or enter manually';
      } else if (error.message === 'Authentication required') {
        parsingError.value = 'Please log in to use AI parsing';
      } else {
        parsingError.value = error.message || 'Unable to parse verse - please try again or enter manually';
      }
      
      parsingState.value = 'error';
    }
  };

  const skipAIParsing = () => {
    // Pre-fill content with pasted text, leave other fields empty
    newVerse.value.reference = '';
    newVerse.value.refSort = '';
    newVerse.value.content = pastedText.value;
    newVerse.value.translation = '';
    newVerse.value.tagsInput = '';

    // Move to form step
    addVerseStep.value = 'form';
  };

  const goBackToPaste = () => {
    addVerseStep.value = 'paste';
    parsingState.value = 'idle';
    parsingError.value = '';
  };

  const addVerse = async () => {
    try {
      const tags = parseTags(newVerse.value.tagsInput);

      const startedAt = newVerse.value.startedAtInput
        ? dateToMidnightEpoch(newVerse.value.startedAtInput)
        : Date.now();

      await addVerseAction({
        reference: newVerse.value.reference,
        refSort: newVerse.value.refSort,
        content: newVerse.value.content,
        translation: newVerse.value.translation,
        tags,
        startedAt
      });

      await loadVerses();

      // Reset form
      newVerse.value.reference = '';
      newVerse.value.refSort = '';
      newVerse.value.content = '';
      newVerse.value.translation = '';
      newVerse.value.tagsInput = '';
      newVerse.value.startedAtInput = epochToDateString(getTodayMidnight());

      showAddSuccess.value = true;
      setTimeout(() => {
        showAddSuccess.value = false;
      }, 3000);

    } catch (error) {
      console.error("Failed to add verse:", error);
      alert("Failed to add verse. Please try again.");
    }
  };

  const startEditVerse = (verse: Verse) => {
    editingVerse.value = {
      id: verse.id,
      reference: verse.reference,
      refSort: verse.refSort,
      content: verse.content,
      translation: verse.translation,
      tagsInput: formatTags(verse.tags),
      startedAtInput: verse.startedAt ? epochToDateString(verse.startedAt) : epochToDateString(verse.createdAt),
      reviewCat: verse.reviewCat,
      favorite: verse.favorite
    };
    showEditModal.value = true;
  };

  const saveEditVerse = async () => {
    if (!editingVerse.value) return;

    try {
      const tags = parseTags(editingVerse.value.tagsInput);

      const verse = verses.value.find(v => v.id === editingVerse.value!.id);
      if (!verse) throw new Error('Verse not found');

      const startedAt = editingVerse.value.startedAtInput
        ? dateToMidnightEpoch(editingVerse.value.startedAtInput)
        : verse.createdAt;

      await updateVerseAction(editingVerse.value.id, {
        reference: editingVerse.value.reference,
        refSort: editingVerse.value.refSort,
        content: editingVerse.value.content,
        translation: editingVerse.value.translation,
        tags,
        startedAt,
        reviewCat: editingVerse.value.reviewCat,
        favorite: editingVerse.value.favorite
      });

      await loadVerses();

      showEditModal.value = false;
      editingVerse.value = null;

    } catch (error) {
      console.error("Failed to update verse:", error);
      alert("Failed to update verse. Please try again.");
    }
  };

  const deleteVerse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this verse?')) {
      return;
    }

    try {
      await deleteVerseAction(id);
      await loadVerses();
    } catch (error) {
      console.error("Failed to delete verse:", error);
      alert("Failed to delete verse. Please try again.");
    }
  };

  const formatTagForDisplay = (tag: { key: string; value: string }): string => {
    if (tag.value) {
      return `${tag.key} (${tag.value})`;
    }
    return tag.key;
  };

  const setSortBy = (newSort: 'newest' | 'oldest' | 'reference' | 'category') => {
    sortBy.value = newSort;
    localStorage.setItem('verseSortPreference', newSort);
  };

  const exportVerses = () => {
    try {
      const dataStr = JSON.stringify(verses.value, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bible-verses-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export verses:", error);
      alert("Failed to export verses. Please try again.");
    }
  };

  const importVerses = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (!Array.isArray(imported)) {
        throw new Error("Invalid file format");
      }

      const existingIds = new Set(verses.value.map(v => v.id));
      let updateCount = 0;
      let addCount = 0;

      for (const verse of imported) {
        if (verse.id && existingIds.has(verse.id)) {
          updateCount++;
        } else {
          addCount++;
        }
      }

      const message = updateCount > 0
        ? `Import will update ${updateCount} existing verse${updateCount !== 1 ? 's' : ''} and add ${addCount} new verse${addCount !== 1 ? 's' : ''}. Continue?`
        : `Import ${addCount} new verse${addCount !== 1 ? 's' : ''}?`;

      if (!confirm(message)) {
        return;
      }

      for (const verse of imported) {
        const hasExistingId = verse.id && existingIds.has(verse.id);

        if (hasExistingId) {
          const existing = verses.value.find(v => v.id === verse.id);
          if (existing) {
            await updateVerseAction(verse.id, {
              reference: verse.reference ?? existing.reference,
              refSort: verse.refSort ?? existing.refSort,
              content: verse.content ?? verse.text ?? existing.content,
              translation: verse.translation ?? existing.translation,
              tags: verse.tags ?? existing.tags,
              startedAt: verse.startedAt ?? existing.startedAt,
              reviewCat: verse.reviewCat ?? existing.reviewCat,
              favorite: verse.favorite ?? existing.favorite,
              createdAt: verse.createdAt ?? existing.createdAt,
              updatedAt: verse.updatedAt ?? Date.now()
            });
          }
        } else {
          await addVerseAction({
            reference: verse.reference,
            refSort: verse.refSort || verse.reference,
            content: verse.content || verse.text,
            translation: verse.translation || '',
            tags: verse.tags || [],
            startedAt: verse.startedAt,
            reviewCat: verse.reviewCat,
            favorite: verse.favorite,
            createdAt: verse.createdAt,
            updatedAt: verse.updatedAt
          });
        }
      }

      await loadVerses();

      const successMessage = updateCount > 0
        ? `Successfully updated ${updateCount} verse${updateCount !== 1 ? 's' : ''} and added ${addCount} new verse${addCount !== 1 ? 's' : ''}!`
        : `Successfully imported ${addCount} verse${addCount !== 1 ? 's' : ''}!`;

      alert(successMessage);

    } catch (error) {
      console.error("Failed to import verses:", error);
      alert("Error importing file. Please make sure it's a valid JSON file.");
    } finally {
      input.value = '';
    }
  };

  // Collections methods
  const openCollections = async () => {
    addVerseStep.value = 'collections-list';
    await loadCollections();
  };

  const cancelCollections = () => {
    addVerseStep.value = 'paste';
    // Reset state
    collectionsList.value = [];
    collectionsError.value = '';
    selectedCollectionId.value = '';
    selectedCollectionName.value = '';
    selectedCollectionDescription.value = '';
    collectionVerses.value = [];
    selectedVerseIndices.value = [];
    selectedPace.value = 'two-to-start-then-weekly';
  };

  const loadCollections = async () => {
    collectionsLoading.value = true;
    collectionsError.value = '';

    try {
      // Get auth token
      const authStore = await import('../db').then(m => m.db.auth.toArray());
      const token = authStore[0]?.token;

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/collections', {
        headers: {
          'X-Auth-Token': token
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load collections');
      }

      const data = await response.json();

      // Fetch verse counts for each collection
      const collectionsWithCounts = await Promise.all(
        data.map(async (collection: any) => {
          try {
            const versesResponse = await fetch(`/api/collections?id=${collection.id}`, {
              headers: {
                'X-Auth-Token': token
              }
            });
            if (versesResponse.ok) {
              const verses = await versesResponse.json();
              return { ...collection, verseCount: verses.length };
            }
          } catch (e) {
            console.error(`Failed to fetch verse count for ${collection.id}:`, e);
          }
          return collection;
        })
      );

      collectionsList.value = collectionsWithCounts;
    } catch (error: any) {
      console.error('Failed to load collections:', error);
      collectionsError.value = error.message || 'Failed to load collections';
    } finally {
      collectionsLoading.value = false;
    }
  };

  const selectCollection = async (collectionId: string) => {
    const collection = collectionsList.value.find(c => c.id === collectionId);
    if (!collection) return;

    selectedCollectionId.value = collectionId;
    selectedCollectionName.value = collection.name;
    selectedCollectionDescription.value = collection.description;
    addVerseStep.value = 'collections-detail';

    collectionVersesLoading.value = true;
    collectionVersesError.value = '';

    try {
      // Get auth token
      const authStore = await import('../db').then(m => m.db.auth.toArray());
      const token = authStore[0]?.token;

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/collections?id=${collectionId}`, {
        headers: {
          'X-Auth-Token': token
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load collection verses');
      }

      const verses = await response.json();
      collectionVerses.value = verses;

      // Select all verses by default
      selectedVerseIndices.value = verses.map((_: any, index: number) => index);
    } catch (error: any) {
      console.error('Failed to load collection verses:', error);
      collectionVersesError.value = error.message || 'Failed to load verses';
    } finally {
      collectionVersesLoading.value = false;
    }
  };

  const backToCollectionsList = () => {
    addVerseStep.value = 'collections-list';
    collectionVerses.value = [];
    selectedVerseIndices.value = [];
  };

  const proceedToPaceSelection = () => {
    if (selectedVerseIndices.value.length === 0) {
      alert('Please select at least one verse');
      return;
    }
    addVerseStep.value = 'collections-pace';
  };

  const backToCollectionDetail = () => {
    addVerseStep.value = 'collections-detail';
  };

  const addCollectionVerses = async () => {
    if (selectedVerseIndices.value.length === 0) {
      alert('Please select at least one verse');
      return;
    }

    // Get selected verses (use toRaw to unwrap Vue proxies for IndexedDB storage)
    const selectedVerses = selectedVerseIndices.value
      .sort((a, b) => a - b) // Ensure they're in original order
      .map(index => toRaw(collectionVerses.value[index]));

    // Calculate scheduled dates based on pace
    const today = getTodayMidnight();
    const scheduledVerses = selectedVerses.map((verse, index) => {
      let startDate = today;

      if (selectedPace.value === 'two-to-start-then-weekly') {
        if (index >= 2) {
          startDate = today + (index - 1) * 7 * 24 * 60 * 60 * 1000;
        }
      } else if (selectedPace.value === 'weekly') {
        startDate = today + index * 7 * 24 * 60 * 60 * 1000;
      } else if (selectedPace.value === 'fortnightly') {
        startDate = today + index * 14 * 24 * 60 * 60 * 1000;
      } else if (selectedPace.value === 'monthly') {
        const date = new Date(today);
        date.setMonth(date.getMonth() + index);
        startDate = date.getTime();
      }

      return {
        ...verse,
        startedAt: startDate
      };
    });

    // Add all verses
    try {
      for (const verse of scheduledVerses) {
        await addVerseAction({
          reference: verse.reference,
          refSort: verse.refSort,
          content: verse.content,
          translation: verse.translation || '',
          tags: verse.tags || [],
          startedAt: verse.startedAt
        });
      }

      // Reload verses
      await loadVerses();

      // Reset collections state
      cancelCollections();

      // Show success using existing success indicator (App.vue will show this)
      showAddSuccess.value = true;
      setTimeout(() => {
        showAddSuccess.value = false;
      }, 3000);

      // Return success info
      return {
        success: true,
        count: scheduledVerses.length
      };
    } catch (error) {
      console.error('Failed to add collection verses:', error);
      alert('Failed to add verses. Please try again.');
      return {
        success: false,
        count: 0
      };
    }
  };

  return {
    // State
    verses,
    searchQuery,
    sortBy,
    newVerse,
    showAddSuccess,
    showEditModal,
    editingVerse,
    importFileRef,

    // Add verse wizard state
    addVerseStep,
    pastedText,
    parsingState,
    parsingError,

    // Collections state
    collectionsList,
    collectionsLoading,
    collectionsError,
    selectedCollectionId,
    selectedCollectionName,
    selectedCollectionDescription,
    collectionVerses,
    collectionVersesLoading,
    collectionVersesError,
    selectedVerseIndices,
    selectedPace,
    paceOptions,

    // Computed
    filteredVerses,
    hasVersesButNoSearchResults,

    // Methods
    loadVerses,
    initializeForm,
    addVerse,
    startEditVerse,
    saveEditVerse,
    deleteVerse,
    formatTagForDisplay,
    setSortBy,
    exportVerses,
    importVerses,

    // Add verse wizard methods
    resetAddVerseWizard,
    parseVerseWithAI,
    skipAIParsing,
    goBackToPaste,

    // Collections methods
    openCollections,
    cancelCollections,
    loadCollections,
    selectCollection,
    backToCollectionsList,
    proceedToPaceSelection,
    backToCollectionDetail,
    addCollectionVerses
  };
}
