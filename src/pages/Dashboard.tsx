import { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import api from '../api/axios';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MainContent from '../components/MainContent';
import ProjectForm from '../components/ProjectForm';
import styles from './Dashboard.module.css';
import axios from 'axios';

interface Project { id: string; name: string; color: string; }
interface Column { id: string; title: string; tasks: string[]; }

export default function Dashboard() {
    // Hooks MUST be inside the component body
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    
    const { state: authState, dispatch } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // GET — charger les données au montage
    useEffect(() => {
        async function fetchData() {
            try {
                const [projRes, colRes] = await Promise.all([
                    api.get('/projects'),
                    api.get('/columns'),
                ]);
                setProjects(projRes.data);
                setColumns(colRes.data);
            } catch (e) { 
                console.error(e); 
            } finally { 
                setLoading(false); 
            }
        }
        fetchData();
    }, []);

    // POST — ajouter un projet
    async function addProject(name: string, color: string) {
        setSaving(true);
        setError(null);
        try {
            const { data } = await api.post('/projects', { name, color });
            setProjects(prev => [...prev, data]);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || `Erreur ${err.response?.status}`);
            } else {
                setError('Erreur inconnue');
            }
        } finally {
            setSaving(false);
        }
    }

    // PUT — renommer un projet
    async function renameProject(project: Project) {
        const nouveauNom = prompt('New Name', project.name);
        if (nouveauNom && nouveauNom !== project.name) {
            try {
                // Fixed: Pass URL and Data as separate arguments
                const { data } = await api.put(`/projects/${project.id}`, { ...project, name: nouveauNom });
                setProjects((pr) => pr.map((p) => (p.id === project.id ? data : p)));
            } catch (err) {
                console.error("Rename failed", err);
            }
        }
    }

    // DELETE — supprimer un projet
    async function deleteProject(id: string) {
        try {
            await api.delete(`/projects/${id}`);
            setProjects(prev => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error("Delete failed", err);
        }
    }

    if (loading) return <div className={styles.loading}>Chargement...</div>;

    return (
        <div className={styles.layout}>
            <Header
                title="TaskFlow"
                onMenuClick={() => setSidebarOpen(p => !p)}
                userName={authState.user?.name}
                onLogout={() => dispatch({ type: 'LOGOUT' })}
            />
            <div className={styles.body}>
                <Sidebar projects={projects} isOpen={sidebarOpen} />
                <div className={styles.content}>
                    {error && <div className={styles.errorBanner}>{error}</div>}
                    <div className={styles.toolbar}>
                        {!showForm ? (
                            <button className={styles.addBtn}
                                    disabled={saving}
                                    onClick={() => setShowForm(true)}>
                                {saving ? 'En cours...' : '+ Nouveau projet'}
                            </button>
                        ) : (
                            <ProjectForm
                                submitLabel="Créer"
                                onSubmit={(name, color) => {
                                    addProject(name, color);
                                    setShowForm(false);
                                }}
                                onCancel={() => setShowForm(false)}
                            />
                        )}
                    </div>
                    <MainContent columns={columns} />
                </div>
            </div>
        </div>
    );
}