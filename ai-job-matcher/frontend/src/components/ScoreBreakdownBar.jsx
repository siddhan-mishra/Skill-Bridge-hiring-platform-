/**
 * ScoreBreakdownBar.jsx — Step 3 reusable component
 *
 * Shows a 3-segment visual breakdown of the hybrid match score:
 *   - Semantic (SBERT cosine similarity)
 *   - Skills (overlap ratio)
 *   - Structured (exp + education)
 *
 * Used in MatchedJobsPage and CandidatesPage.
 * Gracefully hides if breakdown is null (fallback mode).
 */

export default function ScoreBreakdownBar({ score, breakdown, size = 'normal' }) {
  const isSmall = size === 'small';

  // Score ring color
  const ringColor =
    score >= 75 ? '#34d399' :
    score >= 50 ? '#fbbf24' :
    score >= 25 ? '#f97316' : '#f87171';

  const ringLabel =
    score >= 75 ? 'Strong Match' :
    score >= 50 ? 'Good Match'   :
    score >= 25 ? 'Partial'      : 'Low Match';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

      {/* Score ring + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: isSmall ? 44 : 56, height: isSmall ? 44 : 56,
          borderRadius: '50%',
          background: `conic-gradient(${ringColor} ${score * 3.6}deg, #1f2937 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{
            width: isSmall ? 32 : 42, height: isSmall ? 32 : 42,
            borderRadius: '50%', background: '#0a0f1e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isSmall ? '0.75rem' : '0.9rem', fontWeight: 800, color: ringColor,
          }}>
            {score}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: isSmall ? '0.8rem' : '0.9rem', fontWeight: 700, color: ringColor }}>{ringLabel}</div>
          {breakdown?.semanticScore != null && (
            <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '0.1rem' }}>AI-powered hybrid score</div>
          )}
        </div>
      </div>

      {/* Breakdown bars — only shown when SBERT was used */}
      {breakdown?.semanticScore != null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
          {[
            { label: '🧠 Semantic', value: breakdown.semanticScore, color: '#818cf8' },
            { label: '🛠 Skills',   value: breakdown.skillScore,    color: '#34d399' },
            { label: '📋 Profile',  value: breakdown.structScore,   color: '#fbbf24' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.15rem' }}>
                <span>{label}</span>
                <span style={{ color }}>{value}%</span>
              </div>
              <div style={{ height: 5, background: '#1f2937', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
