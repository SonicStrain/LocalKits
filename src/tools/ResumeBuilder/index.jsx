import { useState } from 'react';
import { FileText, Plus, Trash2, Printer, Download } from 'lucide-react';
import { ToastContainer, useToast } from '../../components/ui/Toast';

const TEMPLATES = ['Classic', 'Modern'];

const INITIAL = {
  name: 'Alex Johnson',
  title: 'Software Engineer',
  email: 'alex@example.com',
  phone: '+1 (555) 000-1234',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/alexjohnson',
  summary: 'Results-driven software engineer with 5+ years building scalable web applications. Passionate about clean code, developer tooling, and shipping products users love.',
  experience: [
    { company: 'Acme Corp', role: 'Senior Engineer', period: '2021 – Present', bullets: 'Led migration to microservices, reducing latency by 40%.\nMentored 3 junior engineers.\nBuilt internal CI/CD pipeline used by 50+ engineers.' },
    { company: 'Startup Inc', role: 'Full-Stack Developer', period: '2019 – 2021', bullets: 'Shipped React/Node.js SaaS product from 0 to 10K users.\nIntegrated Stripe billing and OAuth2 SSO.' },
  ],
  education: [
    { school: 'State University', degree: 'B.Sc. Computer Science', period: '2015 – 2019', detail: "GPA 3.8 · Dean's List" },
  ],
  skills: 'TypeScript, React, Node.js, Python, PostgreSQL, Docker, Kubernetes, AWS',
  projects: [
    { name: 'OpenUtil', link: 'github.com/alex/openutil', desc: 'CLI tool for developer productivity — 1.2K GitHub stars.' },
  ],
};

/* ── Classic template ── */
function ClassicTemplate({ data }) {
  const bullets = (text) => text.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>);
  return (
    <div style={{ width: '794px', minHeight: '1123px', background: '#fff', color: '#111', padding: '56px', fontFamily: 'Georgia, serif', fontSize: '13px', lineHeight: 1.6, boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 2px' }}>{data.name}</h1>
      <p style={{ fontSize: '14px', color: '#555', margin: '0 0 4px' }}>{data.title}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: '#777', borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '14px' }}>
        {data.email    && <span>{data.email}</span>}
        {data.phone    && <span>{data.phone}</span>}
        {data.location && <span>{data.location}</span>}
        {data.linkedin && <span>{data.linkedin}</span>}
      </div>

      {data.summary && <Sec title="Summary"><p style={{ color: '#333', margin: 0 }}>{data.summary}</p></Sec>}

      {data.experience.length > 0 && (
        <Sec title="Experience">
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong>{e.role}</strong>
                <span style={{ fontSize: '11px', color: '#888' }}>{e.period}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: 3 }}>{e.company}</div>
              <ul style={{ margin: '0 0 0 18px', padding: 0, color: '#444' }}>{bullets(e.bullets)}</ul>
            </div>
          ))}
        </Sec>
      )}

      {data.education.length > 0 && (
        <Sec title="Education">
          {data.education.map((e, i) => (
            <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <strong>{e.degree}</strong>
                <div style={{ fontSize: '11px', color: '#666' }}>{e.school}{e.detail && ` · ${e.detail}`}</div>
              </div>
              <span style={{ fontSize: '11px', color: '#888' }}>{e.period}</span>
            </div>
          ))}
        </Sec>
      )}

      {data.projects.length > 0 && (
        <Sec title="Projects">
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong>{p.name}</strong>{p.link && <span style={{ fontSize: '11px', color: '#888', marginLeft: 8 }}>{p.link}</span>}
              <div style={{ color: '#444' }}>{p.desc}</div>
            </div>
          ))}
        </Sec>
      )}

      {data.skills && <Sec title="Skills"><p style={{ color: '#444', margin: 0 }}>{data.skills}</p></Sec>}
    </div>
  );
}

