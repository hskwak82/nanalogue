'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

interface Point {
  x: number
  y: number
}

interface LassoCropCanvasProps {
  imageUrl: string
  onPathComplete: (svgPath: string) => void
  onPathClear: () => void
  width?: number
  height?: number
}

export function LassoCropCanvas({
  imageUrl,
  onPathComplete,
  onPathClear,
  width = 300,
  height = 300,
}: LassoCropCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [points, setPoints] = useState<Point[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Load image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      drawCanvas()
    }
    img.src = imageUrl
  }, [imageUrl])

  // Draw canvas with image and path
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw image
    if (imageRef.current) {
      const img = imageRef.current
      const imgRatio = img.width / img.height
      const canvasRatio = width / height

      let sx = 0, sy = 0, sw = img.width, sh = img.height

      if (imgRatio > canvasRatio) {
        sw = img.height * canvasRatio
        sx = (img.width - sw) / 2
      } else {
        sh = img.width / canvasRatio
        sy = (img.height - sh) / 2
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
    }

    // Draw path
    if (points.length > 0) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }

      if (isComplete && points.length > 2) {
        ctx.closePath()
        ctx.fillStyle = 'rgba(147, 112, 219, 0.3)'
        ctx.fill()
      }

      ctx.strokeStyle = '#9370DB'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()

      // Draw points
      points.forEach((point, index) => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, index === 0 ? 6 : 3, 0, Math.PI * 2)
        ctx.fillStyle = index === 0 ? '#9370DB' : '#fff'
        ctx.fill()
        ctx.strokeStyle = '#9370DB'
        ctx.lineWidth = 1
        ctx.stroke()
      })
    }
  }, [points, width, height, isComplete])

  // Redraw when points change
  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const isNearStart = (point: Point): boolean => {
    if (points.length < 3) return false
    const start = points[0]
    const distance = Math.sqrt(
      Math.pow(point.x - start.x, 2) + Math.pow(point.y - start.y, 2)
    )
    return distance < 20
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isComplete) return
    e.preventDefault()

    const point = getCanvasPoint(e)
    setIsDrawing(true)
    setPoints([point])
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isComplete) return
    e.preventDefault()

    const point = getCanvasPoint(e)

    // Add point if moved enough distance
    const lastPoint = points[points.length - 1]
    const distance = Math.sqrt(
      Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
    )

    if (distance > 5) {
      setPoints((prev) => [...prev, point])
    }
  }

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()

    setIsDrawing(false)

    // Check if path should close
    if (points.length > 2) {
      const lastPoint = points[points.length - 1]
      if (isNearStart(lastPoint)) {
        setIsComplete(true)
        // Generate SVG path
        const svgPath = generateSvgPath(points)
        onPathComplete(svgPath)
      }
    }
  }

  const handleClear = () => {
    setPoints([])
    setIsComplete(false)
    onPathClear()
  }

  const handleUndo = () => {
    if (points.length > 0 && !isComplete) {
      setPoints((prev) => prev.slice(0, -10)) // Remove last 10 points
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border-2 border-gray-200 rounded-xl cursor-crosshair touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />

        {/* Instructions overlay */}
        {points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
              손가락으로 오릴 영역을 그려주세요
            </div>
          </div>
        )}

        {/* Close hint */}
        {points.length > 2 && !isComplete && (
          <div className="absolute top-2 left-2 bg-pastel-purple text-white px-2 py-1 rounded text-xs">
            시작점 근처로 가면 완성됩니다
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={handleUndo}
          disabled={points.length === 0 || isComplete}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↩️ 되돌리기
        </button>
        <button
          onClick={handleClear}
          disabled={points.length === 0}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🗑️ 지우기
        </button>
      </div>

      {/* Status */}
      {isComplete && (
        <div className="text-sm text-green-600 font-medium">
          ✓ 영역 선택 완료
        </div>
      )}
    </div>
  )
}

/**
 * Generate SVG path string from points
 */
function generateSvgPath(points: Point[]): string {
  if (points.length < 2) return ''

  // Smooth the path using Catmull-Rom spline
  const smoothedPoints = smoothPath(points)

  let path = `M ${smoothedPoints[0].x} ${smoothedPoints[0].y}`

  for (let i = 1; i < smoothedPoints.length; i++) {
    path += ` L ${smoothedPoints[i].x} ${smoothedPoints[i].y}`
  }

  path += ' Z'
  return path
}

/**
 * Smooth path using simple averaging
 */
function smoothPath(points: Point[]): Point[] {
  if (points.length < 3) return points

  const smoothed: Point[] = [points[0]]

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    smoothed.push({
      x: (prev.x + curr.x * 2 + next.x) / 4,
      y: (prev.y + curr.y * 2 + next.y) / 4,
    })
  }

  smoothed.push(points[points.length - 1])
  return smoothed
}
