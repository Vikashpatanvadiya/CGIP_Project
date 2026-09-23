// Module Owner: Vikas Patanwadiya (24000605) — GUI / camera integration
// Wraps getUserMedia + a hidden <canvas> so any component can start the
// webcam and grab JPEG frames as base64 data URLs to send to the backend.

import { useCallback, useEffect, useRef, useState } from 'react'

export function useCamera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(document.createElement('canvas'))
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setReady(true)
      })
      .catch((err) => setError(err.message))

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return null

    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.8)
  }, [])

  return { videoRef, ready, error, captureFrame }
}
