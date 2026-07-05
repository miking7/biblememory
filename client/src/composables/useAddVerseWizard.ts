import { ref, toRaw } from 'vue';
import { db } from '../db';
import {
  addVerse as addVerseAction,
  parseTags,
  formatTags,
  getTodayMidnight,
  dateToMidnightEpoch,
  epochToDateString
} from '../actions';
import { fetchWithTimeout, TimeoutError } from '../utils/http';

export function useAddVerseWizard(onVerseAdded: () => void) {
  // Wizard step state
  const step = ref<'paste' | 'form' | 'collections-list' | 'collections-detail' | 'collections-pace'>('paste');

  // Paste step state
  const pastedText = ref('');
  const parsingState = ref<'idle' | 'loading' | 'error' | 'success'>('idle');
  const parsingError = ref('');

  // Form step state
  const newVerse = ref({
    reference: '',
    refSort: '',
    content: '',
    translation: '',
    tagsInput: '',
    startedAtInput: ''
  });
  const showAddSuccess = ref(false);

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

  // Helper to get auth token
  const getAuthToken = async (): Promise<string | null> => {
    const authStore = await db.auth.toArray();
    return authStore[0]?.token || null;
  };

  // Initialize form with today's date
  const initializeForm = () => {
    newVerse.value.startedAtInput = epochToDateString(getTodayMidnight());
  };

  // Reset wizard to initial state
  const reset = () => {
    step.value = 'paste';
    pastedText.value = '';
    parsingState.value = 'idle';
    parsingError.value = '';
  };

  // Parse verse with AI
  const parseVerse = async () => {
    if (!pastedText.value.trim()) {
      parsingError.value = 'Please paste a verse above';
      parsingState.value = 'error';
      return;
    }

    parsingState.value = 'loading';
    parsingError.value = '';

    try {
      const token = await getAuthToken();

      if (!token) {
        throw new Error('Authentication required');
      }

      // Call parse API with 15 second timeout (covers the body read too)
      const response = await fetchWithTimeout('/api/parse-verse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({ text: pastedText.value })
      }, 15000);

      if (!response.ok) {
        let errorData: any = {};
        try { errorData = JSON.parse(response.text); } catch { /* non-JSON error body */ }
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Server error');
      }

      const parsed = JSON.parse(response.text);

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
      step.value = 'form';

    } catch (error: any) {
      console.error('Parse error:', error);

      if (error instanceof TimeoutError) {
        parsingError.value = 'Request timed out - please try again or enter manually';
      } else if (error.message === 'Authentication required') {
        parsingError.value = 'Please log in to use AI parsing';
      } else {
        parsingError.value = error.message || 'Unable to parse verse - please try again or enter manually';
      }

      parsingState.value = 'error';
    }
  };

  // Skip AI parsing and go directly to form
  const skipAIParsing = () => {
    // Pre-fill content with pasted text, leave other fields empty
    newVerse.value.reference = '';
    newVerse.value.refSort = '';
    newVerse.value.content = pastedText.value;
    newVerse.value.translation = '';
    newVerse.value.tagsInput = '';

    // Move to form step
    step.value = 'form';
  };

  // Go back to paste step
  const goBackToPaste = () => {
    step.value = 'paste';
    parsingState.value = 'idle';
    parsingError.value = '';
  };

  // Add a single verse from the form
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

      // Call the callback to notify parent
      onVerseAdded();

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

  // Collections methods
  const openCollections = async () => {
    step.value = 'collections-list';
    await loadCollections();
  };

  const cancelCollections = () => {
    step.value = 'paste';
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
      const token = await getAuthToken();

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
                'X-Auth-Token': token!
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
    step.value = 'collections-detail';

    collectionVersesLoading.value = true;
    collectionVersesError.value = '';

    try {
      const token = await getAuthToken();

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
    step.value = 'collections-list';
    collectionVerses.value = [];
    selectedVerseIndices.value = [];
  };

  const proceedToPaceSelection = () => {
    if (selectedVerseIndices.value.length === 0) {
      alert('Please select at least one verse');
      return;
    }
    step.value = 'collections-pace';
  };

  const backToCollectionDetail = () => {
    step.value = 'collections-detail';
  };

  const addCollectionVerses = async () => {
    if (selectedVerseIndices.value.length === 0) {
      alert('Please select at least one verse');
      return { success: false, count: 0 };
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

      // Call the callback to notify parent
      onVerseAdded();

      // Reset collections state
      cancelCollections();

      // Show success using existing success indicator
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
    // Step state
    step,

    // Paste step
    pastedText,
    parsingState,
    parsingError,

    // Form step
    newVerse,
    showAddSuccess,

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

    // Methods
    initializeForm,
    reset,
    parseVerse,
    skipAIParsing,
    goBackToPaste,
    addVerse,
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
