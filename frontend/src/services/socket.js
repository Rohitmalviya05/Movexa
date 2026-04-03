import { io } from 'socket.io-client'

let socket = null

export const connectSocket = (token) => {
  if (socket?.connected) return socket

  socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })

  socket.on('connect', () => console.log('Socket connected:', socket.id))
  socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason))
  socket.on('connect_error', (err) => console.error('Socket error:', err.message))

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const emitDriverOnline  = () => socket?.emit('driver:go_online')
export const emitDriverOffline = () => socket?.emit('driver:go_offline')
export const emitLocation      = (lat, lng) => socket?.emit('driver:location_update', { lat, lng })
export const trackDriver       = (bookingId) => socket?.emit('customer:track_driver', { bookingId })
export const stopTracking      = (driverUserId) => socket?.emit('customer:stop_tracking', { driverUserId })
