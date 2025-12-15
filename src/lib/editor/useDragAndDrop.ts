'use client'

import { useCallback, useRef, useState } from 'react'
import { PlacedDecoration, MIN_SCALE, MAX_SCALE } from '@/types/customization'

interface UseDragAndDropProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  decorations: PlacedDecoration[]
  selectedIndex: number | null
  onUpdate: (index: number, updates: Partial<PlacedDecoration>) => void
  onSelect: (index: number | null) => void
}

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  itemStartX: number
  itemStartY: number
}

export function useDragAndDrop({
  containerRef,
  decorations,
  selectedIndex,
  onUpdate,
  onSelect,
}: UseDragAndDropProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    itemStartX: 0,
    itemStartY: 0,
  })

  const dragIndexRef = useRef<number | null>(null)

  // Convert client coordinates to percentage position
  const clientToPercent = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 50, y: 50 }

      const rect = containerRef.current.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * 100
      const y = ((clientY - rect.top) / rect.height) * 100

      // Clamp to container bounds
      return {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
      }
    },
    [containerRef]
  )

  // Handle drag start
  const handleDragStart = useCallback(
    (index: number, clientX: number, clientY: number) => {
      onSelect(index)
      dragIndexRef.current = index

      const item = decorations[index]
      setDragState({
        isDragging: true,
        startX: clientX,
        startY: clientY,
        itemStartX: item.x,
        itemStartY: item.y,
      })
    },
    [decorations, onSelect]
  )

  // Handle drag move
  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragState.isDragging || dragIndexRef.current === null) return
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const deltaX = ((clientX - dragState.startX) / rect.width) * 100
      const deltaY = ((clientY - dragState.startY) / rect.height) * 100

      const newX = Math.max(5, Math.min(95, dragState.itemStartX + deltaX))
      const newY = Math.max(5, Math.min(95, dragState.itemStartY + deltaY))

      onUpdate(dragIndexRef.current, { x: newX, y: newY })
    },
    [dragState, containerRef, onUpdate]
  )

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragState((prev) => ({ ...prev, isDragging: false }))
    dragIndexRef.current = null
  }, [])

  // Mouse event handlers
  const onMouseDown = useCallback(
    (index: number) => (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      handleDragStart(index, e.clientX, e.clientY)
    },
    [handleDragStart]
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handleDragMove(e.clientX, e.clientY)
    },
    [handleDragMove]
  )

  const onMouseUp = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Touch event handlers
  const onTouchStart = useCallback(
    (index: number) => (e: React.TouchEvent) => {
      e.stopPropagation()
      const touch = e.touches[0]
      handleDragStart(index, touch.clientX, touch.clientY)
    },
    [handleDragStart]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      handleDragMove(touch.clientX, touch.clientY)
    },
    [handleDragMove]
  )

  const onTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Scale adjustment
  const adjustScale = useCallback(
    (delta: number) => {
      if (selectedIndex === null) return

      const item = decorations[selectedIndex]
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, item.scale + delta))
      onUpdate(selectedIndex, { scale: newScale })
    },
    [selectedIndex, decorations, onUpdate]
  )

  // Rotation adjustment
  const adjustRotation = useCallback(
    (delta: number) => {
      if (selectedIndex === null) return

      const item = decorations[selectedIndex]
      let newRotation = item.rotation + delta
      // Normalize rotation to -180 to 180
      while (newRotation > 180) newRotation -= 360
      while (newRotation < -180) newRotation += 360
      onUpdate(selectedIndex, { rotation: newRotation })
    },
    [selectedIndex, decorations, onUpdate]
  )

  // Click on canvas to deselect
  const onCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking directly on canvas, not on items
      if (e.target === e.currentTarget) {
        onSelect(null)
      }
    },
    [onSelect]
  )

  return {
    isDragging: dragState.isDragging,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onCanvasClick,
    adjustScale,
    adjustRotation,
    clientToPercent,
  }
}
