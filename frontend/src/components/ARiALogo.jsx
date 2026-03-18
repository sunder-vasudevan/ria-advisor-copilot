// A-RiA brand name with a round dot on the lowercase i
// Uses dotless-i (ı) + an absolutely positioned circle so the dot is always perfectly round
export default function ARiALogo({ className = '', style = {} }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'baseline', ...style }}>
      {'A-R'}
      <span style={{ position: 'relative', display: 'inline-block', lineHeight: 'inherit' }}>
        ı
        <span style={{
          position: 'absolute',
          left: '50%',
          top: '0.05em',
          transform: 'translateX(-50%)',
          width: '0.2em',
          height: '0.2em',
          borderRadius: '50%',
          background: 'currentColor',
          display: 'block',
          pointerEvents: 'none',
        }} />
      </span>
      {'A'}
    </span>
  )
}
