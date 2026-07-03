import { Routes, Route } from 'react-router-dom';
import { ProjectProvider } from './context/ProjectContext';
import Layout from './layout/Layout';
import PlatformLayout from './layout/PlatformLayout';
import Overview from './pages/Overview';
import Environments from './pages/Environments';
import Services from './pages/Services';
import Databases from './pages/Databases';
import Pipelines from './pages/Pipelines';
import Deployments from './pages/Deployments';
import Sandbox from './pages/Sandbox';
import FileBrowser from './pages/FileBrowser';
import Terminal from './pages/Terminal';
import Logs from './pages/Logs';
import Secrets from './pages/Secrets';
import Settings from './pages/Settings';
import PlatformOverview from './pages/platform/PlatformOverview';
import Providers from './pages/platform/Providers';
import DiscoveryJobs from './pages/platform/DiscoveryJobs';
import Hosts from './pages/platform/Hosts';
import Containers from './pages/platform/Containers';
import Applications from './pages/platform/Applications';
import ServiceMap from './pages/platform/ServiceMap';
import Operations from './pages/platform/Operations';
import Capacity from './pages/platform/Capacity';
import Governance from './pages/platform/Governance';

export default function App() {
  return (
    <ProjectProvider>
      <Routes>
        {/* DX User Layout — Original GoneOps */}
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="environments" element={<Environments />} />
          <Route path="services" element={<Services />} />
          <Route path="databases" element={<Databases />} />
          <Route path="pipelines" element={<Pipelines />} />
          <Route path="deployments" element={<Deployments />} />
          <Route path="sandbox" element={<Sandbox />} />
          <Route path="files" element={<FileBrowser />} />
          <Route path="terminal" element={<Terminal />} />
          <Route path="logs" element={<Logs />} />
          <Route path="secrets" element={<Secrets />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        {/* Platform Admin Layout — Separate from DX */}
        <Route element={<PlatformLayout />}>
          <Route path="platform" element={<PlatformOverview />} />
          <Route path="platform/providers" element={<Providers />} />
          <Route path="platform/discovery" element={<DiscoveryJobs />} />
          <Route path="platform/inventory" element={<Hosts />} />
          <Route path="platform/containers" element={<Containers />} />
          <Route path="platform/applications" element={<Applications />} />
          <Route path="platform/mapping" element={<ServiceMap />} />
          <Route path="platform/operations" element={<Operations />} />
          <Route path="platform/capacity" element={<Capacity />} />
          <Route path="platform/governance" element={<Governance />} />
        </Route>
      </Routes>
    </ProjectProvider>
  );
}
