import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { readEnvironment } from '../config/env.js';
import { createDatabase } from './client.js';
import { projects } from './schema.js';

config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

const INCLUDED_MATERIALS = ['Проект', 'Презентация', 'Продукт', 'Речь'];

const seedProjects = [
  {
    title: 'Петровские реформы: цена перемен',
    slug: 'petrovskie-reformy-tsena-peremen',
    subject: 'История',
    description:
      'Проект разбирает ключевые реформы Петра I и показывает, как они изменили государство и повседневную жизнь. В комплекте есть аргументы для защиты и понятная хронология событий.',
    keywords: ['Пётр I', 'реформы', 'Российская империя', 'XVIII век'],
    coverKey: 'history-archive',
    priceMinor: 99_900,
    includedMaterials: INCLUDED_MATERIALS,
    featured: true,
    isPublished: true,
  },
  {
    title: 'Как сон влияет на память подростков',
    slug: 'son-i-pamyat-podrostkov',
    subject: 'Биология',
    description:
      'Исследование объясняет связь сна, внимания и запоминания у подростков. Практическая часть помогает провести небольшой безопасный эксперимент и оформить результаты.',
    keywords: ['сон', 'память', 'подростки', 'нервная система'],
    coverKey: 'biology-neural',
    priceMinor: 99_900,
    includedMaterials: INCLUDED_MATERIALS,
    featured: true,
    isPublished: true,
  },
  {
    title: 'Почему города становятся теплее',
    slug: 'gorodskoy-ostrov-tepla',
    subject: 'География',
    description:
      'Проект посвящён городскому острову тепла и причинам разницы температур между центром и пригородом. В работе есть план наблюдений и способы представить данные на карте.',
    keywords: ['климат', 'город', 'температура', 'экология', 'карта'],
    coverKey: 'geography-city',
    priceMinor: 99_900,
    includedMaterials: INCLUDED_MATERIALS,
    featured: false,
    isPublished: true,
  },
  {
    title: 'Финансовая грамотность школьника',
    slug: 'finansovaya-gramotnost-shkolnika',
    subject: 'Обществознание',
    description:
      'Готовая работа о личном бюджете, банковских продуктах и безопасных финансовых привычках. Практическая часть построена вокруг понятного месячного бюджета школьника.',
    keywords: ['финансы', 'бюджет', 'банк', 'деньги', 'безопасность'],
    coverKey: 'social-finance',
    priceMinor: 99_900,
    includedMaterials: INCLUDED_MATERIALS,
    featured: true,
    isPublished: true,
  },
  {
    title: 'Печорин как герой своего времени',
    slug: 'pechorin-geroy-svoego-vremeni',
    subject: 'Литература',
    description:
      'Проект помогает раскрыть характер Печорина через его поступки и отношения с другими героями. Материалы включают тезисы, цитатный план и структуру убедительной защиты.',
    keywords: ['Лермонтов', 'Печорин', 'Герой нашего времени', 'анализ героя'],
    coverKey: 'literature-portrait',
    priceMinor: 99_900,
    includedMaterials: INCLUDED_MATERIALS,
    featured: false,
    isPublished: true,
  },
  {
    title: 'How Social Media Changes Language',
    slug: 'social-media-changes-language',
    subject: 'Английский язык',
    description:
      'The project explores how social media introduces new words, abbreviations and communication habits. It includes clear examples and a short survey plan for the practical part.',
    keywords: ['English', 'social media', 'language', 'slang', 'communication'],
    coverKey: 'english-dialogue',
    priceMinor: 99_900,
    includedMaterials: INCLUDED_MATERIALS,
    featured: false,
    isPublished: true,
  },
  {
    title: 'Как работают рекомендательные алгоритмы',
    slug: 'rekomendatelnye-algoritmy',
    subject: 'Информатика',
    description:
      'Работа простыми словами объясняет, как сервисы предлагают видео, музыку и товары. Практическая часть показывает базовую модель рекомендаций без сложной математики.',
    keywords: ['алгоритмы', 'рекомендации', 'данные', 'машинное обучение'],
    coverKey: 'informatics-network',
    priceMinor: 99_900,
    includedMaterials: INCLUDED_MATERIALS,
    featured: true,
    isPublished: true,
  },
  {
    title: 'Дизайн удобного школьного расписания',
    slug: 'dizayn-shkolnogo-raspisaniya',
    subject: 'Другое',
    description:
      'Проект исследует, как визуальная структура расписания влияет на скорость поиска информации. В практической части можно сравнить несколько вариантов и создать собственный прототип.',
    keywords: ['дизайн', 'расписание', 'интерфейс', 'школа', 'прототип'],
    coverKey: 'other-layout',
    priceMinor: 99_900,
    includedMaterials: INCLUDED_MATERIALS,
    featured: false,
    isPublished: true,
  },
  {
    title: 'Как менялись города Древней Руси',
    slug: 'goroda-drevney-rusi',
    subject: 'История',
    description:
      'Проект показывает устройство древнерусского города, занятия жителей и роль торговли. Схемы и тезисы помогают наглядно объяснить развитие городов на защите.',
    keywords: ['Древняя Русь', 'города', 'торговля', 'ремесло'],
    coverKey: 'history-city',
    priceMinor: 99_900,
    includedMaterials: INCLUDED_MATERIALS,
    featured: false,
    isPublished: true,
  },
];

const environment = readEnvironment();
if (environment.NODE_ENV === 'production') {
  throw new Error('Development seed data cannot be loaded in production');
}
const database = createDatabase(environment.DATABASE_URL);

try {
  for (const project of seedProjects) {
    await database.db
      .insert(projects)
      .values({
        ...project,
        currency: 'RUB',
        purchaseCount: 0,
      })
      .onConflictDoUpdate({
        target: projects.slug,
        set: {
          ...project,
          currency: 'RUB',
          updatedAt: new Date(),
        },
      });
  }

  console.info(`Seeded ${seedProjects.length} development catalog projects`);
} finally {
  await database.close();
}
