import { Routes, Route } from 'react-router-dom';
import { ProjectProvider } from './context/ProjectContext';
import Layout from './layout/Layout';
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

export default function App() {
  return (
    <ProjectProvider>
      <Routes>
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
      </Routes>
    </ProjectProvider>
  );
}
