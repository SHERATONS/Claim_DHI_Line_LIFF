import { Routes, Route, Navigate, HashRouter } from 'react-router-dom';
import { useLiff } from '@/hooks';
import { LoadingOverlay, ErrorModal, ErrorBoundary } from '@/components';
import FR_IAR_Claim from '@/pages/FR_IAR_Claim';
import Marine_HULL_Claim from '@/pages/Marine_HULL_Claim';
import Marine_CARGO_Claim from '@/pages/Marine_CARGO_Claim';
import Marine_CL_Claim from '@/pages/Marine_CL_Claim';
import CAR_EAR_CPM_Claim from '@/pages/CAR_EAR_CPM_Claim';
import Drone_Claim from '@/pages/Drone_Claim';
import Pet_Claim from '@/pages/Pet_Claim';
import Golf_Claim from '@/pages/Golf_Claim';
import TA_Claim from '@/pages/TA_Claim';
import AH_Death_Claim from '@/pages/AH_Death_Claim';
import NotFound from '@/pages/NotFound';

function AppContent() {
  const { isInitialized, error } = useLiff();

  if (!isInitialized && !error) {
    return <LoadingOverlay message="กำลังเชื่อมต่อ LINE..." />;
  }

  if (error) {
    return (
      <ErrorModal
        show={true}
        message={error.message || 'ไม่สามารถเชื่อมต่อ LINE ได้'}
        onClose={() => window.close()}
      />
    );
  }

  return (
    <Routes>
      <Route path="/FRIARClaim" element={<FR_IAR_Claim />} />
      <Route path="/HULLClaim" element={<Marine_HULL_Claim />} />
      <Route path="/CARGOClaim" element={<Marine_CARGO_Claim />} />
      <Route path="/CLClaim" element={<Marine_CL_Claim />} />
      <Route path="/CAREARClaim" element={<CAR_EAR_CPM_Claim />} />
      <Route path="/DRONEClaim" element={<Drone_Claim />} />
      <Route path="/PETClaim" element={<Pet_Claim />} />
      <Route path="/GOLFClaim" element={<Golf_Claim />} />
      <Route path="/TAClaim" element={<TA_Claim />} />
      <Route path="/AHClaim" element={<AH_Death_Claim />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

AppContent.displayName = 'AppContent';

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </ErrorBoundary>
  );
}

App.displayName = 'App';

export default App;
