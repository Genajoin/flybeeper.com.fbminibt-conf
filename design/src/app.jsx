// App — wires the design canvas around the Cockpit minimal direction.
function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="cockpit-minimal"
        title="FlyBeeper mini BT · Cockpit minimal"
        subtitle="High-contrast B/W + single signal-orange · Archivo Narrow + Space Mono · sun-glare readable, utilitarian, gauge-feel. Mobile-first; desktop = browser frame; OLED dark mode for night flying."
      >
        {window.CockpitArtboards()}
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
