import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchProjects } from '../api/client';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedProjectId, setSelectedProjectId] = useState(
    () => { const v = localStorage.getItem('selectedProjectId'); return v ? Number(v) : null; }
  );
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState(
    () => { const v = localStorage.getItem('selectedEnvironmentId'); return v ? Number(v) : null; }
  );

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      const list = Array.isArray(data) ? data : (data.projects || []);
      setProjects(list);
      if (!selectedProjectId && list.length > 0) {
        const first = list[0];
        setSelectedProjectId(first.id);
        localStorage.setItem('selectedProjectId', first.id);
        const envs = first.environments || [];
        if (envs.length > 0) {
          setSelectedEnvironmentId(envs[0].id);
          localStorage.setItem('selectedEnvironmentId', envs[0].id);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadProjects();
  }, []);

  const selectProject = useCallback((projectId, environmentId) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('selectedProjectId', projectId);
    if (environmentId) {
      setSelectedEnvironmentId(environmentId);
      localStorage.setItem('selectedEnvironmentId', environmentId);
    } else {
      const proj = projects.find((p) => p.id === projectId);
      const envs = proj?.environments || [];
      if (envs.length > 0) {
        setSelectedEnvironmentId(envs[0].id);
        localStorage.setItem('selectedEnvironmentId', envs[0].id);
      } else {
        setSelectedEnvironmentId(null);
        localStorage.removeItem('selectedEnvironmentId');
      }
    }
  }, [projects]);

  const selectEnvironment = useCallback((environmentId) => {
    setSelectedEnvironmentId(environmentId);
    if (environmentId) {
      localStorage.setItem('selectedEnvironmentId', environmentId);
    } else {
      localStorage.removeItem('selectedEnvironmentId');
    }
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
  const selectedEnvironment =
    selectedProject?.environments?.find((e) => e.id === selectedEnvironmentId) || null;

  useEffect(() => {
    if (!selectedProject) return;
    if (selectedEnvironment) return;
    const envs = selectedProject.environments || [];
    if (envs.length > 0) {
      setSelectedEnvironmentId(envs[0].id);
      localStorage.setItem('selectedEnvironmentId', envs[0].id);
    } else {
      setSelectedEnvironmentId(null);
      localStorage.removeItem('selectedEnvironmentId');
    }
  }, [selectedProject, selectedEnvironment]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        loading,
        error,
        selectedProjectId,
        selectedEnvironmentId,
        selectedProject,
        selectedEnvironment,
        selectProject,
        selectEnvironment,
        refresh: loadProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
