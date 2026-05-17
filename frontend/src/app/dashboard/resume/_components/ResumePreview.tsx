interface Props { resume: any }

export default function ResumePreview({ resume }: Props) {
  if (!resume) return null

  const p = resume.personal || {}
  const skills = resume.skills || {}
  const allSkills = [
    ...(skills.technical || []),
    ...(skills.tools || []),
    ...(skills.soft || [])
  ]

  const sectionTitle = (title: string) => (
    <h2 className="text-[10px] font-bold uppercase tracking-widest text-blue-600 border-b border-gray-200 pb-1 mb-2 mt-4">
      {title}
    </h2>
  )

  return (
    <div className="bg-white text-gray-800 rounded-xl p-8 text-sm leading-relaxed shadow-2xl"
      style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">{p.full_name}</h1>
      <div className="flex gap-3 flex-wrap text-xs text-gray-500 mt-1 mb-1">
        {p.email && <span>📧 {p.email}</span>}
        {p.phone && <span>📱 {p.phone}</span>}
        {p.location && <span>📍 {p.location}</span>}
      </div>
      <div className="flex gap-3 flex-wrap text-xs text-gray-500 mb-4">
        {p.linkedin && <span>🔗 {p.linkedin}</span>}
        {p.github && <span>🐙 {p.github}</span>}
        {p.portfolio && <span>🌐 {p.portfolio}</span>}
      </div>

      {/* Summary */}
      {resume.summary && (
        <>{sectionTitle('Professional Summary')}
        <p className="text-xs text-gray-600 leading-relaxed">{resume.summary}</p></>
      )}

      {/* Experience */}
      {resume.experience?.length > 0 && (
        <>{sectionTitle('Work Experience')}
        {resume.experience.map((exp: any, i: number) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between font-bold text-xs">
              {exp.title}
              <span className="font-normal text-gray-400">{exp.start_date} – {exp.end_date || 'Present'}</span>
            </div>
            <div className="text-xs text-gray-500 mb-1">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</div>
            <ul className="list-disc pl-4 text-xs text-gray-600 space-y-0.5">
              {exp.bullets?.map((b: string, j: number) => <li key={j}>{b}</li>)}
            </ul>
          </div>
        ))}</>
      )}

      {/* Education */}
      {resume.education?.length > 0 && (
        <>{sectionTitle('Education')}
        {resume.education.map((edu: any, i: number) => (
          <div key={i} className="flex justify-between text-xs mb-1">
            <span><strong>{edu.degree}</strong>{edu.institution ? ` · ${edu.institution}` : ''}{edu.gpa ? ` · GPA: ${edu.gpa}` : ''}</span>
            <span className="text-gray-400">{edu.year}</span>
          </div>
        ))}</>
      )}

      {/* Skills */}
      {allSkills.length > 0 && (
        <>{sectionTitle('Skills')}
        {skills.technical?.length > 0 && (
          <div className="text-xs mb-1"><strong>Technical:</strong> {skills.technical.join(', ')}</div>
        )}
        {skills.tools?.length > 0 && (
          <div className="text-xs mb-1"><strong>Tools:</strong> {skills.tools.join(', ')}</div>
        )}
        {skills.soft?.length > 0 && (
          <div className="text-xs mb-1"><strong>Soft Skills:</strong> {skills.soft.join(', ')}</div>
        )}</>
      )}

      {/* Projects */}
      {resume.projects?.length > 0 && (
        <>{sectionTitle('Projects')}
        {resume.projects.map((proj: any, i: number) => (
          <div key={i} className="mb-2">
            <div className="font-bold text-xs">
              {proj.name}
              {proj.tech_stack?.length > 0 && (
                <span className="font-normal text-blue-500 text-[10px]"> · {proj.tech_stack.join(', ')}</span>
              )}
              {proj.link && <span className="font-normal text-blue-400 text-[10px]"> · {proj.link}</span>}
            </div>
            {proj.description && <p className="text-xs text-gray-500">{proj.description}</p>}
          </div>
        ))}</>
      )}

      {/* Certifications */}
      {resume.certifications?.length > 0 && (
        <>{sectionTitle('Certifications')}
        <ul className="list-disc pl-4 text-xs text-gray-600">
          {resume.certifications.map((c: string, i: number) => <li key={i}>{c}</li>)}
        </ul></>
      )}

      {/* Languages */}
      {resume.languages?.length > 0 && (
        <>{sectionTitle('Languages')}
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {resume.languages.map((l: any, i: number) => (
            <span key={i}>{typeof l === 'string' ? l : `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`}</span>
          ))}
        </div></>
      )}

      {/* Awards */}
      {resume.awards?.length > 0 && (
        <>{sectionTitle('Awards & Honors')}
        <ul className="list-disc pl-4 text-xs text-gray-600">
          {resume.awards.map((a: string, i: number) => <li key={i}>{a}</li>)}
        </ul></>
      )}

      {/* Publications */}
      {resume.publications?.length > 0 && (
        <>{sectionTitle('Publications / Research')}
        <ul className="list-disc pl-4 text-xs text-gray-600">
          {resume.publications.map((pub: string, i: number) => <li key={i}>{pub}</li>)}
        </ul></>
      )}

      {/* Volunteer */}
      {resume.volunteer?.length > 0 && (
        <>{sectionTitle('Volunteer Experience')}
        {resume.volunteer.map((v: any, i: number) => (
          <div key={i} className="mb-1 text-xs">
            <strong>{typeof v === 'string' ? v : v.role}</strong>
            {v.organization && <span className="text-gray-500"> · {v.organization}</span>}
            {v.duration && <span className="text-gray-400"> · {v.duration}</span>}
            {v.description && <p className="text-gray-500">{v.description}</p>}
          </div>
        ))}</>
      )}

      {/* References */}
      {resume.references?.length > 0 && (
        <>{sectionTitle('References')}
        {resume.references.map((r: string, i: number) => (
          <div key={i} className="text-xs text-gray-500">{r}</div>
        ))}</>
      )}
    </div>
  )
}