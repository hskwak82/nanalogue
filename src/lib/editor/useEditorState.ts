'use client'

import { useReducer, useCallback } from 'react'
import {
  CoverTemplate,
  PaperTemplate,
  PlacedDecoration,
  EditorState,
  EditorAction,
  DEFAULT_DECORATION_SCALE,
  DEFAULT_DECORATION_ROTATION,
  DEFAULT_PAPER_OPACITY,
  DEFAULT_PAPER_FONT_FAMILY,
  DEFAULT_PAPER_FONT_COLOR,
  ItemType,
  PhotoMeta,
} from '@/types/customization'

const initialState: EditorState = {
  selectedCover: null,
  selectedPaper: null,
  coverDecorations: [],
  paperDecorations: [],
  selectedItemIndex: null,
  activeEditor: 'cover',
  isDirty: false,
  paperOpacity: DEFAULT_PAPER_OPACITY,
  paperFontFamily: DEFAULT_PAPER_FONT_FAMILY,
  paperFontColor: DEFAULT_PAPER_FONT_COLOR,
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_COVER':
      return {
        ...state,
        selectedCover: action.payload,
        isDirty: true,
      }

    case 'SET_PAPER':
      return {
        ...state,
        selectedPaper: action.payload,
        isDirty: true,
      }

    case 'ADD_COVER_DECORATION':
      return {
        ...state,
        coverDecorations: [...state.coverDecorations, action.payload],
        selectedItemIndex: state.coverDecorations.length,
        isDirty: true,
      }

    case 'UPDATE_COVER_DECORATION':
      return {
        ...state,
        coverDecorations: state.coverDecorations.map((d, i) =>
          i === action.payload.index
            ? { ...d, ...action.payload.decoration }
            : d
        ),
        isDirty: true,
      }

    case 'REMOVE_COVER_DECORATION':
      return {
        ...state,
        coverDecorations: state.coverDecorations.filter((_, i) => i !== action.payload),
        selectedItemIndex:
          state.selectedItemIndex === action.payload
            ? null
            : state.selectedItemIndex !== null &&
              state.selectedItemIndex > action.payload
            ? state.selectedItemIndex - 1
            : state.selectedItemIndex,
        isDirty: true,
      }

    case 'ADD_PAPER_DECORATION':
      return {
        ...state,
        paperDecorations: [...state.paperDecorations, action.payload],
        selectedItemIndex: state.paperDecorations.length,
        isDirty: true,
      }

    case 'UPDATE_PAPER_DECORATION':
      return {
        ...state,
        paperDecorations: state.paperDecorations.map((d, i) =>
          i === action.payload.index
            ? { ...d, ...action.payload.decoration }
            : d
        ),
        isDirty: true,
      }

    case 'REMOVE_PAPER_DECORATION':
      return {
        ...state,
        paperDecorations: state.paperDecorations.filter((_, i) => i !== action.payload),
        selectedItemIndex:
          state.selectedItemIndex === action.payload
            ? null
            : state.selectedItemIndex !== null &&
              state.selectedItemIndex > action.payload
            ? state.selectedItemIndex - 1
            : state.selectedItemIndex,
        isDirty: true,
      }

    case 'SELECT_ITEM':
      return {
        ...state,
        selectedItemIndex: action.payload,
      }

    case 'SET_ACTIVE_EDITOR':
      return {
        ...state,
        activeEditor: action.payload,
        selectedItemIndex: null,
      }

    case 'LOAD_STATE':
      return {
        ...state,
        selectedCover: action.payload.cover,
        selectedPaper: action.payload.paper,
        coverDecorations: action.payload.coverDecorations,
        paperDecorations: action.payload.paperDecorations,
        paperOpacity: action.payload.paperOpacity ?? DEFAULT_PAPER_OPACITY,
        paperFontFamily: action.payload.paperFontFamily ?? DEFAULT_PAPER_FONT_FAMILY,
        paperFontColor: action.payload.paperFontColor ?? DEFAULT_PAPER_FONT_COLOR,
        selectedItemIndex: null,
        isDirty: false,
      }

    case 'SET_PAPER_OPACITY':
      return {
        ...state,
        paperOpacity: action.payload,
        isDirty: true,
      }

    case 'SET_PAPER_FONT_FAMILY':
      return {
        ...state,
        paperFontFamily: action.payload,
        isDirty: true,
      }

    case 'SET_PAPER_FONT_COLOR':
      return {
        ...state,
        paperFontColor: action.payload,
        isDirty: true,
      }

    case 'RESET':
      return initialState

    case 'MARK_SAVED':
      return {
        ...state,
        isDirty: false,
      }

    default:
      return state
  }
}

