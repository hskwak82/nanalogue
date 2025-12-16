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
  ItemType,
  PhotoMeta,
} from '@/types/customization'

const initialState: EditorState = {
  selectedCover: null,
  selectedPaper: null,
  decorations: [],
  selectedItemIndex: null,
  isDirty: false,
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

    case 'ADD_DECORATION':
      return {
        ...state,
        decorations: [...state.decorations, action.payload],
        selectedItemIndex: state.decorations.length,
        isDirty: true,
      }

    case 'UPDATE_DECORATION':
      return {
        ...state,
        decorations: state.decorations.map((d, i) =>
          i === action.payload.index
            ? { ...d, ...action.payload.decoration }
            : d
        ),
        isDirty: true,
      }

    case 'REMOVE_DECORATION':
      return {
        ...state,
        decorations: state.decorations.filter((_, i) => i !== action.payload),
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

    case 'LOAD_STATE':
      return {
        ...state,
        selectedCover: action.payload.cover,
        selectedPaper: action.payload.paper,
        decorations: action.payload.decorations,
        selectedItemIndex: null,
        isDirty: false,
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

  const addDecoration = useCallback(
    (item: { item_id: string; type: ItemType; content: string; photo_meta?: PhotoMeta }) => {
      const decoration: PlacedDecoration = {
        item_id: item.item_id,
        type: item.type,
        content: item.content,
        x: 50, // Center
        y: 50,
        scale: DEFAULT_DECORATION_SCALE,
        rotation: DEFAULT_DECORATION_ROTATION,
        z_index: state.decorations.length + 1,
        photo_meta: item.photo_meta,
      }
      dispatch({ type: 'ADD_DECORATION', payload: decoration })
    },
    [state.decorations.length]
  )

  const updateDecoration = useCallback(
    (index: number, updates: Partial<PlacedDecoration>) => {
      dispatch({ type: 'UPDATE_DECORATION', payload: { index, decoration: updates } })
    },
    []
  )

  const removeDecoration = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_DECORATION', payload: index })
  }, [])

  const selectItem = useCallback((index: number | null) => {
    dispatch({ type: 'SELECT_ITEM', payload: index })
  }, [])

  const loadState = useCallback(
    (
      cover: CoverTemplate | null,
      paper: PaperTemplate | null,
      decorations: PlacedDecoration[]
    ) => {
      dispatch({ type: 'LOAD_STATE', payload: { cover, paper, decorations } })
    },
    []
  )

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const markSaved = useCallback(() => {
    dispatch({ type: 'MARK_SAVED' })
  }, [])

  return {
    state,
    setCover,
    setPaper,
    addDecoration,
    updateDecoration,
    removeDecoration,
    selectItem,
    loadState,
    reset,
    markSaved,
  }
}
