import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Firebase into its own chunk
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Separate React into its own chunk
          react: ['react', 'react-dom'],
          // Group all player-related components
          players: [
            './src/components/players/PlayerRoster.jsx',
            './src/components/players/PlayerCard.jsx',
            './src/components/players/PlayerForm.jsx',
            './src/components/players/PlayerProfile.jsx'
          ],
          // Group attendance components
          attendance: [
            './src/components/attendance/AttendanceTracker.jsx',
            './src/components/attendance/AttendanceRow.jsx'
          ],
          // Group practice components
          practice: [
            './src/components/practice/PracticePlanner.jsx',
            './src/components/practice/PracticePlanForm.jsx',
            './src/components/practice/PracticePlanCard.jsx'
          ]
        }
      }
    },
    // Increase chunk size warning limit to 1000KB
    chunkSizeWarningLimit: 1000
  }
})