export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState)

  const setCover = useCallback((cover: CoverTemplate | null) => {
    dispatch({ type: 'SET_COVER', payload: cover })
  }, [])

  const setPaper = useCallback((paper: PaperTemplate | null) => {
    dispatch({ type: 'SET_PAPER', payload: paper })
  }, [])

  const setActiveEditor = useCallback((editor: 'cover' | 'paper') => {
    dispatch({ type: 'SET_ACTIVE_EDITOR', payload: editor })
  }, [])

  // Cover decoration functions
  const addCoverDecoration = useCallback(
    (item: { item_id: string; type: ItemType; content: string; photo_meta?: PhotoMeta }) => {
      const decoration: PlacedDecoration = {
        item_id: item.item_id,
        type: item.type,
        content: item.content,
        x: 50,
        y: 50,
        scale: DEFAULT_DECORATION_SCALE,
        rotation: DEFAULT_DECORATION_ROTATION,
        z_index: state.coverDecorations.length + 1,
        photo_meta: item.photo_meta,
      }
      dispatch({ type: 'ADD_COVER_DECORATION', payload: decoration })
    },
    [state.coverDecorations.length]
  )

  const updateCoverDecoration = useCallback(
    (index: number, updates: Partial<PlacedDecoration>) => {
      dispatch({ type: 'UPDATE_COVER_DECORATION', payload: { index, decoration: updates } })
    },
    []
  )

  const removeCoverDecoration = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_COVER_DECORATION', payload: index })
  }, [])

  // Paper decoration functions
  const addPaperDecoration = useCallback(
    (item: { item_id: string; type: ItemType; content: string; photo_meta?: PhotoMeta }) => {
      const decoration: PlacedDecoration = {
        item_id: item.item_id,
        type: item.type,
        content: item.content,
        x: 50,
        y: 50,
        scale: DEFAULT_DECORATION_SCALE,
        rotation: DEFAULT_DECORATION_ROTATION,
        z_index: state.paperDecorations.length + 1,
        photo_meta: item.photo_meta,
      }
      dispatch({ type: 'ADD_PAPER_DECORATION', payload: decoration })
    },
    [state.paperDecorations.length]
  )

  const updatePaperDecoration = useCallback(
    (index: number, updates: Partial<PlacedDecoration>) => {
      dispatch({ type: 'UPDATE_PAPER_DECORATION', payload: { index, decoration: updates } })
    },
    []
  )

  const removePaperDecoration = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_PAPER_DECORATION', payload: index })
  }, [])

  const selectItem = useCallback((index: number | null) => {
    dispatch({ type: 'SELECT_ITEM', payload: index })
  }, [])

  const loadState = useCallback(
    (
      cover: CoverTemplate | null,
      paper: PaperTemplate | null,
      coverDecorations: PlacedDecoration[],
      paperDecorations: PlacedDecoration[] = [],
      paperOpacity?: number,
      paperFontFamily?: string,
      paperFontColor?: string
    ) => {
      dispatch({
        type: 'LOAD_STATE',
        payload: { cover, paper, coverDecorations, paperDecorations, paperOpacity, paperFontFamily, paperFontColor }
      })
    },
    []
  )

  // Paper style setters
  const setPaperOpacity = useCallback((opacity: number) => {
    dispatch({ type: 'SET_PAPER_OPACITY', payload: opacity })
  }, [])

  const setPaperFontFamily = useCallback((fontFamily: string) => {
    dispatch({ type: 'SET_PAPER_FONT_FAMILY', payload: fontFamily })
  }, [])

  const setPaperFontColor = useCallback((color: string) => {
    dispatch({ type: 'SET_PAPER_FONT_COLOR', payload: color })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const markSaved = useCallback(() => {
    dispatch({ type: 'MARK_SAVED' })
  }, [])

  // Helper to get current decorations based on active editor
  const getCurrentDecorations = useCallback(() => {
    return state.activeEditor === 'cover' ? state.coverDecorations : state.paperDecorations
  }, [state.activeEditor, state.coverDecorations, state.paperDecorations])

  // Generic add/update/remove that works with active editor
  const addDecoration = useCallback(
    (item: { item_id: string; type: ItemType; content: string; photo_meta?: PhotoMeta }) => {
      if (state.activeEditor === 'cover') {
        addCoverDecoration(item)
      } else {
        addPaperDecoration(item)
      }
    },
    [state.activeEditor, addCoverDecoration, addPaperDecoration]
  )

  const updateDecoration = useCallback(
    (index: number, updates: Partial<PlacedDecoration>) => {
      if (state.activeEditor === 'cover') {
        updateCoverDecoration(index, updates)
      } else {
        updatePaperDecoration(index, updates)
      }
    },
    [state.activeEditor, updateCoverDecoration, updatePaperDecoration]
  )

  const removeDecoration = useCallback(
    (index: number) => {
      if (state.activeEditor === 'cover') {
        removeCoverDecoration(index)
      } else {
        removePaperDecoration(index)
      }
    },
    [state.activeEditor, removeCoverDecoration, removePaperDecoration]
  )

  return {
    state,
    setCover,
    setPaper,
    setActiveEditor,
    // Cover-specific
    addCoverDecoration,
    updateCoverDecoration,
    removeCoverDecoration,
    // Paper-specific
    addPaperDecoration,
    updatePaperDecoration,
    removePaperDecoration,
    // Generic (uses active editor)
    addDecoration,
    updateDecoration,
    removeDecoration,
    getCurrentDecorations,
    // Paper style setters
    setPaperOpacity,
    setPaperFontFamily,
    setPaperFontColor,
    // Common
    selectItem,
    loadState,
    reset,
    markSaved,
  }
}
