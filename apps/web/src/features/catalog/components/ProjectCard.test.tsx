import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { ProjectSummary } from '@schoolroom/contracts';
import { catalogKeys } from '../queries.js';
import { ProjectCard } from './ProjectCard.js';

const project: ProjectSummary = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'son-i-pamyat',
  title: 'Как сон влияет на память подростков',
  subject: 'Биология',
  cover: {
    key: 'biology-neural',
    alt: 'Обложка проекта «Как сон влияет на память подростков»',
    url: null,
  },
  price: {
    amountMinor: 99_900,
    currency: 'RUB',
    formatted: '999 ₽',
  },
  featured: true,
};

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
  });
  queryClient.setQueryData(catalogKeys.favorites, { items: [] });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProjectCard project={project} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProjectCard', () => {
  it('shows only the catalog fields allowed by the specification', () => {
    renderCard();

    expect(screen.getByText(project.title)).toBeInTheDocument();
    expect(screen.getByText(project.subject)).toBeInTheDocument();
    expect(screen.getByText('999 ₽')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /добавить .* в избранное/i })).toBeInTheDocument();
    expect(screen.queryByText(/класс/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/страниц/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/рейтинг/i)).not.toBeInTheDocument();
  });
});
