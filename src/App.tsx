/**
 * Main Application Component
 */

import { JwwViewer } from './components/JwwViewer';
import type { JwwDocument } from './types';

function App() {
  const handleDocumentLoad = (document: JwwDocument) => {
    console.log('Document loaded:', {
      entities: document.entities.length,
      layers: document.layers.length,
      header: document.header
    });
  };

  const handleError = (error: Error) => {
    console.error('Viewer error:', error);
  };

  return (
    <div className="App">
      <JwwViewer
        onDocumentLoad={handleDocumentLoad}
        onError={handleError}
      />
    </div>
  );
}

export default App;
