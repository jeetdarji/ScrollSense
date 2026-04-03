import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div style={{
        minHeight:'100vh', background:'#09090B',
        display:'flex', alignItems:'center', 
        justifyContent:'center'
      }}>
        <span style={{
          fontFamily:'Space Grotesk, sans-serif',
          fontSize:'0.75rem', letterSpacing:'0.2em',
          textTransform:'uppercase', color:'#3F3F46'
        }}>
          LOADING
        </span>
      </div>
    )
  }
  
  return isAuthenticated 
    ? children 
    : <Navigate to="/login" replace />
}