function Sec({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', borderBottom: '1px solid #eee', paddingBottom: 3, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

/* ── Modern template ── */
function ModernTemplate({ data }) {
  const bullets = (text) => text.split('\n').filter(Boolean).map((b, i) => <li key={i} style={{ marginBottom: 2 }}>{b}</li>);
  return (
    <div style={{ width: '794px', minHeight: '1123px', background: '#fff', display: 'flex', fontFamily: 'Arial, sans-serif', fontSize: '13px', lineHeight: 1.55, boxSizing: 'border-box' }}>
      {/* Left column */}
      <div style={{ width: '220px', background: '#18181b', color: '#f4f4f5', padding: '36px 20px', flexShrink: 0 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
          {data.name.charAt(0)}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{data.name}</div>
        <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 16 }}>{data.title}</div>

        <div style={{ fontSize: 11, color: '#a1a1aa', lineHeight: 1.8, marginBottom: 20 }}>
          {data.email    && <div>{data.email}</div>}
          {data.phone    && <div>{data.phone}</div>}
          {data.location && <div>{data.location}</div>}
          {data.linkedin && <div>{data.linkedin}</div>}
        </div>

        {data.skills && (
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a', marginBottom: 8 }}>Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {data.skills.split(',').map((s, i) => (
                <span key={i} style={{ background: '#3f3f46', color: '#d4d4d8', fontSize: '10px', padding: '2px 6px', borderRadius: 4 }}>{s.trim()}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column */}
      <div style={{ flex: 1, padding: '36px 32px' }}>
        {data.summary && <p style={{ color: '#555', marginTop: 0, marginBottom: 20, lineHeight: 1.7 }}>{data.summary}</p>}

        {data.experience.length > 0 && (
          <ModSec title="Experience" color="#7c3aed">
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong>{e.role} · {e.company}</strong>
                  <span style={{ fontSize: '11px', color: '#999' }}>{e.period}</span>
                </div>
                <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#555', fontSize: '12px' }}>{bullets(e.bullets)}</ul>
              </div>
            ))}
          </ModSec>
        )}

        {data.education.length > 0 && (
          <ModSec title="Education" color="#7c3aed">
            {data.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{e.degree}</strong>
                  <div style={{ fontSize: '11px', color: '#777' }}>{e.school}</div>
                </div>
                <span style={{ fontSize: '11px', color: '#999' }}>{e.period}</span>
              </div>
            ))}
          </ModSec>
        )}

        {data.projects.length > 0 && (
          <ModSec title="Projects" color="#7c3aed">
            {data.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <strong>{p.name}</strong>{p.link && <span style={{ fontSize: '11px', color: '#999', marginLeft: 8 }}>{p.link}</span>}
                <div style={{ color: '#555', fontSize: '12px', marginTop: 2 }}>{p.desc}</div>
              </div>
            ))}
          </ModSec>
        )}
      </div>
    </div>
  );
}

