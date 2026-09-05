import {
  Binary,
  BookMarked,
  Building2,
  ChartNoAxesCombined,
  Globe2,
  Languages,
  Microscope,
  PanelsTopLeft,
} from 'lucide-react';
import type { CatalogSubject, ProjectCoverSchema } from '@schoolroom/contracts';
import type { z } from 'zod';
import { useState } from 'react';

type ProjectCover = z.infer<typeof ProjectCoverSchema>;

const icons: Record<CatalogSubject, React.ReactNode> = {
  История: <Building2 aria-hidden="true" />,
  Биология: <Microscope aria-hidden="true" />,
  География: <Globe2 aria-hidden="true" />,
  Обществознание: <ChartNoAxesCombined aria-hidden="true" />,
  Литература: <BookMarked aria-hidden="true" />,
  'Английский язык': <Languages aria-hidden="true" />,
  Информатика: <Binary aria-hidden="true" />,
  Другое: <PanelsTopLeft aria-hidden="true" />,
};

export function CoverArtwork({
  cover,
  subject,
  eager = false,
}: {
  cover: ProjectCover;
  subject: CatalogSubject;
  eager?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`cover-art cover-${cover.key}`} aria-label={cover.alt}>
      {cover.url && !imageFailed ? (
        <img
          alt={cover.alt}
          src={cover.url}
          width={800}
          height={600}
          sizes="(min-width: 960px) 270px, (min-width: 680px) 31vw, 46vw"
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <>
          <span className="cover-grid" aria-hidden="true" />
          <span className="cover-orbit cover-orbit-one" aria-hidden="true" />
          <span className="cover-orbit cover-orbit-two" aria-hidden="true" />
          <span className="cover-icon">{icons[subject]}</span>
        </>
      )}
    </div>
  );
}
