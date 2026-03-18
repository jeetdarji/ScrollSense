export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090B',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Space Grotesk, sans-serif',
      gap: '1rem',
    }}>
      <p style={{ fontSize: '8rem', fontWeight: 700, color: '#27272A', 
                  lineHeight: 1, letterSpacing: '-0.03em' }}>404</p>
      <p style={{ fontSize: '0.75rem', color: '#A1A1AA', 
                  textTransform: 'uppercase', letterSpacing: '0.2em' }}>
        PAGE NOT FOUND
      </p>
      <a href="/" style={{ marginTop: '1rem', background: '#DFE104', 
        color: '#000', padding: '0.75rem 2rem', fontWeight: 700,
        fontSize: '0.75rem', textTransform: 'uppercase', 
        letterSpacing: '-0.02em', textDecoration: 'none' }}>
        GO HOME
      </a>
    </div>
  )
}