function ModSec({ title, color, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color, borderBottom: `1px solid ${color}30`, paddingBottom: 4, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

/* ── Main component ── */
export default function ResumeBuilder() {
  const [data, setData]       = useState(INITIAL);
  const [template, setTemplate] = useState(0);
  const { toasts, dismiss, toast } = useToast();

  const set  = (key, val) => setData((d) => ({ ...d, [key]: val }));
  const setExp  = (i, key, val) => setData((d) => { const a = [...d.experience]; a[i] = { ...a[i], [key]: val }; return { ...d, experience: a }; });
  const setEdu  = (i, key, val) => setData((d) => { const a = [...d.education];  a[i] = { ...a[i], [key]: val }; return { ...d, education:  a }; });
  const setProj = (i, key, val) => setData((d) => { const a = [...d.projects];   a[i] = { ...a[i], [key]: val }; return { ...d, projects:   a }; });

  const handlePrint = () => {
    window.print();
    toast.info('Print dialog opened — choose "Save as PDF".');
  };

  const TemplateComponent = template === 0 ? ClassicTemplate : ModernTemplate;

  return (
    <>
      {/*
        ── PRINT-ONLY TEMPLATE ──────────────────────────────────────────────
        Sits at the top of the DOM, outside every no-print container.
        Hidden on screen via the <style> below; shown only when printing.
      */}
      <div id="resume-print-target">
        <TemplateComponent data={data} />
      </div>

      {/* ── SCREEN UI ────────────────────────────────────────────────────── */}
      <style>{`
        /* Hidden on screen */
        #resume-print-target { display: none; }

        @media print {
          /* Use visibility so children can override it — display:none on a parent
             cannot be overridden by children, but visibility:hidden can. */
          body * { visibility: hidden !important; }

          #resume-print-target {
            visibility: visible !important;
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 99999 !important;
          }

          #resume-print-target * {
            visibility: visible !important;
          }

          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div className="animate-fade-in space-y-6">
        <ToastContainer toasts={toasts} onDismiss={dismiss} />

        <div className="tool-header">
          <div className="tool-icon-wrap bg-gradient-to-br from-blue-600 to-violet-700">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Resume Builder</h1>
            <p className="text-sm text-zinc-500">Fill the form · Preview · Print to PDF</p>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* ── Form ── */}
          <div className="xl:w-96 shrink-0 space-y-4">
            <div className="card p-4">
              <label className="label">Template</label>
              <div className="flex gap-1">
                {TEMPLATES.map((t, i) => (
                  <button key={t} onClick={() => setTemplate(i)} className={i === template ? 'tab tab-active' : 'tab tab-inactive'}>{t}</button>
                ))}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <p className="label text-zinc-400 font-semibold">Personal Info</p>
              {[['name','Full Name'],['title','Title / Role'],['email','Email'],['phone','Phone'],['location','Location'],['linkedin','LinkedIn']].map(([k, p]) => (
                <div key={k}>
                  <label className="label">{p}</label>
                  <input className="input" value={data[k]} onChange={(e) => set(k, e.target.value)} placeholder={p} />
                </div>
              ))}
              <div>
                <label className="label">Summary</label>
                <textarea className="input min-h-[80px] resize-y" value={data.summary} onChange={(e) => set('summary', e.target.value)} />
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="label text-zinc-400 font-semibold">Experience</p>
                <button onClick={() => set('experience', [...data.experience, { company: '', role: '', period: '', bullets: '' }])} className="btn-ghost py-1 px-2 text-xs gap-1"><Plus size={12} /> Add</button>
              </div>
              {data.experience.map((e, i) => (
                <div key={i} className="border border-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-zinc-400">Entry {i + 1}</span>
                    <button onClick={() => set('experience', data.experience.filter((_, j) => j !== i))} className="btn-ghost p-1"><Trash2 size={12} className="text-red-400" /></button>
                  </div>
                  {[['role','Role'],['company','Company'],['period','Period']].map(([k, p]) => (
                    <input key={k} className="input text-xs" placeholder={p} value={e[k]} onChange={(ev) => setExp(i, k, ev.target.value)} />
                  ))}
                  <textarea className="input text-xs min-h-[60px] resize-y" placeholder="Bullet points (one per line)" value={e.bullets} onChange={(ev) => setExp(i, 'bullets', ev.target.value)} />
                </div>
              ))}
            </div>

            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="label text-zinc-400 font-semibold">Education</p>
                <button onClick={() => set('education', [...data.education, { school: '', degree: '', period: '', detail: '' }])} className="btn-ghost py-1 px-2 text-xs gap-1"><Plus size={12} /> Add</button>
              </div>
              {data.education.map((e, i) => (
                <div key={i} className="border border-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-zinc-400">Entry {i + 1}</span>
                    <button onClick={() => set('education', data.education.filter((_, j) => j !== i))} className="btn-ghost p-1"><Trash2 size={12} className="text-red-400" /></button>
                  </div>
                  {[['degree','Degree'],['school','School'],['period','Period'],['detail','Detail (GPA, honors…)']].map(([k, p]) => (
                    <input key={k} className="input text-xs" placeholder={p} value={e[k]} onChange={(ev) => setEdu(i, k, ev.target.value)} />
                  ))}
                </div>
              ))}
            </div>

            <div className="card p-4">
              <label className="label">Skills (comma-separated)</label>
              <textarea className="input min-h-[60px] resize-y" value={data.skills} onChange={(e) => set('skills', e.target.value)} />
            </div>

            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="label text-zinc-400 font-semibold">Projects</p>
                <button onClick={() => set('projects', [...data.projects, { name: '', link: '', desc: '' }])} className="btn-ghost py-1 px-2 text-xs gap-1"><Plus size={12} /> Add</button>
              </div>
              {data.projects.map((p, i) => (
                <div key={i} className="border border-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-zinc-400">Project {i + 1}</span>
                    <button onClick={() => set('projects', data.projects.filter((_, j) => j !== i))} className="btn-ghost p-1"><Trash2 size={12} className="text-red-400" /></button>
                  </div>
                  {[['name','Name'],['link','Link'],['desc','Description']].map(([k, lbl]) => (
                    <input key={k} className="input text-xs" placeholder={lbl} value={p[k]} onChange={(ev) => setProj(i, k, ev.target.value)} />
                  ))}
                </div>
              ))}
            </div>

            <button onClick={handlePrint} className="btn-primary w-full">
              <Printer size={15} /> Print / Save as PDF
            </button>
          </div>

          {/* ── Live Preview (screen only, scaled for fit) ── */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="label">Live Preview</p>
              <button onClick={handlePrint} className="btn-secondary gap-2 text-xs py-1.5 px-3">
                <Download size={13} /> Export PDF
              </button>
            </div>
            {/* Outer box clips to the scaled size so it doesn't overflow */}
            <div style={{ width: '595px', height: '842px', overflow: 'hidden', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #27272a' }}>
              <div style={{ width: '794px', transformOrigin: 'top left', transform: 'scale(0.75)', pointerEvents: 'none' }}>
                <TemplateComponent data={data} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
