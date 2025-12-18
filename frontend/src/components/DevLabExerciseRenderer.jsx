/**
 * DevLab Exercise Renderer
 * Renders DevLab exercises as isolated iframes
 * HTML is provided by Content Studio and must be rendered as-is
 */
function DevLabExerciseRenderer({ html }) {
  return (
    <iframe
      title="DevLab Exercise"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      style={{
        width: '100%',
        minHeight: '700px',
        border: 'none',
        background: '#ffffff',
        marginTop: '24px'
      }}
    />
  );
}

export default DevLabExerciseRenderer;

