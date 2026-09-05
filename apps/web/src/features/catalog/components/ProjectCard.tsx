import type { ProjectSummary } from '@schoolroom/contracts';
import { Link } from 'react-router-dom';
import { CoverArtwork } from './CoverArtwork.js';
import { FavoriteButton } from './FavoriteButton.js';

export function ProjectCard({
  project,
  onOpen,
  eager = false,
}: {
  project: ProjectSummary;
  onOpen?: (projectId: string) => void;
  eager?: boolean;
}) {
  return (
    <article className="project-card" data-project-id={project.id}>
      <div className="project-card-cover">
        <Link
          to={`/projects/${project.slug}`}
          aria-label={`Открыть проект «${project.title}»`}
          onClick={() => onOpen?.(project.id)}
        >
          <CoverArtwork cover={project.cover} subject={project.subject} eager={eager} />
        </Link>
        <FavoriteButton project={project} />
      </div>
      <Link
        className="project-card-body"
        to={`/projects/${project.slug}`}
        onClick={() => onOpen?.(project.id)}
      >
        <span className="subject-label">{project.subject}</span>
        <h3>{project.title}</h3>
        <strong className="project-price">{project.price.formatted}</strong>
      </Link>
    </article>
  );
}
